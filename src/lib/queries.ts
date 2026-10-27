'use server';

import { cookies } from 'next/headers';
import { supabase, getScopedSupabase } from '@/lib/supabase';
import type {
  Student,
  Caretaker,
  CaretakerAccount,
  CaretakerRole,
  CaseWithRelations,
  CaseUpdate,
  CaseSignature,
  CalendarEvent,
} from '@/lib/types';

// =============================================================
// Helper: ดึง Supabase client ที่แนบ Header 'x-caretaker-id' สำหรับ RLS
// =============================================================

async function getDb(explicitActorId?: string) {
  let actorId = explicitActorId;
  if (!actorId) {
    try {
      const cookieStore = await cookies();
      actorId = cookieStore.get('itpc_actor_id')?.value;
    } catch {
      // fallback ในกรณีที่ไม่มี cookie context
    }
  }
  return getScopedSupabase(actorId);
}

// =============================================================
// ตรวจสิทธิ์ (ฝั่ง server) — ต้องเป็น admin ที่ยังใช้งานอยู่
// =============================================================

async function assertAdmin(actorId: string) {
  const db = await getDb(actorId);
  const { error } = await db.rpc('assert_admin', { p_actor_id: actorId });
  if (error) throw new Error(error.message || 'ไม่มีสิทธิ์ (ต้องเป็นผู้ดูแลระบบ)');
}

async function getClosedStudentIds(): Promise<string[]> {
  const db = await getDb();
  const { data } = await db.from('students').select('id').not('closed_at', 'is', null);
  return (data || []).map((r) => r.id);
}

async function getClosedCaretakerIds(): Promise<string[]> {
  const db = await getDb();
  const { data } = await db.from('caretakers').select('id').not('closed_at', 'is', null);
  return (data || []).map((r) => r.id);
}

// =============================================================
// ผู้ดูแล (Caretakers)
// =============================================================

export async function getCaretakers(): Promise<Caretaker[]> {
  const db = await getDb();
  const { data, error } = await db.rpc('get_caretakers');
  if (error) throw error;
  return data || [];
}

export async function verifyPin(
  caretakerId: string,
  pin: string
): Promise<{
  success: boolean;
  caretaker_id?: string;
  name?: string;
  role?: CaretakerRole;
  message?: string;
}> {
  // ลองเรียก login_caretaker (ระบบใหม่ที่มี role และ closed_at)
  const db = await getDb(caretakerId);
  const { data, error } = await db.rpc('login_caretaker', {
    p_caretaker_id: caretakerId,
    p_pin: pin,
  });

  if (!error && data) {
    return data as {
      success: boolean;
      caretaker_id?: string;
      name?: string;
      role?: CaretakerRole;
      message?: string;
    };
  }

  // Fallback: หากยังไม่ได้รัน 06_roles_and_closing.sql ให้เรียก verify_pin เดิม
  let fb = await db.rpc('verify_pin', {
    p_caretaker_id: caretakerId,
    p_pin: pin,
  });
  if (fb.error) {
    fb = await db.rpc('verify_pin', {
      p_id: caretakerId,
      p_pin: pin,
    });
  }

  if (fb.error) {
    throw new Error('ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบ PIN');
  }

  const success = typeof fb.data === 'boolean' ? fb.data : fb.data?.success;
  if (!success) {
    return {
      success: false,
      message: 'PIN ไม่ถูกต้อง',
    };
  }

  // ดึง role และ name ที่แท้จริงจากตาราง caretakers โดยตรง
  const { data: ct } = await db
    .from('caretakers')
    .select('id, name, role')
    .eq('id', caretakerId)
    .single();

  const realRole = (ct?.role || 'caretaker') as CaretakerRole;

  return {
    success: true,
    caretaker_id: caretakerId,
    name: ct?.name || fb.data?.name || 'ผู้ดูแล',
    role: realRole,
  };
}

// ตรวจ session ล่าสุด (role / บัญชีถูกปิดหรือไม่) — คืน null ถ้าใช้ไม่ได้แล้ว
export async function getSessionCaretaker(caretakerId: string): Promise<Caretaker | null> {
  try {
    const db = await getDb(caretakerId);
    const { data, error } = await db.rpc('get_session_caretaker', {
      p_caretaker_id: caretakerId,
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      return data[0] as Caretaker;
    }

    // Fallback: ตรวจสอบจากตาราง caretakers โดยตรง
    const { data: ct, error: ctErr } = await db
      .from('caretakers')
      .select('id, name, role, closed_at')
      .eq('id', caretakerId)
      .single();

    if (ctErr || !ct) return null;
    if (ct.closed_at) return null; // หากถูกปิดบัญชีแล้ว ให้ logout ทันที

    return {
      id: ct.id,
      name: ct.name,
      role: (ct.role || 'caretaker') as CaretakerRole,
    };
  } catch {
    return null;
  }
}

// แก้ไขข้อมูลส่วนตัว (ทุก role) — ต้องยืนยัน PIN ปัจจุบัน
export async function updateOwnProfile(params: {
  caretakerId: string;
  currentPin: string;
  name: string;
  newPin: string | null;
}): Promise<{ success: boolean; message?: string }> {
  try {
    const db = await getDb(params.caretakerId);
    const { data, error } = await db.rpc('update_own_profile', {
      p_caretaker_id: params.caretakerId,
      p_current_pin: params.currentPin,
      p_name: params.name,
      p_new_pin: params.newPin,
    });
    if (error) {
      console.error('RPC update_own_profile error:', error);
      return { success: false, message: error.message || 'บันทึกไม่สำเร็จ' };
    }
    return (data || { success: true }) as { success: boolean; message?: string };
  } catch (err: unknown) {
    console.error('updateOwnProfile exception:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
    };
  }
}

// =============================================================
// ADMIN — จัดการบัญชีผู้ดูแล (ตรวจสิทธิ์ใน SQL function)
// =============================================================

export async function adminListCaretakers(actorId: string): Promise<CaretakerAccount[]> {
  try {
    const db = await getDb(actorId);
    const { data, error } = await db.rpc('admin_list_caretakers', { p_actor_id: actorId });
    if (error) {
      console.warn('adminListCaretakers error:', error.message);
      return [];
    }
    return (data || []) as CaretakerAccount[];
  } catch (err) {
    console.warn('adminListCaretakers exception:', err);
    return [];
  }
}

export async function adminCreateCaretaker(
  actorId: string,
  account: { name: string; pin: string; role: CaretakerRole }
) {
  const db = await getDb(actorId);
  const { error } = await db.rpc('admin_create_caretaker', {
    p_actor_id: actorId,
    p_name: account.name,
    p_pin: account.pin,
    p_role: account.role,
  });
  if (error) throw new Error(error.message);
}

export async function adminUpdateCaretaker(
  actorId: string,
  id: string,
  account: { name: string; role: CaretakerRole; newPin: string | null }
) {
  const db = await getDb(actorId);
  const { error } = await db.rpc('admin_update_caretaker', {
    p_actor_id: actorId,
    p_id: id,
    p_name: account.name,
    p_role: account.role,
    p_new_pin: account.newPin,
  });
  if (error) throw new Error(error.message);
}

export async function adminSetCaretakerClosed(actorId: string, id: string, closed: boolean) {
  const db = await getDb(actorId);
  const { error } = await db.rpc('admin_set_caretaker_closed', {
    p_actor_id: actorId,
    p_id: id,
    p_closed: closed,
  });
  if (error) throw new Error(error.message);
}

// =============================================================
// นักเรียน (Students)
// =============================================================

// เฉพาะนักเรียนที่ยังไม่ถูกปิด
export async function getStudents() {
  const db = await getDb();
  const { data, error } = await db
    .from('students')
    .select('*')
    .is('closed_at', null)
    .order('grade')
    .order('room')
    .order('first_name_th');

  if (error) {
    // Fallback: ถ้ายังไม่ได้รัน 06_roles_and_closing.sql ใน Supabase
    const fb = await db
      .from('students')
      .select('*')
      .order('grade')
      .order('room')
      .order('first_name_th');
    if (fb.error) throw fb.error;
    return (fb.data || []) as Student[];
  }

  return (data || []) as Student[];
}

export async function getStudentsWithCaseCounts(): Promise<(Student & { case_count: number })[]> {
  const db = await getDb();
  const students = await getStudents();
  const { data: allCaseStudents } = await db.from('case_students').select('student_id');

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
  const db = await getDb();
  const { data, error } = await db
    .from('students')
    .select('*')
    .eq('id', id)
    .is('closed_at', null)
    .single();

  if (error) {
    // Fallback
    const fb = await db.from('students').select('*').eq('id', id).single();
    if (fb.error) throw fb.error;
    return fb.data as Student;
  }

  return data as Student;
}

// ----- ADMIN only -----

export async function createStudent(
  actorId: string,
  student: Omit<Student, 'id' | 'created_at' | 'updated_at' | 'closed_at'>
) {
  await assertAdmin(actorId);
  const db = await getDb(actorId);
  const { data, error } = await db.from('students').insert(student).select().single();
  if (error) throw error;
  return data as Student;
}

export async function updateStudent(actorId: string, id: string, updates: Partial<Student>) {
  await assertAdmin(actorId);
  const db = await getDb(actorId);
  // กันไม่ให้แก้ id / closed_at ผ่านทางนี้
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, closed_at: _closed, ...safe } = updates;
  const { data, error } = await db.from('students').update(safe).eq('id', id).select().single();
  if (error) throw error;
  return data as Student;
}

// ปิด / เปิดนักเรียน (แทนการลบจริง — ประวัติเคสไม่หาย)
export async function setStudentClosed(actorId: string, id: string, closed: boolean) {
  await assertAdmin(actorId);
  const db = await getDb(actorId);
  const { error } = await db
    .from('students')
    .update({ closed_at: closed ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function adminListClosedStudents(actorId: string): Promise<Student[]> {
  try {
    await assertAdmin(actorId);
    const db = await getDb(actorId);
    const { data, error } = await db
      .from('students')
      .select('*')
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false });
    if (error) {
      console.warn('adminListClosedStudents error:', error.message);
      return [];
    }
    return (data || []) as Student[];
  } catch (err) {
    console.warn('adminListClosedStudents exception:', err);
    return [];
  }
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
  const db = await getDb(params.created_by);
  const rpcRes = await db.rpc('create_case_with_relations', {
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
  const { data: newCase, error: caseErr } = await db
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
    const { error: sErr } = await db.from('case_students').insert(studentRows);
    if (sErr) throw sErr;
  }

  const caretakerSet = new Set([params.created_by, ...params.caretaker_ids]);
  const caretakerRows = Array.from(caretakerSet).map((cid) => ({
    case_id: caseId,
    caretaker_id: cid,
  }));
  const { error: cErr } = await db.from('case_caretakers').insert(caretakerRows);
  if (cErr) throw cErr;

  return caseId;
}

export async function getCaseById(id: string, explicitActorId?: string): Promise<CaseWithRelations> {
  let actorId = explicitActorId;
  if (!actorId) {
    try {
      const cookieStore = await cookies();
      actorId = cookieStore.get('itpc_actor_id')?.value;
    } catch {
      // fallback
    }
  }

  const db = await getDb(actorId);
  // ดึงข้อมูลเคสหลัก
  const { data: caseData, error: caseError } = await db
    .from('cases')
    .select('*')
    .eq('id', id)
    .single();
  if (caseError) throw caseError;

  // ดึงผู้ดูแลในเคส
  const { data: caseCaretakers } = await db
    .from('case_caretakers')
    .select('caretaker_id')
    .eq('case_id', id);

  const caretakerIds = (caseCaretakers || []).map((cc) => cc.caretaker_id);
  const allCaretakers = await getCaretakers();
  const caretakers = allCaretakers.filter((c) => caretakerIds.includes(c.id));

  // ตรวจสอบสิทธิ์การเข้าถึงเคส:
  // Admin เข้าถึงได้ทุกเคส ส่วน Caretaker ต้องเป็นผู้สร้าง (created_by) หรือถูกระบุใน case_caretakers
  if (actorId) {
    const { data: ct } = await db
      .from('caretakers')
      .select('role')
      .eq('id', actorId)
      .single();
    const isUserAdmin = ct?.role === 'admin';
    const isCreator = caseData.created_by === actorId;
    const isAssigned = caretakerIds.includes(actorId);

    if (!isUserAdmin && !isCreator && !isAssigned) {
      throw new Error('ไม่มีสิทธิ์เข้าถึงเคสนี้ (สงวนสิทธิ์เฉพาะผู้สร้างหรือผู้ดูแลที่เกี่ยวข้อง)');
    }
  }

  // ดึงนักเรียนในเคส
  const { data: caseStudents } = await db
    .from('case_students')
    .select('student_id')
    .eq('case_id', id);

  const studentIds = (caseStudents || []).map((cs) => cs.student_id);
  let students: Student[] = [];
  if (studentIds.length > 0) {
    const { data: studentData } = await db
      .from('students')
      .select('*')
      .in('id', studentIds)
      .is('closed_at', null);
    students = (studentData || []) as Student[];
  }

  // ดึงประวัติอัปเดต
  const { data: updateData } = await db
    .from('case_updates')
    .select('*')
    .eq('case_id', id)
    .order('created_at', { ascending: true });

  const updates: CaseUpdate[] = (updateData || []).map((u) => ({
    ...u,
    caretaker: allCaretakers.find((c) => c.id === u.caretaker_id),
  }));

  // ดึงลายเซ็น
  const { data: signatureData } = await db
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
  caretakerId?: string,
  explicitActorId?: string
): Promise<CalendarEvent[]> {
  try {
    let actorId = explicitActorId || caretakerId;
    if (!actorId) {
      try {
        const cookieStore = await cookies();
        actorId = cookieStore.get('itpc_actor_id')?.value;
      } catch {
        // fallback
      }
    }

    const db = await getDb(actorId);

    // 1. ตรวจสอบ role ของ actor
    let isUserAdmin = false;
    if (actorId) {
      const { data: ct } = await db
        .from('caretakers')
        .select('role')
        .eq('id', actorId)
        .single();
      isUserAdmin = ct?.role === 'admin';
    }

    // 2. ดึงเคสตามช่วงเวลา
    const query = db
      .from('cases')
      .select('id, case_type, other_text, scheduled_at, status, created_by, created_at, updated_at')
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at');

    const { data, error } = await query;
    if (error) {
      console.error('getCalendarEvents query error:', error);
      return [];
    }

    const cases = (data || []) as {
      id: string;
      case_type: CalendarEvent['case_type'];
      other_text: string | null;
      scheduled_at: string;
      status: CalendarEvent['status'];
      created_by: string;
      created_at?: string;
      updated_at?: string;
    }[];

    if (cases.length === 0) return [];

    const caseIds = cases.map((c) => c.id);

    // 3. ดึงความสัมพันธ์ผู้ดูแลในเคสทั้งหมดสำหรับ caseIds
    const { data: ccData } = await db
      .from('case_caretakers')
      .select('case_id, caretaker_id')
      .in('case_id', caseIds);

    const caseCaretakersMap = new Map<string, Set<string>>();
    (ccData || []).forEach((row) => {
      if (!caseCaretakersMap.has(row.case_id)) {
        caseCaretakersMap.set(row.case_id, new Set());
      }
      caseCaretakersMap.get(row.case_id)!.add(row.caretaker_id);
    });

    // 4. กรองสิทธิ์การเข้าถึง:
    // - Admin: เห็นเคสทั้งหมดที่ทุกคนเปิด (หรือกรองตาม caretakerId หากระบุ)
    // - Caretaker (ไม่ใช่ Admin): เห็นเฉพาะเคสที่ตนเองสร้าง (created_by === actorId) หรือเกี่ยวข้อง (ใน case_caretakers) เท่านั้น
    const accessibleCases = cases.filter((c) => {
      const assignedSet = caseCaretakersMap.get(c.id) || new Set();
      const isCreator = actorId ? c.created_by === actorId : false;
      const isAssigned = actorId ? assignedSet.has(actorId) : false;

      if (!isUserAdmin) {
        // ผู้ดูแลทั่วไป: เห็นเฉพาะเคสของตนเองหรือที่เกี่ยวข้องเท่านั้น
        return isCreator || isAssigned;
      }

      // สำหรับ Admin: ถ้ามีการระบุตัวกรอง caretakerId ให้กรองตามนั้น ถ้าไม่ระบุให้เห็นเคสทั้งหมด
      if (caretakerId) {
        return c.created_by === caretakerId || assignedSet.has(caretakerId);
      }
      return true;
    });

    if (accessibleCases.length === 0) return [];

    const accessibleCaseIds = accessibleCases.map((c) => c.id);

    // 5. ดึงจำนวนนักเรียนในเคส
    let csData: { case_id: string }[] = [];
    const csTry = await db
      .from('case_students')
      .select('case_id, students!inner(closed_at)')
      .in('case_id', accessibleCaseIds)
      .is('students.closed_at', null);

    if (!csTry.error && csTry.data) {
      csData = csTry.data as unknown as { case_id: string }[];
    } else {
      const csFallback = await db
        .from('case_students')
        .select('case_id')
        .in('case_id', accessibleCaseIds);
      csData = (csFallback.data || []) as { case_id: string }[];
    }

    const studentCountMap = new Map<string, number>();
    csData.forEach((row) => {
      studentCountMap.set(row.case_id, (studentCountMap.get(row.case_id) || 0) + 1);
    });

    // 6. ดึงบันทึกการดำเนินงานล่าสุดของแต่ละเคส (case_updates) เพื่อให้แสดงเวลาตามการอัปเดตจริง
    const { data: updatesData } = await db
      .from('case_updates')
      .select('case_id, created_at')
      .in('case_id', accessibleCaseIds)
      .order('created_at', { ascending: false });

    const latestUpdateMap = new Map<string, string>();
    (updatesData || []).forEach((u) => {
      if (!latestUpdateMap.has(u.case_id)) {
        latestUpdateMap.set(u.case_id, u.created_at);
      }
    });

    const events: CalendarEvent[] = accessibleCases.map((c) => {
      // เวลาตามที่อัปเดตจริง:
      // 1. case_updates ล่าสุด (หากมีบันทึกติดตามผล)
      // 2. updated_at ของเคส (หากมีการแก้ไขเคส)
      // 3. created_at (เวลาสร้างเคสจริง)
      // 4. scheduled_at (เวลานัดหมาย)
      const actualTime = latestUpdateMap.get(c.id) || c.updated_at || c.created_at || c.scheduled_at;
      return {
        id: c.id,
        case_type: c.case_type,
        other_text: c.other_text,
        scheduled_at: c.scheduled_at,
        created_at: c.created_at,
        updated_at: c.updated_at,
        actual_updated_at: actualTime,
        status: c.status,
        student_count: studentCountMap.get(c.id) || 0,
      };
    });

    return events;
  } catch (err) {
    console.error('getCalendarEvents unexpected error:', err);
    return [];
  }
}

export async function updateCase(id: string, updates: { status?: string; details?: string | null; case_type?: string; other_text?: string | null; scheduled_at?: string }) {
  const db = await getDb();
  const { error } = await db.from('cases').update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteCase(id: string) {
  const db = await getDb();
  const { error } = await db.from('cases').delete().eq('id', id);
  if (error) throw error;
}

// อัปเดต case students/caretakers (ลบแล้วเพิ่มใหม่)
// ไม่แตะความสัมพันธ์กับรายการที่ถูกปิด (เพราะ UI ไม่เห็น) → เปิดคืนแล้วประวัติยังอยู่
export async function updateCaseStudents(caseId: string, studentIds: string[]) {
  const db = await getDb();
  const closedIds = await getClosedStudentIds();
  let del = db.from('case_students').delete().eq('case_id', caseId);
  if (closedIds.length > 0) del = del.not('student_id', 'in', `(${closedIds.join(',')})`);
  await del;
  if (studentIds.length > 0) {
    const rows = studentIds.map((sid) => ({ case_id: caseId, student_id: sid }));
    const { error } = await db.from('case_students').upsert(rows, { ignoreDuplicates: true });
    if (error) throw error;
  }
}

export async function updateCaseCaretakers(caseId: string, caretakerIds: string[]) {
  const db = await getDb();
  const closedIds = await getClosedCaretakerIds();
  let del = db.from('case_caretakers').delete().eq('case_id', caseId);
  if (closedIds.length > 0) del = del.not('caretaker_id', 'in', `(${closedIds.join(',')})`);
  await del;
  if (caretakerIds.length > 0) {
    const rows = caretakerIds.map((cid) => ({ case_id: caseId, caretaker_id: cid }));
    const { error } = await db.from('case_caretakers').upsert(rows, { ignoreDuplicates: true });
    if (error) throw error;
  }
}

// =============================================================
// อัปเดตเคส (Case Updates)
// =============================================================

export async function addCaseUpdate(update: Omit<CaseUpdate, 'id' | 'created_at' | 'caretaker'>) {
  const db = await getDb(update.caretaker_id);
  const { data, error } = await db.from('case_updates').insert(update).select().single();
  if (error) throw error;
  // อัปเดต updated_at ของเคสให้ตรงกับเวลาจริง
  await db.from('cases').update({ updated_at: new Date().toISOString() }).eq('id', update.case_id);
  return data as CaseUpdate;
}

// =============================================================
// ลายเซ็น (Signatures)
// =============================================================

export async function addSignature(sig: Omit<CaseSignature, 'id' | 'signed_at'>) {
  const db = await getDb();
  const { data, error } = await db.from('case_signatures').insert(sig).select().single();
  if (error) throw error;
  // อัปเดต updated_at ของเคสให้ตรงกับเวลาจริง
  await db.from('cases').update({ updated_at: new Date().toISOString() }).eq('id', sig.case_id);
  return data as CaseSignature;
}

// =============================================================
// สำหรับหน้านักเรียน — นับจำนวนเคสของแต่ละคน
// =============================================================

export async function getStudentCaseCount(studentId: string): Promise<number> {
  const db = await getDb();
  const { count, error } = await db
    .from('case_students')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId);
  if (error) throw error;
  return count || 0;
}

export async function getStudentCases(
  studentId: string,
  explicitActorId?: string
): Promise<CaseWithRelations[]> {
  let actorId = explicitActorId;
  if (!actorId) {
    try {
      const cookieStore = await cookies();
      actorId = cookieStore.get('itpc_actor_id')?.value;
    } catch {
      // fallback
    }
  }

  const db = await getDb(actorId);
  const { data: csData, error } = await db
    .from('case_students')
    .select('case_id')
    .eq('student_id', studentId);
  if (error) throw error;

  const caseIds = (csData || []).map((cs) => cs.case_id);
  if (caseIds.length === 0) return [];

  // กรองเฉพาะเคสที่ผู้ใช้มีสิทธิ์เข้าถึง (Admin ดูได้ทั้งหมด, Caretaker ดูได้เฉพาะเคสของตนเอง)
  const rawCases = await Promise.all(
    caseIds.map((cid) => getCaseById(cid, actorId).catch(() => null))
  );

  const cases = rawCases.filter((c): c is CaseWithRelations => c !== null);

  // เรียงตาม scheduled_at desc
  cases.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
  return cases;
}
