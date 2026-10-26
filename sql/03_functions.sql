-- =============================================================
-- 03_functions.sql — ฟังก์ชัน RPC สำหรับ login และสร้างเคส
-- รันซ้ำได้ปลอดภัย (CREATE OR REPLACE)
-- =============================================================

-- =============================================================
-- ฟังก์ชัน login: ตรวจสอบ PIN โดยไม่ส่ง hash กลับ client
-- คืน JSON { success, caretaker_id, name } หรือ { success: false }
-- =============================================================
CREATE OR REPLACE FUNCTION verify_pin(p_caretaker_id uuid, p_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER          -- รันด้วยสิทธิ์เจ้าของฟังก์ชัน
SET search_path = public
AS $$
DECLARE
  v_name     text;
  v_pin_hash text;
BEGIN
  SELECT name, pin_hash INTO v_name, v_pin_hash
    FROM caretakers
   WHERE id = p_caretaker_id;

  IF v_pin_hash IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'ไม่พบผู้ดูแล');
  END IF;

  IF v_pin_hash = crypt(p_pin, v_pin_hash) THEN
    RETURN json_build_object('success', true, 'caretaker_id', p_caretaker_id, 'name', v_name);
  ELSE
    RETURN json_build_object('success', false, 'message', 'PIN ไม่ถูกต้อง');
  END IF;
END;
$$;

-- ให้ anon เรียกใช้ฟังก์ชันนี้ได้
GRANT EXECUTE ON FUNCTION verify_pin(uuid, text) TO anon;

-- =============================================================
-- ฟังก์ชันดึงรายชื่อผู้ดูแล (ไม่ส่ง pin_hash)
-- =============================================================
CREATE OR REPLACE FUNCTION get_caretakers()
RETURNS TABLE (id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name FROM caretakers ORDER BY name;
$$;

GRANT EXECUTE ON FUNCTION get_caretakers() TO anon;

-- =============================================================
-- ฟังก์ชันสร้างเคสพร้อมนักเรียนและผู้ดูแลในครั้งเดียว (transaction)
-- คืน case id ที่สร้างขึ้น
-- =============================================================
CREATE OR REPLACE FUNCTION create_case_with_relations(
  p_case_type    text,
  p_other_text   text,
  p_details      text,
  p_scheduled_at timestamptz,
  p_created_by   uuid,
  p_student_ids  uuid[],
  p_caretaker_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case_id uuid;
  v_sid     uuid;
  v_cid     uuid;
BEGIN
  -- สร้างเคส
  INSERT INTO cases (case_type, other_text, details, scheduled_at, created_by)
  VALUES (p_case_type, p_other_text, p_details, p_scheduled_at, p_created_by)
  RETURNING id INTO v_case_id;

  -- เพิ่มนักเรียน
  FOREACH v_sid IN ARRAY p_student_ids LOOP
    INSERT INTO case_students (case_id, student_id) VALUES (v_case_id, v_sid);
  END LOOP;

  -- เพิ่มผู้ดูแล (รวมผู้สร้างเสมอ)
  -- เพิ่มผู้สร้างก่อน
  INSERT INTO case_caretakers (case_id, caretaker_id)
  VALUES (v_case_id, p_created_by)
  ON CONFLICT DO NOTHING;

  -- เพิ่มผู้ดูแลที่เลือก
  FOREACH v_cid IN ARRAY p_caretaker_ids LOOP
    INSERT INTO case_caretakers (case_id, caretaker_id)
    VALUES (v_case_id, v_cid)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN v_case_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_case_with_relations(text, text, text, timestamptz, uuid, uuid[], uuid[]) TO anon;
