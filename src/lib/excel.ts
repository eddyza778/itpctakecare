import * as XLSX from 'xlsx';
import type { Student, CaseWithRelations, CalendarEvent } from '@/lib/types';
import { CASE_TYPE_LABELS } from '@/lib/types';
import { safeFormatDate } from '@/lib/date';

export function exportStudentCasesToExcel(student: Student, cases: CaseWithRelations[]) {
  const rows = cases.map((c, index) => {
    const typeLabel =
      c.case_type === 'other' ? c.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[c.case_type];
    const caretakerNames = c.caretakers.map((ct) => ct.name).join(', ');
    const latestUpdate = c.updates && c.updates.length > 0 ? c.updates[c.updates.length - 1] : null;

    return {
      'ลำดับ': index + 1,
      'รหัสนักเรียน': student.student_id || '-',
      'ชื่อ-นามสกุล': `${student.first_name_th || ''} ${student.last_name_th || ''}`.trim(),
      'ชื่อเล่น': student.nickname_th || '-',
      'ชั้น/ห้อง': `${student.grade || ''}/${student.room || ''}`,
      'วัน-เวลานัด': safeFormatDate(c.scheduled_at, 'd MMMM yyyy HH:mm น.'),
      'ประเภทเคส': typeLabel,
      'สถานะ': c.status === 'done' ? 'เสร็จสิ้น' : 'วางแผน',
      'ผู้ดูแล': caretakerNames || '-',
      'รายละเอียด': c.details || '-',
      'สิ่งที่ทำ (ล่าสุด)': latestUpdate?.activity_note || '-',
      'ผลที่ได้ (ล่าสุด)': latestUpdate?.result_note || '-',
      'ขั้นตอนต่อไป (ล่าสุด)': latestUpdate?.next_step || '-',
      'จำนวนลายเซ็น': c.signatures.length,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'หมายเหตุ': 'ไม่มีประวัติเคส' }]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ประวัติเคส');

  const studentName = `${student.first_name_th || ''}_${student.last_name_th || ''}`.trim() || student.id.slice(0, 8);
  XLSX.writeFile(workbook, `ITPC_เคสนักเรียน_${studentName}.xlsx`);
}

export function exportMonthlyCasesToExcel(events: CalendarEvent[], monthLabel: string) {
  const rows = events.map((e, index) => {
    const typeLabel =
      e.case_type === 'other' ? e.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[e.case_type];

    return {
      'ลำดับ': index + 1,
      'วัน-เวลา': safeFormatDate(e.scheduled_at, 'd MMMM yyyy HH:mm น.'),
      'ประเภทเคส': typeLabel,
      'จำนวนนักเรียน (คน)': e.student_count,
      'สถานะ': e.status === 'done' ? 'เสร็จสิ้น' : 'วางแผน',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ 'หมายเหตุ': 'ไม่มีเคสในเดือนนี้' }]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'เคสรายเดือน');

  XLSX.writeFile(workbook, `ITPC_เคสประจำเดือน_${monthLabel.replace(/\s+/g, '_')}.xlsx`);
}
