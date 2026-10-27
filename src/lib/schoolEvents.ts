export type SchoolEventCategory = 'holiday' | 'academic' | 'meeting' | 'special';

export interface SchoolEvent {
  id: string;
  title: string;
  category: SchoolEventCategory;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "08:30" หรือ "09:00 - 11:30"
  location?: string;
  details?: string;
  is_demo?: boolean;
}

export const EVENT_CATEGORY_CONFIG: Record<
  SchoolEventCategory,
  {
    label: string;
    className: string;
    bg: string;
    text: string;
    border: string;
    dotColor: string;
  }
> = {
  holiday: {
    label: 'วันหยุดโรงเรียน',
    className: 'badge-holiday',
    bg: '#fde8e8',
    text: '#c53030',
    border: '#f8b4b4',
    dotColor: '#e53e3e',
  },
  academic: {
    label: 'กิจกรรมการเรียนรู้',
    className: 'badge-academic',
    bg: '#f3eafa',
    text: '#7b5391',
    border: '#c8b4d8',
    dotColor: '#9f77b4',
  },
  meeting: {
    label: 'ประชุมผู้ปกครอง',
    className: 'badge-meeting',
    bg: '#fef7e6',
    text: '#b7791f',
    border: '#fbd38d',
    dotColor: '#d69e2e',
  },
  special: {
    label: 'กิจกรรมพิเศษ',
    className: 'badge-special',
    bg: '#e8f7f0',
    text: '#2c7a57',
    border: '#a7e4cb',
    dotColor: '#38a169',
  },
};

// ข้อมูลตัวอย่างกิจกรรมโรงเรียนสาธิตมหาวิทยาลัยเชียงใหม่ (ระดับอนุบาลและประถมศึกษา)
export const INITIAL_SCHOOL_EVENTS: SchoolEvent[] = [
  {
    id: 'demo-ev-1',
    title: 'วันคล้ายวันสถาปนาโรงเรียนสาธิต มช.',
    category: 'special',
    date: '2026-10-05',
    time: '08:30 - 12:00',
    location: 'หอประชุมใหญ่ อาคาร 50 ปี สาธิต มช.',
    details: 'พิธีทำบุญตักบาตรและนิทรรศการแสดงผลงานนักเรียนระดับอนุบาลและประถม',
    is_demo: true,
  },
  {
    id: 'demo-ev-2',
    title: 'วันนวมินทรมหาราช (วันหยุดราชการ)',
    category: 'holiday',
    date: '2026-10-13',
    time: 'ตลอดวัน',
    location: '-',
    details: 'วันหยุดราชการ โรงเรียนหยุดการเรียนการสอน',
    is_demo: true,
  },
  {
    id: 'demo-ev-3',
    title: 'ประชุมผู้ปกครองภาคเรียนที่ 2/2569 (ระดับอนุบาล)',
    category: 'meeting',
    date: '2026-10-16',
    time: '09:00 - 11:30',
    location: 'ห้องประชุมบัวตอง อาคารเรียนปฐมวัย',
    details: 'ชี้แจงแนวทางการจัดประสบการณ์การเรียนรู้ และแนวทางการดูแลสุขภาวะเด็กปฐมวัย',
    is_demo: true,
  },
  {
    id: 'demo-ev-4',
    title: 'สัปดาห์สะเต็มศึกษาและนวัตกรรมน้อย (STEM Junior)',
    category: 'academic',
    date: '2026-10-21',
    time: '09:00 - 15:00',
    location: 'ห้องปฏิบัติการวิทยาศาสตร์ อาคารประถมศึกษา',
    details: 'กิจกรรมฐานการเรียนรู้วิทยาศาสตร์ คณิตศาสตร์ และเทคโนโลยี สำหรับนักเรียน ป.1–ป.6',
    is_demo: true,
  },
  {
    id: 'demo-ev-5',
    title: 'วันปิยมหาราช (วันหยุดราชการ)',
    category: 'holiday',
    date: '2026-10-23',
    time: 'ตลอดวัน',
    location: '-',
    details: 'วันหยุดราชการ โรงเรียนหยุดการเรียนการสอน',
    is_demo: true,
  },
  {
    id: 'demo-ev-6',
    title: 'การประเมินพัฒนาการและสุขภาวะเด็ก (รอบที่ 1)',
    category: 'academic',
    date: '2026-10-27',
    time: '08:30 - 14:00',
    location: 'ห้องพยาบาลและห้องแนะแนว',
    details: 'ตรวจสุขภาพ วัดสายตา พัฒนาการทางอารมณ์และสังคมร่วมกับทีมแพทย์และครูผู้ดูแล',
    is_demo: true,
  },
  {
    id: 'demo-ev-7',
    title: 'English Fun Day & Creative Costumes',
    category: 'special',
    date: '2026-10-30',
    time: '13:00 - 15:30',
    location: 'ลานอเนกประสงค์ ชั้น 1',
    details: 'กิจกรรมบูรณาการภาษาอังกฤษและการแสดงละครสั้นของนักเรียนทุกระดับชั้น',
    is_demo: true,
  },
];

const STORAGE_KEY = 'satit_cmu_school_events';

export function getStoredSchoolEvents(): SchoolEvent[] {
  if (typeof window === 'undefined') return INITIAL_SCHOOL_EVENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SCHOOL_EVENTS));
      return INITIAL_SCHOOL_EVENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SCHOOL_EVENTS;
  }
}

export function saveStoredSchoolEvents(events: SchoolEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('saveStoredSchoolEvents error:', err);
  }
}
