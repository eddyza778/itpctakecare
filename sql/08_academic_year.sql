-- =============================================================
-- 08_academic_year.sql — เพิ่มปีการศึกษา (academic_year) สำหรับนักเรียน
-- รองรับการเพิ่มนักเรียนใหม่ทุกๆ ปีการศึกษา โดยยังเก็บข้อมูลปีเก่าไว้
-- รันซ้ำได้ปลอดภัย (IF NOT EXISTS)
-- =============================================================

-- 1. เพิ่มคอลัมน์ academic_year ในตาราง students
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year text NOT NULL DEFAULT '2569';

-- 2. กำหนดค่าเริ่มต้นสำหรับแถวเดิมที่อาจยังเป็น NULL
UPDATE students SET academic_year = '2569' WHERE academic_year IS NULL;

-- 3. สร้าง Index เพื่อให้การค้นหาและกรองตามปีการศึกษารวดเร็ว
CREATE INDEX IF NOT EXISTS idx_students_academic_year ON students (academic_year);
CREATE INDEX IF NOT EXISTS idx_students_year_grade_room ON students (academic_year, grade, room);
