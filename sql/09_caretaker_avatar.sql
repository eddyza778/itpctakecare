-- =============================================================
-- 09_caretaker_avatar.sql — เพิ่มคอลัมน์ avatar_url สำหรับรูปโปรไฟล์ของผู้ดูแล
-- รันซ้ำได้ปลอดภัย (IF NOT EXISTS / CREATE OR REPLACE)
-- =============================================================

-- 1. เพิ่มคอลัมน์ avatar_url ในตาราง caretakers
ALTER TABLE caretakers ADD COLUMN IF NOT EXISTS avatar_url text NULL;

-- 2. ปรับปรุงฟังก์ชัน update_own_profile ให้รองรับการอัปเดตรูปโปรไฟล์ (p_avatar_url)
CREATE OR REPLACE FUNCTION update_own_profile(
  p_caretaker_id uuid,
  p_current_pin  text,
  p_name         text,
  p_new_pin      text,                 -- NULL = ไม่เปลี่ยน PIN
  p_avatar_url   text DEFAULT NULL     -- NULL = ไม่เปลี่ยนรูป, '' = ลบรูปโปรไฟล์
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
  IF v_hash <> crypt(p_current_pin, v_hash) THEN
    RETURN json_build_object('success', false, 'message', 'PIN ปัจจุบันไม่ถูกต้อง');
  END IF;
  IF coalesce(trim(p_name), '') = '' THEN
    RETURN json_build_object('success', false, 'message', 'กรุณากรอกชื่อ');
  END IF;
  IF p_new_pin IS NOT NULL AND p_new_pin !~ '^[0-9]{4,6}$' THEN
    RETURN json_build_object('success', false, 'message', 'PIN ใหม่ต้องเป็นตัวเลข 4–6 หลัก');
  END IF;

  UPDATE caretakers
     SET name       = trim(p_name),
         pin_hash   = CASE WHEN p_new_pin IS NULL THEN pin_hash ELSE crypt(p_new_pin, gen_salt('bf')) END,
         avatar_url = CASE 
                        WHEN p_avatar_url IS NULL THEN avatar_url 
                        WHEN p_avatar_url = '' THEN NULL 
                        ELSE p_avatar_url 
                      END
   WHERE id = p_caretaker_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION update_own_profile(uuid, text, text, text, text) TO anon, authenticated;
