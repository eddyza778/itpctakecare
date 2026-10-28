-- =============================================================
-- 06_roles_and_closing.sql — Role admin + สถานะ "ปิด" (closed_at)
-- รันซ้ำได้ปลอดภัย (IF NOT EXISTS / CREATE OR REPLACE)
--
-- • caretakers.role       : 'admin' | 'caretaker'
-- • caretakers.closed_at  : timestamptz — ไม่ NULL = บัญชีถูกปิด (login ไม่ได้, ไม่ถูกดึงมาแสดง)
-- • students.closed_at    : timestamptz — ไม่ NULL = นักเรียนถูกปิด (ไม่ถูกดึงมาแสดง)
-- =============================================================

-- ----- คอลัมน์ใหม่ -----
ALTER TABLE caretakers ADD COLUMN IF NOT EXISTS role      text NOT NULL DEFAULT 'caretaker';
ALTER TABLE caretakers ADD COLUMN IF NOT EXISTS closed_at timestamptz NULL;
ALTER TABLE students   ADD COLUMN IF NOT EXISTS closed_at timestamptz NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_caretakers_role') THEN
    ALTER TABLE caretakers
      ADD CONSTRAINT chk_caretakers_role CHECK (role IN ('admin', 'caretaker'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_closed_at   ON students (closed_at);
CREATE INDEX IF NOT EXISTS idx_caretakers_closed_at ON caretakers (closed_at);

-- ----- ถ้ายังไม่มี admin เลย → ตั้งบัญชีที่สร้างก่อนสุดเป็น admin -----
-- (เปลี่ยนเองได้: UPDATE caretakers SET role = 'admin' WHERE name = '...';)
UPDATE caretakers
   SET role = 'admin'
 WHERE id = (SELECT id FROM caretakers WHERE closed_at IS NULL ORDER BY created_at LIMIT 1)
   AND NOT EXISTS (SELECT 1 FROM caretakers WHERE role = 'admin' AND closed_at IS NULL);

-- =============================================================
-- Helper: ตรวจว่า actor เป็น admin ที่ยังใช้งานอยู่
-- =============================================================
CREATE OR REPLACE FUNCTION assert_admin(p_actor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM caretakers
     WHERE id = p_actor_id AND role = 'admin' AND closed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ (ต้องเป็นผู้ดูแลระบบ)' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- =============================================================
-- รายชื่อผู้ดูแลที่ยังใช้งาน (หน้า login / เลือกผู้ดูแลในเคส)
-- เปลี่ยน return type → ต้อง DROP ก่อน
-- =============================================================
DROP FUNCTION IF EXISTS get_caretakers();
CREATE FUNCTION get_caretakers()
RETURNS TABLE (id uuid, name text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id, name, role FROM caretakers WHERE closed_at IS NULL ORDER BY name;
$$;
GRANT EXECUTE ON FUNCTION get_caretakers() TO anon, authenticated;

-- =============================================================
-- Login: ตรวจ PIN + คืน role (บัญชีที่ปิดแล้ว login ไม่ได้)
-- =============================================================
CREATE OR REPLACE FUNCTION login_caretaker(p_caretaker_id uuid, p_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r caretakers%ROWTYPE;
BEGIN
  SELECT * INTO r FROM caretakers WHERE id = p_caretaker_id AND closed_at IS NULL;

  IF r.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'ไม่พบผู้ดูแล หรือบัญชีถูกปิดแล้ว');
  END IF;

  IF r.pin_hash = extensions.crypt(p_pin, r.pin_hash) THEN
    RETURN json_build_object('success', true, 'caretaker_id', r.id, 'name', r.name, 'role', r.role);
  END IF;

  RETURN json_build_object('success', false, 'message', 'PIN ไม่ถูกต้อง');
END;
$$;
GRANT EXECUTE ON FUNCTION login_caretaker(uuid, text) TO anon, authenticated;

-- =============================================================
-- ดึงข้อมูล session ล่าสุด (ใช้ตรวจ role/สถานะปิด ทุกครั้งที่เปิดแอป)
-- =============================================================
CREATE OR REPLACE FUNCTION get_session_caretaker(p_caretaker_id uuid)
RETURNS TABLE (id uuid, name text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id, name, role FROM caretakers WHERE id = p_caretaker_id AND closed_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION get_session_caretaker(uuid) TO anon, authenticated;

-- =============================================================
-- แก้ไขข้อมูลส่วนตัว (ชื่อ / PIN) — ต้องยืนยัน PIN ปัจจุบัน
-- =============================================================
CREATE OR REPLACE FUNCTION update_own_profile(
  p_caretaker_id uuid,
  p_current_pin  text,
  p_name         text,
  p_new_pin      text   -- NULL = ไม่เปลี่ยน PIN
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT pin_hash INTO v_hash FROM caretakers WHERE id = p_caretaker_id AND closed_at IS NULL;
  IF v_hash IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'ไม่พบบัญชี หรือบัญชีถูกปิดแล้ว');
  END IF;
  IF v_hash <> extensions.crypt(p_current_pin, v_hash) THEN
    RETURN json_build_object('success', false, 'message', 'PIN ปัจจุบันไม่ถูกต้อง');
  END IF;
  IF coalesce(trim(p_name), '') = '' THEN
    RETURN json_build_object('success', false, 'message', 'กรุณากรอกชื่อ');
  END IF;
  IF p_new_pin IS NOT NULL AND p_new_pin !~ '^[0-9]{4,6}$' THEN
    RETURN json_build_object('success', false, 'message', 'PIN ใหม่ต้องเป็นตัวเลข 4–6 หลัก');
  END IF;

  UPDATE caretakers
     SET name     = trim(p_name),
         pin_hash = CASE WHEN p_new_pin IS NULL THEN pin_hash ELSE extensions.crypt(p_new_pin, extensions.gen_salt('bf')) END
   WHERE id = p_caretaker_id;

  RETURN json_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION update_own_profile(uuid, text, text, text) TO anon, authenticated;

-- =============================================================
-- ADMIN: รายชื่อบัญชีทั้งหมด (รวมที่ปิด)
-- =============================================================
CREATE OR REPLACE FUNCTION admin_list_caretakers(p_actor_id uuid)
RETURNS TABLE (id uuid, name text, role text, closed_at timestamptz, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM assert_admin(p_actor_id);
  RETURN QUERY
    SELECT c.id, c.name, c.role, c.closed_at, c.created_at
      FROM caretakers c
     ORDER BY (c.closed_at IS NOT NULL), c.name;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_list_caretakers(uuid) TO anon, authenticated;

-- =============================================================
-- ADMIN: เพิ่มบัญชี
-- =============================================================
CREATE OR REPLACE FUNCTION admin_create_caretaker(
  p_actor_id uuid,
  p_name     text,
  p_pin      text,
  p_role     text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM assert_admin(p_actor_id);
  IF coalesce(trim(p_name), '') = '' THEN
    RAISE EXCEPTION 'กรุณากรอกชื่อ';
  END IF;
  IF p_pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN ต้องเป็นตัวเลข 4–6 หลัก';
  END IF;

  INSERT INTO caretakers (name, pin_hash, role)
  VALUES (trim(p_name), extensions.crypt(p_pin, extensions.gen_salt('bf')), p_role)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_create_caretaker(uuid, text, text, text) TO anon, authenticated;

-- =============================================================
-- ADMIN: แก้ไขบัญชี (ชื่อ / role / รีเซ็ต PIN)
-- =============================================================
CREATE OR REPLACE FUNCTION admin_update_caretaker(
  p_actor_id uuid,
  p_id       uuid,
  p_name     text,
  p_role     text,
  p_new_pin  text   -- NULL = ไม่เปลี่ยน PIN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM assert_admin(p_actor_id);
  IF coalesce(trim(p_name), '') = '' THEN
    RAISE EXCEPTION 'กรุณากรอกชื่อ';
  END IF;
  IF p_new_pin IS NOT NULL AND p_new_pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN ต้องเป็นตัวเลข 4–6 หลัก';
  END IF;
  IF p_id = p_actor_id AND p_role <> 'admin' THEN
    RAISE EXCEPTION 'ไม่สามารถลดสิทธิ์ admin ของตัวเองได้';
  END IF;

  UPDATE caretakers
     SET name     = trim(p_name),
         role     = p_role,
         pin_hash = CASE WHEN p_new_pin IS NULL THEN pin_hash ELSE extensions.crypt(p_new_pin, extensions.gen_salt('bf')) END
   WHERE id = p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_update_caretaker(uuid, uuid, text, text, text) TO anon, authenticated;

-- =============================================================
-- ADMIN: ปิด / เปิดบัญชี
-- =============================================================
CREATE OR REPLACE FUNCTION admin_set_caretaker_closed(
  p_actor_id uuid,
  p_id       uuid,
  p_closed   boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM assert_admin(p_actor_id);
  IF p_id = p_actor_id AND p_closed THEN
    RAISE EXCEPTION 'ไม่สามารถปิดบัญชีของตัวเองได้';
  END IF;

  UPDATE caretakers
     SET closed_at = CASE WHEN p_closed THEN now() ELSE NULL END
   WHERE id = p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION admin_set_caretaker_closed(uuid, uuid, boolean) TO anon, authenticated;

-- assert_admin ใช้ภายในเท่านั้น แต่ให้ anon เรียกได้เพื่อใช้ตรวจสิทธิ์จาก server action
GRANT EXECUTE ON FUNCTION assert_admin(uuid) TO anon, authenticated;
