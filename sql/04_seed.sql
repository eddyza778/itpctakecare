-- =============================================================
-- 04_seed.sql — ข้อมูลตัวอย่าง
-- รันซ้ำได้: ใช้ ON CONFLICT DO NOTHING (ต้องเพิ่ม unique constraint ที่เหมาะสม)
-- หรือลบแล้วใส่ใหม่
-- =============================================================

-- ลบข้อมูลเดิม (ถ้ามี) — ลำดับจาก child → parent
DELETE FROM case_signatures;
DELETE FROM case_updates;
DELETE FROM case_caretakers;
DELETE FROM case_students;
DELETE FROM cases;
DELETE FROM caretakers;
-- ลบนักเรียนตัวอย่างเดิม (ถ้ามี) เพื่อให้รันซ้ำได้ไม่ซ้ำซ้อน
DELETE FROM students WHERE student_id IN ('67001', '67002', '67003', '67004', '67005', '67006', '67007', '67008', '67009', '67010');

-- =============================================================
-- นักเรียนตัวอย่าง 10 คน (ข้ามถ้า student_id ซ้ำ)
-- =============================================================
INSERT INTO students (student_id, first_name_th, last_name_th, nickname_th, grade, room, gender)
VALUES
  ('67001', 'สมชาย',   'ใจดี',     'ชาย',   'ม.1', 1, 'ชาย'),
  ('67002', 'สมหญิง',  'แสงทอง',   'หญิง',  'ม.1', 1, 'หญิง'),
  ('67003', 'ธนกร',    'วงศ์ใหญ่',  'กร',    'ม.1', 2, 'ชาย'),
  ('67004', 'ปริยา',   'สุขใจ',     'ปริ',   'ม.2', 1, 'หญิง'),
  ('67005', 'กิตติ',   'พรมมา',    'กิต',   'ม.2', 1, 'ชาย'),
  ('67006', 'นภัส',    'ลิ้มเจริญ', 'ภัส',   'ม.2', 2, 'หญิง'),
  ('67007', 'พิชญ์',   'ตั้งมั่น',   'พิชญ์', 'ม.3', 1, 'ชาย'),
  ('67008', 'อรุณี',   'รุ่งเรือง',  'อร',   'ม.3', 1, 'หญิง'),
  ('67009', 'ภาคิน',   'ศรีสุวรรณ', 'คิน',   'ม.3', 2, 'ชาย'),
  ('67010', 'ชนิตา',   'บุญมี',    'ตา',    'ม.3', 2, 'หญิง')
ON CONFLICT DO NOTHING;

-- =============================================================
-- ผู้ดูแล 3 คน (PIN: 1234 ทุกคน — สำหรับทดสอบ) — ครูนิดาเป็น admin
-- =============================================================
INSERT INTO caretakers (id, name, pin_hash, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'ครูนิดา',   crypt('1234', gen_salt('bf')), 'admin'),
  ('a0000000-0000-0000-0000-000000000002', 'ครูสมศักดิ์', crypt('1234', gen_salt('bf')), 'caretaker'),
  ('a0000000-0000-0000-0000-000000000003', 'ครูวิภา',   crypt('1234', gen_salt('bf')), 'caretaker');

-- =============================================================
-- เคสตัวอย่าง 5 เคส
-- =============================================================

-- ดึง student ids (ใช้ student_id text field)
DO $$
DECLARE
  s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid;
  s6 uuid; s7 uuid; s8 uuid; s9 uuid; s10 uuid;
  c1 uuid := 'a0000000-0000-0000-0000-000000000001';
  c2 uuid := 'a0000000-0000-0000-0000-000000000002';
  c3 uuid := 'a0000000-0000-0000-0000-000000000003';
  case1 uuid; case2 uuid; case3 uuid; case4 uuid; case5 uuid;
BEGIN
  SELECT id INTO s1 FROM students WHERE student_id = '67001';
  SELECT id INTO s2 FROM students WHERE student_id = '67002';
  SELECT id INTO s3 FROM students WHERE student_id = '67003';
  SELECT id INTO s4 FROM students WHERE student_id = '67004';
  SELECT id INTO s5 FROM students WHERE student_id = '67005';
  SELECT id INTO s6 FROM students WHERE student_id = '67006';
  SELECT id INTO s7 FROM students WHERE student_id = '67007';
  SELECT id INTO s8 FROM students WHERE student_id = '67008';
  SELECT id INTO s9 FROM students WHERE student_id = '67009';
  SELECT id INTO s10 FROM students WHERE student_id = '67010';

  -- เคส 1: นักเรียนไม่มั่นใจในตัวเอง (ครูนิดา ดูแล)
  INSERT INTO cases (case_type, details, scheduled_at, status, created_by)
  VALUES ('low_confidence', 'นักเรียนไม่กล้าตอบคำถามในห้องเรียน ต้องการกิจกรรมสร้างความมั่นใจ', now() + interval '1 day', 'planned', c1)
  RETURNING id INTO case1;

  INSERT INTO case_students VALUES (case1, s1), (case1, s2);
  INSERT INTO case_caretakers VALUES (case1, c1);

  -- เคส 2: นักเรียนรู้สึกเรียนไม่เก่ง (ครูสมศักดิ์ + ครูนิดา ดูแล)
  INSERT INTO cases (case_type, details, scheduled_at, status, created_by)
  VALUES ('feel_not_smart', 'นักเรียนมีคะแนนสอบต่ำลง เกิดความท้อแท้', now() + interval '3 days', 'planned', c2)
  RETURNING id INTO case2;

  INSERT INTO case_students VALUES (case2, s4), (case2, s5), (case2, s6);
  INSERT INTO case_caretakers VALUES (case2, c2), (case2, c1);

  -- เคส 3: อื่นๆ — ปัญหาเพื่อน (ครูวิภา ดูแล)
  INSERT INTO cases (case_type, other_text, details, scheduled_at, status, created_by)
  VALUES ('other', 'ปัญหาความสัมพันธ์กับเพื่อน', 'นักเรียนมีความขัดแย้งกับเพื่อนในห้องเรียน ต้องการไกล่เกลี่ย', now() - interval '2 days', 'done', c3)
  RETURNING id INTO case3;

  INSERT INTO case_students VALUES (case3, s7);
  INSERT INTO case_caretakers VALUES (case3, c3);

  -- เพิ่ม update สำหรับเคส 3
  INSERT INTO case_updates (case_id, caretaker_id, activity_note, result_note, next_step)
  VALUES (case3, c3, 'พูดคุยกับนักเรียนทั้งสองฝ่าย', 'ทั้งสองฝ่ายเข้าใจกันมากขึ้น', 'ติดตามผลอีกครั้งในสัปดาห์หน้า');

  -- เคส 4: ไม่มั่นใจ (ครูนิดา + ครูวิภา)
  INSERT INTO cases (case_type, details, scheduled_at, status, created_by)
  VALUES ('low_confidence', 'นักเรียนถูกกลั่นแกล้งจนไม่มั่นใจในตัวเอง', now() + interval '5 days', 'planned', c1)
  RETURNING id INTO case4;

  INSERT INTO case_students VALUES (case4, s8), (case4, s9);
  INSERT INTO case_caretakers VALUES (case4, c1), (case4, c3);

  -- เคส 5: อื่นๆ — ขาดเรียนบ่อย (ครูสมศักดิ์ ดูแล)
  INSERT INTO cases (case_type, other_text, details, scheduled_at, status, created_by)
  VALUES ('other', 'ขาดเรียนบ่อย', 'นักเรียนขาดเรียนมากกว่า 3 วันต่อสัปดาห์', now() - interval '1 day', 'done', c2)
  RETURNING id INTO case5;

  INSERT INTO case_students VALUES (case5, s3), (case5, s10);
  INSERT INTO case_caretakers VALUES (case5, c2);

  INSERT INTO case_updates (case_id, caretaker_id, activity_note, result_note, next_step)
  VALUES (case5, c2, 'โทรหาผู้ปกครองเพื่อสอบถาม', 'ผู้ปกครองรับทราบ นักเรียนมีปัญหาสุขภาพ', 'ประสานงานกับครูประจำชั้นเรื่องการส่งงาน');
END $$;
