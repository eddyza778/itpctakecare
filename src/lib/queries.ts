import { supabase } from '@/lib/supabase';
import type {
  Student,
  Caretaker,
  CaseWithRelations,
  CaseUpdate,
  CaseSignature,
  CalendarEvent,
} from '@/lib/types';

// =============================================================
// ผู้ดูแล (Caretakers)
// =============================================================

export async function getCaretakers(): Promise<Caretaker[]> {
  const { data, error } = await supabase.rpc('get_caretakers');
  if (error) throw error;
  return data || [];
}

export async function verifyPin(caretakerId: string, pin: string) {
  let { data, error } = await supabase.rpc('verify_pin', {
    p_id: caretakerId,
    p_pin: pin,
  });

  if (error) {
    const res = await supabase.rpc('verify_pin', {
      p_caretaker_id: caretakerId,
      p_pin: pin,
    });
    data = res.data;
    error = res.error;
  }

  if (error) throw error;

  if (typeof data === 'boolean') {
    return {
      success: data,
      caretaker_id: caretakerId,
      message: data ? undefined : 'PIN ไม่ถูกต้อง',
    };
  }

  return data as { success: boolean; caretaker_id?: string; name?: string; message?: string };
}

// =============================================================
// นักเรียน (Students)
// =============================================================

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('grade')
    .order('room')
    .order('first_name_th');
  if (error) throw error;
  return (data || []) as Student[];
}

export async function getStudentsWithCaseCounts(): Promise<(Student & { case_count: number })[]> {
  const students = await getStudents();
  const { data: allCaseStudents } = await supabase.from('case_students').select('student_id');

  const counts: Record<string, number> = {};
  (allCaseStudents || []).forEach((cs) => {
    counts[cs.student_id] = (counts[cs.student_id] || 0) + 1;
  });

  return students.map((s) => ({
    ...s,
    case_count: counts[s.id] || 0,
  }));
}

export async function getStudentById(id: string) {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Student;
}

export async function createStudent(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('students').insert(student).select().single();
  if (error) throw error;
  return data as Student;
}

export async function updateStudent(id: string, updates: Partial<Student>) {
  const { data, error } = await supabase.from('students').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Student;
}

export async function deleteStudent(id: string) {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

// =============================================================
// เคส (Cases)
// =============================================================

export async function createCase(params: {
  case_type: string;
  other_text: string | null;
  details: string | null;
  scheduled_at: string;
  created_by: string;
  student_ids: string[];
  caretaker_ids: string[];
}) {
  const rpcRes = await supabase.rpc('create_case_with_relations', {
    p_case_type: params.case_type,
    p_other_text: params.other_text,
    p_details: params.details,
    p_scheduled_at: params.scheduled_at,
    p_created_by: params.created_by,
    p_student_ids: params.student_ids,
    p_caretaker_ids: params.caretaker_ids,
  });

  if (!rpcRes.error && rpcRes.data) {
    return rpcRes.data as string;
  }

  // Fallback: บันทึกลงตารางโดยตรง (สำหรับกรณีที่ยังไม่ได้สร้างฟังก์ชันบน Supabase)
  const { data: newCase, error: caseErr } = await supabase
    .from('cases')
    .insert({
      case_type: params.case_type,
      other_text: params.other_text,
      details: params.details,
      scheduled_at: params.scheduled_at,
      created_by: params.created_by,
    })
    .select('id')
    .single();

  if (caseErr) throw caseErr;
  const caseId = newCase.id;

  if (params.student_ids.length > 0) {
    const studentRows = params.student_ids.map((sid) => ({
      case_id: caseId,
      student_id: sid,
    }));
    const { error: sErr } = await supabase.from('case_students').insert(studentRows);
    if (sErr) throw sErr;
  }

  const caretakerSet = new Set([params.created_by, ...params.caretaker_ids]);
  const caretakerRows = Array.from(caretakerSet).map((cid) => ({
    case_id: caseId,
    caretaker_id: cid,
  }));
  const { error: cErr } = await supabase.from('case_caretakers').insert(caretakerRows);
  if (cErr) throw cErr;

  return caseId;
}

export async function getCaseById(id: string): Promise<CaseWithRelations> {
  // ดึงข้อมูลเคสหลัก
  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('*')
    .eq('id', id)
    .single();
  if (caseError) throw caseError;

  // ดึงนักเรียนในเคส
  const { data: caseStudents } = await supabase
    .from('case_students')
    .select('student_id')
    .eq('case_id', id);

  const studentIds = (caseStudents || []).map((cs) => cs.student_id);
  let students: Student[] = [];
  if (studentIds.length > 0) {
    const { data: studentData } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds);
    students = (studentData || []) as Student[];
  }

  // ดึงผู้ดูแลในเคส
  const { data: caseCaretakers } = await supabase
    .from('case_caretakers')
    .select('caretaker_id')
    .eq('case_id', id);

  const caretakerIds = (caseCaretakers || []).map((cc) => cc.caretaker_id);
  const allCaretakers = await getCaretakers();
  const caretakers = allCaretakers.filter((c) => caretakerIds.includes(c.id));

  // ดึงประวัติอัปเดต
  const { data: updateData } = await supabase
    .from('case_updates')
    .select('*')
    .eq('case_id', id)
    .order('created_at', { ascending: true });

  const updates: CaseUpdate[] = (updateData || []).map((u) => ({
    ...u,
    caretaker: allCaretakers.find((c) => c.id === u.caretaker_id),
  }));

  // ดึงลายเซ็น
  const { data: signatureData } = await supabase
    .from('case_signatures')
    .select('*')
    .eq('case_id', id)
    .order('signed_at', { ascending: true });

  const creator = allCaretakers.find((c) => c.id === caseData.created_by);

  return {
    ...caseData,
    students,
    caretakers,
    updates,
    signatures: (signatureData || []) as CaseSignature[],
    creator,
  };
}

export async function getCalendarEvents(
  startDate: string,
  endDate: string,
  caretakerId?: string
): Promise<CalendarEvent[]> {
  let query = supabase
    .from('cases')
    .select('id, case_type, other_text, scheduled_at, status')
    .gte('scheduled_at', startDate)
    .lte('scheduled_at', endDate)
    .order('scheduled_at');

  const { data, error } = await query;
  if (error) throw error;

  const cases = data || [];
  const events: CalendarEvent[] = [];

  for (const c of cases) {
    // ดึงจำนวนนักเรียน
    const { count } = await supabase
      .from('case_students')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', c.id);

    // ถ้ากรองตามผู้ดูแล
    if (caretakerId) {
      const { data: rel } = await supabase
        .from('case_caretakers')
        .select('caretaker_id')
        .eq('case_id', c.id)
        .eq('caretaker_id', caretakerId);

      if (!rel || rel.length === 0) continue;
    }

    events.push({
      ...c,
      student_count: count || 0,
    });
  }

  return events;
}

export async function updateCase(id: string, updates: { status?: string; details?: string | null; case_type?: string; other_text?: string | null; scheduled_at?: string }) {
  const { error } = await supabase.from('cases').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteCase(id: string) {
  const { error } = await supabase.from('cases').delete().eq('id', id);
  if (error) throw error;
}

// อัปเดต case students/caretakers (ลบแล้วเพิ่มใหม่)
export async function updateCaseStudents(caseId: string, studentIds: string[]) {
  await supabase.from('case_students').delete().eq('case_id', caseId);
  if (studentIds.length > 0) {
    const rows = studentIds.map((sid) => ({ case_id: caseId, student_id: sid }));
    const { error } = await supabase.from('case_students').insert(rows);
    if (error) throw error;
  }
}

export async function updateCaseCaretakers(caseId: string, caretakerIds: string[]) {
  await supabase.from('case_caretakers').delete().eq('case_id', caseId);
  if (caretakerIds.length > 0) {
    const rows = caretakerIds.map((cid) => ({ case_id: caseId, caretaker_id: cid }));
    const { error } = await supabase.from('case_caretakers').insert(rows);
    if (error) throw error;
  }
}

// =============================================================
// อัปเดตเคส (Case Updates)
// =============================================================

export async function addCaseUpdate(update: Omit<CaseUpdate, 'id' | 'created_at' | 'caretaker'>) {
  const { data, error } = await supabase.from('case_updates').insert(update).select().single();
  if (error) throw error;
  return data as CaseUpdate;
}

// =============================================================
// ลายเซ็น (Signatures)
// =============================================================

export async function addSignature(sig: Omit<CaseSignature, 'id' | 'signed_at'>) {
  const { data, error } = await supabase.from('case_signatures').insert(sig).select().single();
  if (error) throw error;
  return data as CaseSignature;
}

// =============================================================
// สำหรับหน้านักเรียน — นับจำนวนเคสของแต่ละคน
// =============================================================

export async function getStudentCaseCount(studentId: string): Promise<number> {
  const { count, error } = await supabase
    .from('case_students')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId);
  if (error) throw error;
  return count || 0;
}

export async function getStudentCases(studentId: string): Promise<CaseWithRelations[]> {
  const { data: csData, error } = await supabase
    .from('case_students')
    .select('case_id')
    .eq('student_id', studentId);
  if (error) throw error;

  const caseIds = (csData || []).map((cs) => cs.case_id);
  if (caseIds.length === 0) return [];

  const cases: CaseWithRelations[] = [];
  for (const cid of caseIds) {
    const c = await getCaseById(cid);
    cases.push(c);
  }

  // เรียงตาม scheduled_at desc
  cases.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  return cases;
}
