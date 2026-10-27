// ประเภทข้อมูลสำหรับแอป ITPC Techcare

export interface Student {
  id: string;
  student_id: string | null;
  first_name_th: string | null;
  last_name_th: string | null;
  nickname_th: string | null;
  grade: string | null;
  room: number | null;
  gender: string | null;
  academic_year?: string | null; // ปีการศึกษา เช่น "2569"
  created_at: string | null;
  updated_at: string | null;
  closed_at?: string | null; // ไม่ null = ถูกปิด
}

export type CaretakerRole = 'admin' | 'caretaker';

export interface Caretaker {
  id: string;
  name: string;
  role?: CaretakerRole;
}

// ใช้เฉพาะหน้า Admin (รวมบัญชีที่ถูกปิด)
export interface CaretakerAccount {
  id: string;
  name: string;
  role: CaretakerRole;
  closed_at: string | null;
  created_at: string | null;
}

export const ROLE_LABELS: Record<CaretakerRole, string> = {
  admin: 'ผู้ดูแลระบบ',
  caretaker: 'ครูผู้ดูแล',
};

export interface Case {
  id: string;
  case_type: 'low_confidence' | 'feel_not_smart' | 'other';
  other_text: string | null;
  details: string | null;
  scheduled_at: string;
  status: 'planned' | 'done';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CaseWithRelations extends Case {
  students: Student[];
  caretakers: Caretaker[];
  updates: CaseUpdate[];
  signatures: CaseSignature[];
  creator?: Caretaker;
}

export interface CaseUpdate {
  id: string;
  case_id: string;
  caretaker_id: string;
  activity_note: string | null;
  result_note: string | null;
  next_step: string | null;
  created_at: string;
  caretaker?: Caretaker;
}

export interface CaseSignature {
  id: string;
  case_id: string;
  signer_name: string;
  signer_role: string;
  signature_data: string;
  signed_at: string;
}

export interface CalendarEvent {
  id: string;
  case_type: Case['case_type'];
  other_text: string | null;
  scheduled_at: string;
  status: Case['status'];
  student_count: number;
  created_at?: string;
  updated_at?: string;
  actual_updated_at?: string;
}

export const CASE_TYPE_LABELS: Record<Case['case_type'], string> = {
  low_confidence: 'นักเรียนไม่มั่นใจในตัวเอง',
  feel_not_smart: 'นักเรียนรู้สึกว่าตัวเองเรียนไม่เก่ง',
  other: 'อื่นๆ',
};

export const STATUS_LABELS: Record<Case['status'], string> = {
  planned: 'วางแผน',
  done: 'เสร็จสิ้น',
};
