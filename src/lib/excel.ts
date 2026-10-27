import * as XLSX from 'xlsx';
import type { Student, CaseWithRelations, CalendarEvent } from '@/lib/types';
import { CASE_TYPE_LABELS } from '@/lib/types';
import { safeFormatDate } from '@/lib/date';

/**
 * ส่งออกรายงานประวัติการดูแลนักเรียนรายคน (Excel)
 * จัดเรียงคอลัมน์ชัดเจน กำหนดความกว้างคอลัมน์ให้อ่านง่าย พร้อมแท็บประวัติการบันทึกละเอียด
 */
export function exportStudentCasesToExcel(student: Student, cases: CaseWithRelations[]) {
  const workbook = XLSX.utils.book_new();

  const studentFullName = `${student.first_name_th || ''} ${student.last_name_th || ''}`.trim() || 'ไม่ระบุชื่อ';

  // 1. แผ่นงานที่ 1: สรุปเคสการดูแลทั้งหมด
  const caseRows = cases.map((c, index) => {
    const typeLabel =
      c.case_type === 'other' ? c.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[c.case_type];
    const caretakerNames = c.caretakers.map((ct) => ct.name).join(', ') || '-';
    const latestUpdate = c.updates && c.updates.length > 0 ? c.updates[c.updates.length - 1] : null;
    const signaturesText =
      c.signatures && c.signatures.length > 0
        ? c.signatures.map((s) => `${s.signer_name} (${s.signer_role})`).join(', ')
        : 'ยังไม่มี';

    const lastUpdated = latestUpdate?.created_at || c.updated_at || c.created_at;

    return {
      'ลำดับ': index + 1,
      'วัน-เวลานัดหมาย': safeFormatDate(c.scheduled_at, 'd MMMM yyyy HH:mm น.'),
      'เวลาอัปเดตล่าสุด': safeFormatDate(lastUpdated, 'd MMMM yyyy HH:mm น.'),
      'ประเภทเคส': typeLabel,
      'สถานะ': c.status === 'done' ? 'เสร็จสิ้น' : 'วางแผน',
      'ผู้ดูแลที่รับผิดชอบ': caretakerNames,
      'ผู้บันทึกเคส': c.creator?.name || '-',
      'รายละเอียดปัญหา': c.details || '-',
      'สิ่งที่ทำ (ล่าสุด)': latestUpdate?.activity_note || '-',
      'ผลที่ได้ (ล่าสุด)': latestUpdate?.result_note || '-',
      'ขั้นตอนต่อไป (ล่าสุด)': latestUpdate?.next_step || '-',
      'จำนวนครั้งที่อัปเดต': c.updates?.length || 0,
      'ผู้ลงนาม': signaturesText,
    };
  });

  const caseWorksheet = XLSX.utils.json_to_sheet(
    caseRows.length > 0 ? caseRows : [{ 'สถานะ': 'ไม่มีประวัติเคสการดูแล' }]
  );

  // กำหนดความกว้างของคอลัมน์ (Column Widths)
  caseWorksheet['!cols'] = [
    { wch: 6 },  // ลำดับ
    { wch: 24 }, // วัน-เวลานัดหมาย
    { wch: 24 }, // เวลาอัปเดตล่าสุด
    { wch: 28 }, // ประเภทเคส
    { wch: 12 }, // สถานะ
    { wch: 26 }, // ผู้ดูแลที่รับผิดชอบ
    { wch: 18 }, // ผู้บันทึกเคส
    { wch: 36 }, // รายละเอียดปัญหา
    { wch: 32 }, // สิ่งที่ทำ (ล่าสุด)
    { wch: 32 }, // ผลที่ได้ (ล่าสุด)
    { wch: 26 }, // ขั้นตอนต่อไป (ล่าสุด)
    { wch: 18 }, // จำนวนครั้งที่อัปเดต
    { wch: 28 }, // ผู้ลงนาม
  ];

  XLSX.utils.book_append_sheet(workbook, caseWorksheet, 'สรุปเคสการดูแล');

  // 2. แผ่นงานที่ 2: บันทึกการดำเนินงานละเอียดทุกครั้ง (Update Logs)
  const detailedUpdateRows: Record<string, string | number>[] = [];
  cases.forEach((c) => {
    const typeLabel =
      c.case_type === 'other' ? c.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[c.case_type];

    (c.updates || []).forEach((u, uIdx) => {
      detailedUpdateRows.push({
        'ลำดับ': detailedUpdateRows.length + 1,
        'วันที่เคสนัด': safeFormatDate(c.scheduled_at, 'd MMM yyyy'),
        'ประเภทเคส': typeLabel,
        'ครั้งที่อัปเดต': uIdx + 1,
        'วัน-เวลาที่บันทึก': safeFormatDate(u.created_at, 'd MMMM yyyy HH:mm น.'),
        'ผู้บันทึก': u.caretaker?.name || '-',
        'กิจกรรม / สิ่งที่ทำ': u.activity_note || '-',
        'ผลการดำเนินงาน': u.result_note || '-',
        'ขั้นตอนต่อไป': u.next_step || '-',
      });
    });
  });

  if (detailedUpdateRows.length > 0) {
    const updateWorksheet = XLSX.utils.json_to_sheet(detailedUpdateRows);
    updateWorksheet['!cols'] = [
      { wch: 6 },  // ลำดับ
      { wch: 16 }, // วันที่เคสนัด
      { wch: 26 }, // ประเภทเคส
      { wch: 14 }, // ครั้งที่อัปเดต
      { wch: 24 }, // วัน-เวลาที่บันทึก
      { wch: 18 }, // ผู้บันทึก
      { wch: 36 }, // กิจกรรม
      { wch: 36 }, // ผลลัพธ์
      { wch: 30 }, // ขั้นตอนต่อไป
    ];
    XLSX.utils.book_append_sheet(workbook, updateWorksheet, 'บันทึกการดำเนินงานละเอียด');
  }

  // 3. แผ่นงานที่ 3: ข้อมูลนักเรียน
  const profileRows = [
    { 'หัวข้อ': 'ชื่อ-นามสกุล', 'รายละเอียด': studentFullName },
    { 'หัวข้อ': 'รหัสนักเรียน', 'รายละเอียด': student.student_id || '-' },
    { 'หัวข้อ': 'ปีการศึกษา', 'รายละเอียด': student.academic_year || '-' },
    { 'หัวข้อ': 'ชื่อเล่น', 'รายละเอียด': student.nickname_th || '-' },
    { 'หัวข้อ': 'เพศ', 'รายละเอียด': student.gender || '-' },
    { 'หัวข้อ': 'ระดับชั้น / ห้อง', 'รายละเอียด': student.grade ? `${student.grade}/${student.room || 1}` : '-' },
    { 'หัวข้อ': 'จำนวนเคสทั้งหมด', 'รายละเอียด': `${cases.length} เคส` },
    { 'หัวข้อ': 'วันที่ส่งออกข้อมูล', 'รายละเอียด': safeFormatDate(new Date().toISOString(), 'd MMMM yyyy เวลา HH:mm น.') },
  ];
  const profileWorksheet = XLSX.utils.json_to_sheet(profileRows);
  profileWorksheet['!cols'] = [
    { wch: 20 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, profileWorksheet, 'ข้อมูลนักเรียน');

  const fileYear = student.academic_year ? `_${student.academic_year}` : '';
  const safeName = studentFullName.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(workbook, `itpctakecare_เคสนักเรียน_${safeName}${fileYear}.xlsx`);
}

/**
 * ส่งออกรายการนักเรียนทั้งหมด (Excel)
 */
export function exportStudentsListToExcel(
  students: (Student & { case_count: number })[],
  yearLabel?: string
) {
  const rows = students.map((s, index) => ({
    'ลำดับ': index + 1,
    'ปีการศึกษา': s.academic_year || '-',
    'รหัสนักเรียน': s.student_id || '-',
    'ชื่อจริง': s.first_name_th || '',
    'นามสกุล': s.last_name_th || '',
    'ชื่อเล่น': s.nickname_th || '-',
    'เพศ': s.gender || '-',
    'ระดับชั้น': s.grade || '-',
    'ห้อง': s.room ? `ห้อง ${s.room}` : '-',
    'จำนวนเคสการดูแล (เคส)': s.case_count || 0,
  }));

  const worksheet = XLSX.utils.json_to_sheet(
    rows.length > 0 ? rows : [{ 'หมายเหตุ': 'ไม่มีข้อมูลนักเรียน' }]
  );

  worksheet['!cols'] = [
    { wch: 6 },  // ลำดับ
    { wch: 12 }, // ปีการศึกษา
    { wch: 14 }, // รหัส
    { wch: 18 }, // ชื่อจริง
    { wch: 18 }, // นามสกุล
    { wch: 10 }, // ชื่อเล่น
    { wch: 8 },  // เพศ
    { wch: 10 }, // ระดับชั้น
    { wch: 10 }, // ห้อง
    { wch: 22 }, // จำนวนเคส
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'รายชื่อนักเรียน');

  const yearSuffix = yearLabel ? `_${yearLabel}` : '';
  XLSX.writeFile(workbook, `itpctakecare_รายชื่อนักเรียน${yearSuffix}.xlsx`);
}

/**
 * ส่งออกเคสรายเดือน (Excel)
 */
export function exportMonthlyCasesToExcel(events: CalendarEvent[], monthLabel: string) {
  const rows = events.map((e, index) => {
    const typeLabel =
      e.case_type === 'other' ? e.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[e.case_type];

    const lastUpdated = e.actual_updated_at || e.updated_at || e.created_at;

    return {
      'ลำดับ': index + 1,
      'วัน-เวลานัดหมาย': safeFormatDate(e.scheduled_at, 'd MMMM yyyy HH:mm น.'),
      'เวลาอัปเดตล่าสุด': safeFormatDate(lastUpdated, 'd MMMM yyyy HH:mm น.'),
      'ประเภทเคส': typeLabel,
      'สถานะ': e.status === 'done' ? 'เสร็จสิ้น' : 'วางแผน',
      'จำนวนนักเรียนในเคส (คน)': e.student_count,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(
    rows.length > 0 ? rows : [{ 'หมายเหตุ': 'ไม่มีเคสในเดือนนี้' }]
  );

  worksheet['!cols'] = [
    { wch: 6 },  // ลำดับ
    { wch: 24 }, // วัน-เวลานัดหมาย
    { wch: 24 }, // เวลาอัปเดตล่าสุด
    { wch: 30 }, // ประเภทเคส
    { wch: 14 }, // สถานะ
    { wch: 22 }, // จำนวนนักเรียน
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'เคสประจำเดือน');

  XLSX.writeFile(workbook, `itpctakecare_เคสประจำเดือน_${monthLabel.replace(/\s+/g, '_')}.xlsx`);
}
