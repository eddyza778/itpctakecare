import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export function safeFormatDate(
  dateStr: string | null | undefined,
  formatPattern: string = 'd MMMM yyyy เวลา HH:mm น.'
): string {
  if (!dateStr) return '-';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return format(d, formatPattern, { locale: th });
  } catch {
    return '-';
  }
}

export function safeParseDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date(NaN);
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(NaN) : d;
  } catch {
    return new Date(NaN);
  }
}

// คืนปีการศึกษาปัจจุบันตาม พ.ศ. (เริ่มพฤษภาคม = ภาคเรียนที่ 1)
export function getDefaultAcademicYear(): string {
  const now = new Date();
  const yearBE = now.getFullYear() + 543;
  const academicYear = now.getMonth() >= 4 ? yearBE : yearBE - 1;
  return String(academicYear);
}
