'use client';

import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  getStudents,
  getCaretakers,
  updateCase,
  updateCaseStudents,
  updateCaseCaretakers,
} from '@/lib/queries';
import type { Student, Caretaker, CaseWithRelations } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { safeParseDate } from '@/lib/date';

interface Props {
  caseData: CaseWithRelations;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditCaseModal({ caseData, onClose, onUpdated }: Props) {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state initialized from caseData
  const [selectedStudents, setSelectedStudents] = useState<Student[]>(caseData.students);
  const [studentSearch, setStudentSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [caseType, setCaseType] = useState<string>(caseData.case_type);
  const [otherText, setOtherText] = useState(caseData.other_text || '');
  const [details, setDetails] = useState(caseData.details || '');
  const [status, setStatus] = useState<'planned' | 'done'>(caseData.status);

  // Parse date and time
  const initialDate = safeParseDate(caseData.scheduled_at);
  const [scheduledDate, setScheduledDate] = useState(format(initialDate, 'yyyy-MM-dd'));
  const [scheduledTime, setScheduledTime] = useState(format(initialDate, 'HH:mm'));
  const [selectedCaretakers, setSelectedCaretakers] = useState<Caretaker[]>(caseData.caretakers);

  useEffect(() => {
    Promise.all([getStudents(), getCaretakers()])
      .then(([s, c]) => {
        setStudents(s);
        setCaretakers(c);
        setLoading(false);
      })
      .catch(() => {
        setError('ไม่สามารถโหลดข้อมูลได้');
        setLoading(false);
      });
  }, []);

  const grades = [...new Set(students.map((s) => s.grade).filter(Boolean))].sort() as string[];
  const rooms = [
    ...new Set(
      students
        .filter((s) => !gradeFilter || s.grade === gradeFilter)
        .map((s) => s.room)
        .filter((r) => r !== null)
    ),
  ].sort() as number[];

  const filteredStudents = students.filter((s) => {
    if (gradeFilter && s.grade !== gradeFilter) return false;
    if (roomFilter && s.room !== Number(roomFilter)) return false;
    if (studentSearch) {
      const q = studentSearch.toLowerCase();
      const match =
        s.first_name_th?.toLowerCase().includes(q) ||
        s.last_name_th?.toLowerCase().includes(q) ||
        s.nickname_th?.toLowerCase().includes(q) ||
        s.student_id?.includes(q);
      if (!match) return false;
    }
    return true;
  });

  const toggleStudent = (s: Student) => {
    if (selectedStudents.find((sel) => sel.id === s.id)) {
      setSelectedStudents(selectedStudents.filter((sel) => sel.id !== s.id));
    } else {
      setSelectedStudents([...selectedStudents, s]);
    }
  };

  const toggleCaretaker = (c: Caretaker) => {
    // ผู้สร้างหลักเอาออกไม่ได้
    if (c.id === caseData.created_by) return;
    if (selectedCaretakers.find((sel) => sel.id === c.id)) {
      setSelectedCaretakers(selectedCaretakers.filter((sel) => sel.id !== c.id));
    } else {
      setSelectedCaretakers([...selectedCaretakers, c]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      setError('กรุณาเลือกนักเรียนอย่างน้อย 1 คน');
      return;
    }
    if (caseType === 'other' && !otherText.trim()) {
      setError('กรุณาระบุประเภทเคส');
      return;
    }
    if (!scheduledDate) {
      setError('กรุณาเลือกวันที่');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime || '09:00'}:00`).toISOString();

      await updateCase(caseData.id, {
        case_type: caseType,
        other_text: caseType === 'other' ? otherText.trim() : null,
        details: details.trim() || null,
        scheduled_at: scheduledAt,
        status,
      });

      await updateCaseStudents(
        caseData.id,
        selectedStudents.map((s) => s.id)
      );

      await updateCaseCaretakers(
        caseData.id,
        selectedCaretakers.map((c) => c.id)
      );

      onUpdated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถบันทึกการแก้ไขได้';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>แก้ไขเคส</h2>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#9e9690' }}
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <div className="spinner" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* สถานะ */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}>
                สถานะเคส
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStatus('planned')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: status === 'planned' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: status === 'planned' ? 'var(--lavender)' : 'var(--card-bg)',
                    fontWeight: status === 'planned' ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  วางแผน
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('done')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: status === 'done' ? '2px solid #5cb88f' : '1px solid var(--border)',
                    background: status === 'done' ? 'var(--mint)' : 'var(--card-bg)',
                    fontWeight: status === 'done' ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  เสร็จสิ้น
                </button>
              </div>
            </div>

            {/* 1. เลือกนักเรียน */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}>
                นักเรียน ({selectedStudents.length} คนที่เลือก) *
              </label>

              {/* ชิปนักเรียนที่เลือก */}
              {selectedStudents.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {selectedStudents.map((s) => (
                    <span
                      key={s.id}
                      className="chip chip-sky"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleStudent(s)}
                      title="คลิกเพื่อเอาออก"
                    >
                      {s.first_name_th} ({s.nickname_th})
                      <X size={12} style={{ marginLeft: '4px' }} />
                    </span>
                  ))}
                </div>
              )}

              {/* ค้นหา + กรอง */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={15}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9e9690' }}
                  />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อ, รหัส..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '0.8125rem' }}
                  />
                </div>
                <select
                  value={gradeFilter}
                  onChange={(e) => {
                    setGradeFilter(e.target.value);
                    setRoomFilter('');
                  }}
                  style={{ width: '90px', fontSize: '0.8125rem' }}
                >
                  <option value="">ทุกชั้น</option>
                  {grades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  style={{ width: '80px', fontSize: '0.8125rem' }}
                >
                  <option value="">ทุกห้อง</option>
                  {rooms.map((r) => (
                    <option key={r} value={r}>ห้อง {r}</option>
                  ))}
                </select>
              </div>

              {/* รายการนักเรียน */}
              <div
                style={{
                  maxHeight: '130px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px',
                }}
              >
                {filteredStudents.length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: '#9e9690', padding: '8px', textAlign: 'center' }}>
                    ไม่พบนักเรียน
                  </p>
                ) : (
                  filteredStudents.map((s) => {
                    const isSelected = !!selectedStudents.find((sel) => sel.id === s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleStudent(s)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--lavender)' : 'transparent',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <span>
                          {s.student_id ? `${s.student_id} ` : ''}
                          {s.first_name_th} {s.last_name_th} ({s.nickname_th})
                          <span style={{ color: '#9e9690', marginLeft: '6px', fontSize: '0.75rem' }}>
                            {s.grade}/{s.room}
                          </span>
                        </span>
                        {isSelected && <Check size={14} color="var(--primary)" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. ประเภทเคส */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '8px' }}>
                ประเภทเคส *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="caseTypeEdit"
                    value="low_confidence"
                    checked={caseType === 'low_confidence'}
                    onChange={() => setCaseType('low_confidence')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  นักเรียนไม่มั่นใจในตัวเอง
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="caseTypeEdit"
                    value="feel_not_smart"
                    checked={caseType === 'feel_not_smart'}
                    onChange={() => setCaseType('feel_not_smart')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  นักเรียนรู้สึกว่าตัวเองเรียนไม่เก่ง
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="caseTypeEdit"
                    value="other"
                    checked={caseType === 'other'}
                    onChange={() => setCaseType('other')}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  อื่นๆ
                </label>
              </div>

              {caseType === 'other' && (
                <input
                  type="text"
                  placeholder="ระบุประเภทเคส..."
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  style={{ marginTop: '8px' }}
                  required
                />
              )}
            </div>

            {/* 3. รายละเอียดเพิ่มเติม */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}>
                รายละเอียดเพิ่มเติม
              </label>
              <textarea
                rows={3}
                placeholder="บันทึกข้อมูลเบื้องต้น..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            {/* 4. วัน-เวลา */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}>
                  วันที่ *
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}>
                  เวลา
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>

            {/* 5. ผู้ดูแล */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '6px' }}>
                ผู้ดูแลที่เกี่ยวข้อง
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {caretakers.map((c) => {
                  const isSelected = !!selectedCaretakers.find((sel) => sel.id === c.id);
                  const isCreator = c.id === caseData.created_by;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCaretaker(c)}
                      className={`chip ${isSelected ? 'chip-mint' : ''}`}
                      style={{
                        cursor: isCreator ? 'default' : 'pointer',
                        border: isSelected ? '1px solid var(--mint-text)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--mint)' : 'transparent',
                        color: isSelected ? 'var(--mint-text)' : 'var(--foreground)',
                      }}
                      title={isCreator ? 'ผู้สร้างเคส (ไม่สามารถนำออกได้)' : undefined}
                    >
                      {c.name}
                      {isCreator && ' (ผู้สร้าง)'}
                      {isSelected && !isCreator && <Check size={12} style={{ marginLeft: '4px' }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--rose-text)',
                  background: 'var(--rose)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '16px',
                }}
              >
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
                ยกเลิก
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
