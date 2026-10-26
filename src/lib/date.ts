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
  if (!dateStr) return new Date();
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}
