-- =============================================================
-- 10_fix_pgcrypto.sql — แก้ไขปัญหา function gen_salt / crypt does not exist
-- รันใน Supabase SQL Editor เพื่ออัปเดตฟังก์ชันให้เรียกใช้ pgcrypto จาก extensions schema อย่างถูกต้อง
-- =============================================================

-- 1. มั่นใจว่าเปิด extension pgcrypto ไว้ใน schema extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. อัปเดตฟังก์ชัน admin_create_caretaker (เพิ่มบัญชีผู้ดูแล)
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

-- 3. อัปเดตฟังก์ชัน admin_update_caretaker (แก้ไขบัญชี / รีเซ็ต PIN)
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

-- 4. อัปเดตฟังก์ชัน login_caretaker (เข้าสู่ระบบด้วย PIN)
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

