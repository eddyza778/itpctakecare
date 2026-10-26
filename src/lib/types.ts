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
  created_at: string | null;
  updated_at: string | null;
}

export interface Caretaker {
  id: string;
  name: string;
}

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
