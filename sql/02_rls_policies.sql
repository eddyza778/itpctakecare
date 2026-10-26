-- =============================================================
-- 02_rls_policies.sql — เปิด RLS และสร้าง policy สำหรับ role anon
-- รันซ้ำได้ปลอดภัย (DROP POLICY IF EXISTS ก่อน CREATE)
-- =============================================================

-- ----- students -----
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_students" ON students;
CREATE POLICY "anon_select_students" ON students FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_students" ON students;
CREATE POLICY "anon_insert_students" ON students FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_students" ON students;
CREATE POLICY "anon_update_students" ON students FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_students" ON students;
CREATE POLICY "anon_delete_students" ON students FOR DELETE TO anon USING (true);

-- ----- caretakers -----
ALTER TABLE caretakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_caretakers" ON caretakers;
-- อ่านได้เฉพาะ id กับ name (ไม่ส่ง pin_hash มา client → ทำผ่าน view/rpc แทน)
-- แต่ policy ทำได้แค่ระดับ row → ซ่อน column ต้องใช้ view
CREATE POLICY "anon_select_caretakers" ON caretakers FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_caretakers" ON caretakers;
CREATE POLICY "anon_insert_caretakers" ON caretakers FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_caretakers" ON caretakers;
CREATE POLICY "anon_update_caretakers" ON caretakers FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_caretakers" ON caretakers;
CREATE POLICY "anon_delete_caretakers" ON caretakers FOR DELETE TO anon USING (true);

-- ----- cases -----
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cases" ON cases;
CREATE POLICY "anon_select_cases" ON cases FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_cases" ON cases;
CREATE POLICY "anon_insert_cases" ON cases FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cases" ON cases;
CREATE POLICY "anon_update_cases" ON cases FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cases" ON cases;
CREATE POLICY "anon_delete_cases" ON cases FOR DELETE TO anon USING (true);

-- ----- case_students -----
ALTER TABLE case_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_case_students" ON case_students;
CREATE POLICY "anon_select_case_students" ON case_students FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_case_students" ON case_students;
CREATE POLICY "anon_insert_case_students" ON case_students FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_case_students" ON case_students;
CREATE POLICY "anon_delete_case_students" ON case_students FOR DELETE TO anon USING (true);

-- ----- case_caretakers -----
ALTER TABLE case_caretakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_case_caretakers" ON case_caretakers;
CREATE POLICY "anon_select_case_caretakers" ON case_caretakers FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_case_caretakers" ON case_caretakers;
CREATE POLICY "anon_insert_case_caretakers" ON case_caretakers FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_case_caretakers" ON case_caretakers;
CREATE POLICY "anon_delete_case_caretakers" ON case_caretakers FOR DELETE TO anon USING (true);

-- ----- case_updates -----
ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_case_updates" ON case_updates;
CREATE POLICY "anon_select_case_updates" ON case_updates FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_case_updates" ON case_updates;
CREATE POLICY "anon_insert_case_updates" ON case_updates FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_case_updates" ON case_updates;
CREATE POLICY "anon_update_case_updates" ON case_updates FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_case_updates" ON case_updates;
CREATE POLICY "anon_delete_case_updates" ON case_updates FOR DELETE TO anon USING (true);

-- ----- case_signatures -----
ALTER TABLE case_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_case_signatures" ON case_signatures;
CREATE POLICY "anon_select_case_signatures" ON case_signatures FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_case_signatures" ON case_signatures;
CREATE POLICY "anon_insert_case_signatures" ON case_signatures FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_case_signatures" ON case_signatures;
CREATE POLICY "anon_delete_case_signatures" ON case_signatures FOR DELETE TO anon USING (true);

-- =============================================================
-- ให้สิทธิ์ role anon เข้าถึง schema public และตารางทั้งหมด
-- (เพื่อให้ RLS Policy ทำงานได้โดยไม่ติด permission denied 42501)
-- =============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

