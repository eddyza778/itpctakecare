-- =============================================================
-- 05_crud_examples.sql — ตัวอย่างคำสั่ง CRUD สำหรับทุกตาราง
-- ใช้รันเองใน Supabase SQL Editor
-- =============================================================

-- =============================================================
-- students (นักเรียน)
-- =============================================================

-- เพิ่มนักเรียน
INSERT INTO students (student_id, first_name_th, last_name_th, nickname_th, grade, room, gender)
VALUES ('67099', 'ทดสอบ', 'เพิ่มนักเรียน', 'ทด', 'ม.1', 3, 'ชาย');

-- แก้ไขนักเรียน — เปลี่ยนชื่อเล่นและห้อง
UPDATE students
SET nickname_th = 'ทดใหม่', room = 2
WHERE student_id = '67099';

-- ลบนักเรียน
DELETE FROM students WHERE student_id = '67099';


-- =============================================================
-- caretakers (ผู้ดูแล)
-- =============================================================

-- เพิ่มผู้ดูแลใหม่ (PIN: 5678)
INSERT INTO caretakers (name, pin_hash)
VALUES ('ครูทดสอบ', crypt('5678', gen_salt('bf')));

-- แก้ไขชื่อผู้ดูแล
UPDATE caretakers SET name = 'ครูทดสอบ (แก้ไข)' WHERE name = 'ครูทดสอบ';

-- เปลี่ยน PIN ผู้ดูแล (PIN ใหม่: 9999)
UPDATE caretakers SET pin_hash = crypt('9999', gen_salt('bf')) WHERE name = 'ครูทดสอบ (แก้ไข)';

-- ลบผู้ดูแล
DELETE FROM caretakers WHERE name = 'ครูทดสอบ (แก้ไข)';


-- =============================================================
-- cases (เคส)
-- =============================================================

-- เพิ่มเคสใหม่ (ต้องมี caretaker id ที่มีอยู่)
-- สมมติใช้ id ของครูนิดา
INSERT INTO cases (case_type, details, scheduled_at, created_by)
VALUES (
  'low_confidence',
  'นักเรียนต้องการกิจกรรมเสริมความมั่นใจ',
  '2026-11-01 09:00:00+07',
  'a0000000-0000-0000-0000-000000000001'
);

-- แก้ไขเคส — เปลี่ยนสถานะเป็น done
UPDATE cases SET status = 'done' WHERE id = (
  SELECT id FROM cases ORDER BY created_at DESC LIMIT 1
);

-- แก้ไขเคส — เปลี่ยนรายละเอียด
UPDATE cases SET details = 'อัปเดตรายละเอียดเคส' WHERE id = (
  SELECT id FROM cases ORDER BY created_at DESC LIMIT 1
);

-- ลบเคส (cascade ลบ case_students, case_caretakers, case_updates, case_signatures ด้วย)
DELETE FROM cases WHERE id = (
  SELECT id FROM cases ORDER BY created_at DESC LIMIT 1
);


-- =============================================================
-- case_students (นักเรียนในเคส)
-- =============================================================

-- เพิ่มนักเรียนเข้าเคส
-- (ต้องรู้ case_id และ student_id)
-- INSERT INTO case_students (case_id, student_id)
-- VALUES ('<case-uuid>', '<student-uuid>');

-- ลบนักเรียนออกจากเคส
-- DELETE FROM case_students WHERE case_id = '<case-uuid>' AND student_id = '<student-uuid>';


-- =============================================================
-- case_caretakers (ผู้ดูแลในเคส)
-- =============================================================

-- เพิ่มผู้ดูแลเข้าเคส
-- INSERT INTO case_caretakers (case_id, caretaker_id)
-- VALUES ('<case-uuid>', '<caretaker-uuid>');

-- ลบผู้ดูแลออกจากเคส
-- DELETE FROM case_caretakers WHERE case_id = '<case-uuid>' AND caretaker_id = '<caretaker-uuid>';


-- =============================================================
-- case_updates (บันทึกการดำเนินงาน)
-- =============================================================

-- เพิ่มบันทึกการดำเนินงาน
-- INSERT INTO case_updates (case_id, caretaker_id, activity_note, result_note, next_step)
-- VALUES (
--   '<case-uuid>',
--   '<caretaker-uuid>',
--   'พูดคุยกับนักเรียน',
--   'นักเรียนรู้สึกดีขึ้น',
--   'ติดตามผลสัปดาห์หน้า'
-- );

-- แก้ไขบันทึก
-- UPDATE case_updates SET result_note = 'ผลดีขึ้นมาก' WHERE id = '<update-uuid>';

-- ลบบันทึก
-- DELETE FROM case_updates WHERE id = '<update-uuid>';


-- =============================================================
-- case_signatures (ลายเซ็น)
-- =============================================================

-- เพิ่มลายเซ็น
-- INSERT INTO case_signatures (case_id, signer_name, signer_role, signature_data)
-- VALUES (
--   '<case-uuid>',
--   'สมชาย ใจดี',
--   'นักเรียน',
--   'data:image/png;base64,...'  -- base64 ของรูปลายเซ็น
-- );

-- ลบลายเซ็น
-- DELETE FROM case_signatures WHERE id = '<signature-uuid>';
