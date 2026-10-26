'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Users,
  Edit,
  Trash2,
  ChevronRight,
  BookOpen,
  X,
} from 'lucide-react';
import { getStudentsWithCaseCounts, deleteStudent } from '@/lib/queries';
import type { Student } from '@/lib/types';
import { StudentModal } from '@/components/StudentModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type StudentWithCount = Student & { case_count: number };

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(false);
    try {
      const data = await getStudentsWithCaseCounts();
      setStudents(data);
    } catch {
      setError('ไม่สามารถโหลดรายชื่อนักเรียนได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const grades = [...new Set(students.map((s) => s.grade).filter(Boolean))].sort() as string[];
  const rooms = [
    ...new Set(
      students
        .filter((s) => !gradeFilter || s.grade === gradeFilter)
        .map((s) => s.room)
        .filter((r) => r !== null)
    ),
  ].sort() as number[];

  const filtered = students.filter((s) => {
    if (gradeFilter && s.grade !== gradeFilter) return false;
    if (roomFilter && s.room !== Number(roomFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        s.first_name_th?.toLowerCase().includes(q) ||
        s.last_name_th?.toLowerCase().includes(q) ||
        s.nickname_th?.toLowerCase().includes(q) ||
        s.student_id?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleDelete = async () => {
    if (!deletingStudent) return;
    setDeleting(true);
    try {
      await deleteStudent(deletingStudent.id);
      setDeletingStudent(null);
      await fetchStudents();
    } catch {
      setError('ไม่สามารถลบข้อมูลนักเรียนได้');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '90px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--card-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: 'var(--primary-dark)' }}>
            รายชื่อนักเรียน
          </h1>
          <p style={{ fontSize: '0.75rem', color: '#9e9690', margin: '2px 0 0 0' }}>
            ทั้งหมด {students.length} คน
          </p>
        </div>
        <button
          onClick={() => {
            setEditingStudent(null);
            setShowModal(true);
          }}
          className="btn-primary"
          style={{ padding: '8px 14px', fontSize: '0.8125rem', height: '38px', minHeight: '38px' }}
        >
          <Plus size={16} />
          เพิ่มนักเรียน
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Search & Filters Card */}
        <div
          className="card"
          style={{
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: '#ffffff',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9e9690',
              }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="ค้นหาชื่อ, รหัสนักเรียน, ชื่อเล่น..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px', minHeight: '44px', fontSize: '0.875rem' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#9e9690',
                  padding: '2px',
                  display: 'flex',
                }}
                title="ล้างคำค้นหา"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <select
                className="input-field"
                value={gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value);
                  setRoomFilter('');
                }}
                style={{ fontSize: '0.8125rem', minHeight: '40px' }}
              >
                <option value="">ทุกระดับชั้น</option>
                {grades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <select
                className="input-field"
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                style={{ fontSize: '0.8125rem', minHeight: '40px' }}
              >
                <option value="">ทุกห้อง</option>
                {rooms.map((r) => (
                  <option key={r} value={r}>ห้อง {r}</option>
                ))}
              </select>
            </div>
            {(gradeFilter || roomFilter) && (
              <button
                type="button"
                onClick={() => {
                  setGradeFilter('');
                  setRoomFilter('');
                }}
                className="btn-secondary"
                style={{ padding: '0 12px', fontSize: '0.75rem', minHeight: '40px', whiteSpace: 'nowrap' }}
                title="ล้างตัวกรองชั้น/ห้อง"
              >
                ล้าง
              </button>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#8a8280', paddingTop: '2px' }}>
            <span>แสดง <strong>{filtered.length}</strong> จาก {students.length} คน</span>
            {(search || gradeFilter || roomFilter) && (
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                กำลังกรองข้อมูล
              </span>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--rose)',
              color: 'var(--rose-text)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Student List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={40} strokeWidth={1.5} style={{ margin: '0 auto 12px auto', color: '#b5aca6' }} />
            <p style={{ margin: 0 }}>
              {search || gradeFilter || roomFilter ? 'ไม่พบนักเรียนตามเงื่อนไขที่ค้นหา' : 'ยังไม่มีข้อมูลนักเรียน'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map((s) => {
              const initial = s.first_name_th ? s.first_name_th.charAt(0) : '?';
              const isFemale = s.gender === 'หญิง';

              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/students/${s.id}`)}
                  className="card"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    border: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-light)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                >
                  {/* Round Avatar Icon */}
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: isFemale
                        ? 'linear-gradient(135deg, #fde2e8 0%, #f8bbd0 100%)'
                        : 'linear-gradient(135deg, #ede4f3 0%, #d8c2e8 100%)',
                      color: isFemale ? 'var(--rose-text)' : 'var(--primary-dark)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      flexShrink: 0,
                      border: isFemale ? '1px solid #f8bbd0' : '1px solid #d4c2e5',
                    }}
                  >
                    {initial}
                  </div>

                  {/* Student Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--foreground)' }}>
                        {s.first_name_th} {s.last_name_th}
                      </span>
                      {s.nickname_th && (
                        <span className="chip chip-cream" style={{ fontSize: '0.75rem', padding: '1px 8px' }}>
                          ชื่อเล่น: {s.nickname_th}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                      <span className="chip chip-sky" style={{ fontSize: '0.6875rem', padding: '2px 8px', fontWeight: 600 }}>
                        {s.grade ? `${s.grade}/${s.room || 1}` : 'ไม่ระบุห้อง'}
                      </span>
                      {s.student_id && (
                        <span style={{ color: '#7a706b', fontSize: '0.75rem', background: 'var(--border-light)', padding: '2px 8px', borderRadius: '100px' }}>
                          รหัส {s.student_id}
                        </span>
                      )}
                      <span
                        className={s.case_count > 0 ? 'chip chip-lavender' : 'chip'}
                        style={{
                          fontSize: '0.6875rem',
                          padding: '2px 8px',
                          fontWeight: s.case_count > 0 ? 600 : 400,
                          background: s.case_count > 0 ? 'var(--lavender)' : 'var(--border-light)',
                          color: s.case_count > 0 ? 'var(--primary-dark)' : '#9e9690',
                        }}
                      >
                        <BookOpen size={11} style={{ marginRight: '3px' }} />
                        {s.case_count} เคส
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(s);
                        setShowModal(true);
                      }}
                      style={{
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        cursor: 'pointer',
                        padding: '7px',
                        color: '#6e6560',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="แก้ไขข้อมูลนักเรียน"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingStudent(s)}
                      style={{
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        cursor: 'pointer',
                        padding: '7px',
                        color: '#d88a8a',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="ลบนักเรียน"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/students/${s.id}`)}
                      style={{
                        border: 'none',
                        background: 'var(--lavender)',
                        cursor: 'pointer',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '2px',
                      }}
                      title="ดูประวัตินักเรียน"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Student Add/Edit Modal */}
      {showModal && (
        <StudentModal
          student={editingStudent}
          onClose={() => {
            setShowModal(false);
            setEditingStudent(null);
          }}
          onSaved={() => {
            setShowModal(false);
            setEditingStudent(null);
            fetchStudents();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingStudent && (
        <ConfirmDialog
          title={`ลบนักเรียน ${deletingStudent.first_name_th} ${deletingStudent.last_name_th}?`}
          message="ข้อมูลของนักเรียนและประวัติการเชื่อมโยงจะถูกลบ ไม่สามารถกู้คืนได้"
          confirmLabel={deleting ? 'กำลังลบ...' : 'ลบข้อมูลนักเรียน'}
          onConfirm={handleDelete}
          onCancel={() => setDeletingStudent(null)}
        />
      )}
    </div>
  );
}
