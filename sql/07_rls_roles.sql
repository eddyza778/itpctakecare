-- =============================================================
-- 07_rls_roles.sql — RLS: ผู้มีสิทธิ์ดึงข้อมูลต้องเป็น Role admin หรือ ผู้ดูแล เท่านั้น
-- รันซ้ำได้ปลอดภัย (CREATE OR REPLACE / DROP POLICY IF EXISTS)
-- =============================================================

-- 1. ฟังก์ชันตรวจจับ ID ผู้ใช้งานปัจจุบัน
-- รองรับทั้ง Header 'x-caretaker-id' จาก Client/Server Action, auth.uid() และ session variable
CREATE OR REPLACE FUNCTION get_current_actor_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_headers json;
  v_id text;
  v_auth_uid uuid;
BEGIN
  -- ตรวจสอบ Supabase Auth (auth.uid()) หากมีการต่อยอดใช้ JWT
  BEGIN
    v_auth_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_auth_uid := NULL;
  END;
  IF v_auth_uid IS NOT NULL THEN
    RETURN v_auth_uid;
  END IF;

  -- ตรวจสอบ Header 'x-caretaker-id' ที่แอปส่งมา
  BEGIN
    v_headers := current_setting('request.headers', true)::json;
    v_id := v_headers->>'x-caretaker-id';
    IF v_id IS NOT NULL AND v_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN v_id::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- ตรวจสอบ session variable 'app.current_caretaker_id'
  BEGIN
    v_id := current_setting('app.current_caretaker_id', true);
    IF v_id IS NOT NULL AND v_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN v_id::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$;

-- 2. ฟังก์ชันตรวจสอบ Role ของผู้ใช้งานปัจจุบัน
CREATE OR REPLACE FUNCTION get_current_actor_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT role
    FROM caretakers
   WHERE id = get_current_actor_id()
     AND closed_at IS NULL;
$$;

-- 3. ฟังก์ชันตรวจสอบว่าเป็น ผู้ดูแล (caretaker) หรือ ผู้ดูแลระบบ (admin) และยังเปิดใช้งานอยู่
CREATE OR REPLACE FUNCTION is_caretaker_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT coalesce(get_current_actor_role() IN ('admin', 'caretaker'), false);
$$;

-- 4. ฟังก์ชันตรวจสอบว่าเป็น ผู้ดูแลระบบ (admin) และยังเปิดใช้งานอยู่
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT coalesce(get_current_actor_role() = 'admin', false);
$$;

GRANT EXECUTE ON FUNCTION get_current_actor_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_actor_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_caretaker_or_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;

-- =============================================================
-- นโยบาย RLS (Row Level Security) สำหรับแต่ละตาราง
-- =============================================================

-- ----- ตาราง students -----
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_students" ON students;
DROP POLICY IF EXISTS "allow_select_students" ON students;
CREATE POLICY "allow_select_students" ON students
  FOR SELECT TO anon, authenticated
  USING (
    is_admin() OR (is_caretaker_or_admin() AND closed_at IS NULL)
  );

DROP POLICY IF EXISTS "anon_insert_students" ON students;
DROP POLICY IF EXISTS "allow_insert_students" ON students;
CREATE POLICY "allow_insert_students" ON students
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "anon_update_students" ON students;
DROP POLICY IF EXISTS "allow_update_students" ON students;
CREATE POLICY "allow_update_students" ON students
  FOR UPDATE TO anon, authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "anon_delete_students" ON students;
DROP POLICY IF EXISTS "allow_delete_students" ON students;
CREATE POLICY "allow_delete_students" ON students
  FOR DELETE TO anon, authenticated
  USING (false);

-- ----- ตาราง caretakers -----
ALTER TABLE caretakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_caretakers" ON caretakers;
DROP POLICY IF EXISTS "allow_select_caretakers" ON caretakers;
CREATE POLICY "allow_select_caretakers" ON caretakers
  FOR SELECT TO anon, authenticated
  USING (is_caretaker_or_admin());

DROP POLICY IF EXISTS "anon_insert_caretakers" ON caretakers;
DROP POLICY IF EXISTS "allow_insert_caretakers" ON caretakers;
CREATE POLICY "allow_insert_caretakers" ON caretakers
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "anon_update_caretakers" ON caretakers;
DROP POLICY IF EXISTS "allow_update_caretakers" ON caretakers;
CREATE POLICY "allow_update_caretakers" ON caretakers
  FOR UPDATE TO anon, authenticated
  USING (is_admin() OR id = get_current_actor_id())
  WITH CHECK (is_admin() OR id = get_current_actor_id());

DROP POLICY IF EXISTS "anon_delete_caretakers" ON caretakers;
DROP POLICY IF EXISTS "allow_delete_caretakers" ON caretakers;
CREATE POLICY "allow_delete_caretakers" ON caretakers
  FOR DELETE TO anon, authenticated
  USING (false);

-- =============================================================
-- Helper: ตรวจสอบสิทธิ์การเข้าถึงเคส (SECURITY DEFINER ป้องกัน 42P17 infinite recursion)
-- Admin: เข้าถึงได้ทุกเคส
-- Caretaker: เข้าถึงเฉพาะเคสที่ตนเองสร้าง (created_by) หรือถูกมอบหมาย (case_caretakers)
-- =============================================================
CREATE OR REPLACE FUNCTION can_access_case(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    is_admin()
    OR (
      is_caretaker_or_admin()
      AND EXISTS (
        SELECT 1 FROM cases c
         WHERE c.id = p_case_id
           AND (
             c.created_by = get_current_actor_id()
             OR EXISTS (
               SELECT 1 FROM case_caretakers cc
                WHERE cc.case_id = c.id
                  AND cc.caretaker_id = get_current_actor_id()
             )
           )
      )
    );
$$;
GRANT EXECUTE ON FUNCTION can_access_case(uuid) TO anon, authenticated;

-- ----- ตาราง cases -----
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cases" ON cases;
DROP POLICY IF EXISTS "allow_select_cases" ON cases;
CREATE POLICY "allow_select_cases" ON cases
  FOR SELECT TO anon, authenticated
  USING (can_access_case(id));

DROP POLICY IF EXISTS "anon_insert_cases" ON cases;
DROP POLICY IF EXISTS "allow_insert_cases" ON cases;
CREATE POLICY "allow_insert_cases" ON cases
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_caretaker_or_admin());

DROP POLICY IF EXISTS "anon_update_cases" ON cases;
DROP POLICY IF EXISTS "allow_update_cases" ON cases;
CREATE POLICY "allow_update_cases" ON cases
  FOR UPDATE TO anon, authenticated
  USING (can_access_case(id))
  WITH CHECK (can_access_case(id));

DROP POLICY IF EXISTS "anon_delete_cases" ON cases;
DROP POLICY IF EXISTS "allow_delete_cases" ON cases;
CREATE POLICY "allow_delete_cases" ON cases
  FOR DELETE TO anon, authenticated
  USING (
    is_admin()
    OR (is_caretaker_or_admin() AND created_by = get_current_actor_id())
  );

-- ----- ตาราง case_students -----
ALTER TABLE case_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_case_students" ON case_students;
DROP POLICY IF EXISTS "allow_select_case_students" ON case_students;
CREATE POLICY "allow_select_case_students" ON case_students
  FOR SELECT TO anon, authenticated
  USING (is_caretaker_or_admin());

DROP POLICY IF EXISTS "anon_insert_case_students" ON case_students;
DROP POLICY IF EXISTS "allow_insert_case_students" ON case_students;
CREATE POLICY "allow_insert_case_students" ON case_students
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_caretaker_or_admin());

DROP POLICY IF EXISTS "anon_delete_case_students" ON case_students;
DROP POLICY IF EXISTS "allow_delete_case_students" ON case_students;
CREATE POLICY "allow_delete_case_students" ON case_students
  FOR DELETE TO anon, authenticated
  USING (is_caretaker_or_admin());

-- ----- ตาราง case_caretakers -----
ALTER TABLE case_caretakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_case_caretakers" ON case_caretakers;
DROP POLICY IF EXISTS "allow_select_case_caretakers" ON case_caretakers;
CREATE POLICY "allow_select_case_caretakers" ON case_caretakers
  FOR SELECT TO anon, authenticated
  USING (is_caretaker_or_admin());

DROP POLICY IF EXISTS "anon_insert_case_caretakers" ON case_caretakers;
DROP POLICY IF EXISTS "allow_insert_case_caretakers" ON case_caretakers;
CREATE POLICY "allow_insert_case_caretakers" ON case_caretakers
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_caretaker_or_admin());

DROP POLICY IF EXISTS "anon_delete_case_caretakers" ON case_caretakers;
DROP POLICY IF EXISTS "allow_delete_case_caretakers" ON case_caretakers;
CREATE POLICY "allow_delete_case_caretakers" ON case_caretakers
  FOR DELETE TO anon, authenticated
  USING (is_caretaker_or_admin());

-- ----- ตาราง case_updates -----
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_case_updates" ON case_updates;
DROP POLICY IF EXISTS "allow_select_case_updates" ON case_updates;
CREATE POLICY "allow_select_case_updates" ON case_updates
  FOR SELECT TO anon, authenticated
  USING (can_access_case(case_id));

DROP POLICY IF EXISTS "anon_insert_case_updates" ON case_updates;
DROP POLICY IF EXISTS "allow_insert_case_updates" ON case_updates;
CREATE POLICY "allow_insert_case_updates" ON case_updates
  FOR INSERT TO anon, authenticated
  WITH CHECK (can_access_case(case_id));

DROP POLICY IF EXISTS "anon_update_case_updates" ON case_updates;
DROP POLICY IF EXISTS "allow_update_case_updates" ON case_updates;
CREATE POLICY "allow_update_case_updates" ON case_updates
  FOR UPDATE TO anon, authenticated
  USING (can_access_case(case_id))
  WITH CHECK (can_access_case(case_id));

DROP POLICY IF EXISTS "anon_delete_case_updates" ON case_updates;
DROP POLICY IF EXISTS "allow_delete_case_updates" ON case_updates;
CREATE POLICY "allow_delete_case_updates" ON case_updates
  FOR DELETE TO anon, authenticated
  USING (can_access_case(case_id));

-- ----- ตาราง case_signatures -----
ALTER TABLE case_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_case_signatures" ON case_signatures;
DROP POLICY IF EXISTS "allow_select_case_signatures" ON case_signatures;
CREATE POLICY "allow_select_case_signatures" ON case_signatures
  FOR SELECT TO anon, authenticated
  USING (can_access_case(case_id));

DROP POLICY IF EXISTS "anon_insert_case_signatures" ON case_signatures;
DROP POLICY IF EXISTS "allow_insert_case_signatures" ON case_signatures;
CREATE POLICY "allow_insert_case_signatures" ON case_signatures
  FOR INSERT TO anon, authenticated
  WITH CHECK (can_access_case(case_id));

DROP POLICY IF EXISTS "anon_delete_case_signatures" ON case_signatures;
DROP POLICY IF EXISTS "allow_delete_case_signatures" ON case_signatures;
CREATE POLICY "allow_delete_case_signatures" ON case_signatures
  FOR DELETE TO anon, authenticated
  USING (can_access_case(case_id));
