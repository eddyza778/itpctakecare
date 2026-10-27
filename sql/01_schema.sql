-- =============================================================
-- 01_schema.sql — สร้างตาราง, index, foreign key, trigger
-- รันซ้ำได้ปลอดภัย (IF NOT EXISTS / CREATE OR REPLACE)
-- =============================================================

-- ต้องเปิด extension pgcrypto (สำหรับ hash PIN)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----- ฟังก์ชันอัปเดต updated_at อัตโนมัติ -----
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- ตาราง students (นักเรียน — โครงสร้างตามข้อกำหนด)
-- =============================================================
CREATE TABLE IF NOT EXISTS students (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id    text NULL,
  first_name_th text NULL,
  last_name_th  text NULL,
  nickname_th   text NULL,
  grade         text NULL,
  room          integer NULL,
  gender        text NULL,
  academic_year text NOT NULL DEFAULT '2569', -- ปีการศึกษา เช่น 2568, 2569
  created_at    timestamptz NULL DEFAULT now(),
  updated_at    timestamptz NULL DEFAULT now(),
  closed_at     timestamptz NULL,          -- ไม่ NULL = ปิด (ไม่ดึงมาแสดง)
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_students_academic_year ON students (academic_year);

CREATE INDEX IF NOT EXISTS idx_students_student_id ON students (student_id);
CREATE INDEX IF NOT EXISTS idx_students_grade_room ON students (grade, room);

-- =============================================================
-- ตาราง caretakers (ผู้ดูแล)
-- =============================================================
CREATE TABLE IF NOT EXISTS caretakers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  pin_hash   text NOT NULL,            -- เก็บ hash ด้วย crypt()
  role       text NOT NULL DEFAULT 'caretaker',  -- 'admin' | 'caretaker' (constraint อยู่ใน 06)
  closed_at  timestamptz NULL,         -- ไม่ NULL = บัญชีถูกปิด
  created_at timestamptz DEFAULT now()
);

-- =============================================================
-- ตาราง cases (เคสดูแลนักเรียน)
-- =============================================================
CREATE TABLE IF NOT EXISTS cases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_type    text NOT NULL CHECK (case_type IN ('low_confidence', 'feel_not_smart', 'other')),
  other_text   text,
  details      text,
  scheduled_at timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done')),
  created_by   uuid NOT NULL REFERENCES caretakers(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),

  -- ถ้าเลือก other ต้องกรอก other_text
  CONSTRAINT chk_other_text CHECK (
    case_type <> 'other' OR (case_type = 'other' AND other_text IS NOT NULL AND other_text <> '')
  )
);

-- trigger อัปเดต updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cases_updated_at'
  ) THEN
    CREATE TRIGGER trg_cases_updated_at
      BEFORE UPDATE ON cases
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- =============================================================
-- ตาราง case_students (many-to-many: เคส ↔ นักเรียน)
-- =============================================================
CREATE TABLE IF NOT EXISTS case_students (
  case_id    uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, student_id)
);

-- =============================================================
-- ตาราง case_caretakers (many-to-many: เคส ↔ ผู้ดูแล)
-- =============================================================
CREATE TABLE IF NOT EXISTS case_caretakers (
  case_id      uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  caretaker_id uuid NOT NULL REFERENCES caretakers(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, caretaker_id)
);

-- =============================================================
-- ตาราง case_updates (บันทึกการดำเนินงาน)
-- =============================================================
CREATE TABLE IF NOT EXISTS case_updates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  caretaker_id  uuid NOT NULL REFERENCES caretakers(id) ON DELETE CASCADE,
  activity_note text,       -- สิ่งที่ทำ
  result_note   text,       -- ผลที่ได้
  next_step     text,       -- ขั้นตอนต่อไป
  created_at    timestamptz DEFAULT now()
);

-- =============================================================
-- ตาราง case_signatures (ลายเซ็น)
-- =============================================================
CREATE TABLE IF NOT EXISTS case_signatures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  signer_name     text NOT NULL,
  signer_role     text NOT NULL,   -- เช่น นักเรียน / ผู้ปกครอง / ผู้ดูแล
  signature_data  text NOT NULL,   -- base64 PNG
  signed_at       timestamptz DEFAULT now()
);

-- =============================================================
-- Indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_cases_scheduled_at   ON cases (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cases_status          ON cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_created_by      ON cases (created_by);
CREATE INDEX IF NOT EXISTS idx_case_students_student  ON case_students (student_id);
CREATE INDEX IF NOT EXISTS idx_case_caretakers_carer  ON case_caretakers (caretaker_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_case      ON case_updates (case_id);
CREATE INDEX IF NOT EXISTS idx_case_signatures_case   ON case_signatures (case_id);

-- trigger อัปเดต updated_at สำหรับ students (ถ้ายังไม่มี)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_students_updated_at'
  ) THEN
    CREATE TRIGGER trg_students_updated_at
      BEFORE UPDATE ON students
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
