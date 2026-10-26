'use client';

import { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getStudents, getCaretakers, createCase } from '@/lib/queries';
import type { Student, Caretaker } from '@/lib/types';

interface Props {
  initialDate?: string;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateCaseModal({ initialDate, onClose, onCreated }: Props) {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [caseType, setCaseType] = useState<string>('low_confidence');
  const [otherText, setOtherText] = useState('');
  const [details, setDetails] = useState('');
  const [scheduledDate, setScheduledDate] = useState(initialDate || '');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [selectedCaretakers, setSelectedCaretakers] = useState<Caretaker[]>([]);

  useEffect(() => {
    Promise.all([getStudents(), getCaretakers()])
      .then(([s, c]) => {
        setStudents(s);
        setCaretakers(c);
        // ผู้สร้างเป็นผู้ดูแลคนแรกอัตโนมัติ
        if (currentUser) {
          const me = c.find((ct) => ct.id === currentUser.id);
          if (me) setSelectedCaretakers([me]);
        }
        // ตั้งวันเริ่มต้น
        if (initialDate) {
          setScheduledDate(initialDate);
        } else {
          const today = new Date();
          setScheduledDate(today.toISOString().split('T')[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('ไม่สามารถโหลดข้อมูลได้');
        setLoading(false);
      });
  }, [currentUser]);

  const grades = [...new Set(students.map((s) => s.grade).filter(Boolean))].sort() as string[];
  const rooms = [...new Set(students.filter((s) => !gradeFilter || s.grade === gradeFilter).map((s) => s.room).filter((r) => r !== null))].sort() as number[];

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
    // ผู้สร้างลบไม่ได้
    if (c.id === currentUser?.id) return;
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
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      await createCase({
        case_type: caseType,
        other_text: caseType === 'other' ? otherText.trim() : null,
        details: details.trim() || null,
        scheduled_at: scheduledAt,
        created_by: currentUser!.id,
        student_ids: selectedStudents.map((s) => s.id),
        caretaker_ids: selectedCaretakers.map((c) => c.id),
      });
      onCreated();
    } catch (err: unknown) {
      console.error('Create case error:', err);
      const e = err as { message?: string; details?: string };
      setError(e?.message || 'ไม่สามารถบันทึกเคสได้ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)',
          position: 'sticky',
          top: 0,
          background: 'var(--card-bg)',
          zIndex: 1,
        }}>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0 }}>สร้างเคสใหม่</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#9e9690' }}>
            <X size={22} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
            <div className="spinner" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            {/* 1. เลือกนักเรียน */}
            <div style={{ marginBottom: '20px' }}>
              <label className="label">นักเรียน *</label>

              {/* ชิปที่เลือก */}
              {selectedStudents.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {selectedStudents.map((s) => (
                    <span
                      key={s.id}
                      className="chip chip-lavender"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleStudent(s)}
                    >
                      {s.nickname_th || s.first_name_th} ({s.grade}/{s.room})
                      <X size={14} style={{ marginLeft: '2px' }} />
                    </span>
                  ))}
                </div>
              )}

              {/* ค้นหาและกรอง */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9e9690' }} />
                  <input
                    className="input-field"
                    style={{ paddingLeft: '32px' }}
                    placeholder="ค้นหาชื่อ/รหัส..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <select
                  className="input-field"
                  style={{ width: 'auto', minWidth: '70px' }}
                  value={gradeFilter}
                  onChange={(e) => { setGradeFilter(e.target.value); setRoomFilter(''); }}
                >
                  <option value="">ชั้น</option>
                  {grades.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                  className="input-field"
                  style={{ width: 'auto', minWidth: '60px' }}
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                >
                  <option value="">ห้อง</option>
                  {rooms.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* รายชื่อนักเรียน */}
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
              }}>
                {filteredStudents.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8125rem', color: '#9e9690' }}>
                    ไม่พบนักเรียน
                  </div>
                ) : (
                  filteredStudents.map((s) => {
                    const isSelected = selectedStudents.some((sel) => sel.id === s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStudent(s)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          borderBottom: '1px solid var(--border-light)',
                          background: isSelected ? 'var(--lavender)' : 'transparent',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: '0.875rem',
                          textAlign: 'left',
                          minHeight: '44px',
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: isSelected ? 'none' : '1.5px solid var(--border)',
                          background: isSelected ? 'var(--primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {isSelected && <Check size={14} color="white" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 500 }}>{s.first_name_th} {s.last_name_th}</span>
                          {s.nickname_th && <span style={{ color: '#9e9690' }}> ({s.nickname_th})</span>}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#9e9690' }}>
                          {s.grade}/{s.room}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. ประเภทเคส */}
            <div style={{ marginBottom: '20px' }}>
              <label className="label">ประเภทเคส *</label>
              {[
                { value: 'low_confidence', label: 'นักเรียนไม่มั่นใจในตัวเอง' },
                { value: 'feel_not_smart', label: 'นักเรียนรู้สึกว่าตัวเองเรียนไม่เก่ง' },
                { value: 'other', label: 'อื่นๆ' },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    background: caseType === value ? 'var(--lavender)' : 'transparent',
                    border: caseType === value ? '1px solid var(--primary-light)' : '1px solid transparent',
                    minHeight: '44px',
                  }}
                >
                  <input
                    type="radio"
                    name="caseType"
                    value={value}
                    checked={caseType === value}
                    onChange={() => setCaseType(value)}
                    style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.875rem' }}>{label}</span>
                </label>
              ))}

              {caseType === 'other' && (
                <input
                  className="input-field"
                  placeholder="ระบุประเภท..."
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  style={{ marginTop: '8px' }}
                  required={caseType === 'other'}
                />
              )}
            </div>

            {/* 3. รายละเอียด */}
            <div style={{ marginBottom: '20px' }}>
              <label className="label">รายละเอียดเพิ่มเติม</label>
              <textarea
                className="input-field"
                placeholder="เช่น สาเหตุ สิ่งที่สังเกตเห็น..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            {/* 4. วัน-เวลา */}
            <div style={{ marginBottom: '20px' }}>
              <label className="label">วัน-เวลา *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="date"
                  className="input-field"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                <input
                  type="time"
                  className="input-field"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  style={{ width: '120px' }}
                />
              </div>
            </div>

            {/* 5. เลือกผู้ดูแล */}
            <div style={{ marginBottom: '20px' }}>
              <label className="label">ผู้ดูแล *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {caretakers.map((c) => {
                  const isSelected = selectedCaretakers.some((sel) => sel.id === c.id);
                  const isMe = c.id === currentUser?.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCaretaker(c)}
                      className={`chip ${isSelected ? 'chip-lavender' : ''}`}
                      style={{
                        cursor: isMe ? 'default' : 'pointer',
                        border: isSelected ? '1px solid var(--primary-light)' : '1px solid var(--border)',
                        opacity: isMe && isSelected ? 0.8 : 1,
                        minHeight: '36px',
                        padding: '6px 12px',
                      }}
                    >
                      {isSelected && <Check size={14} />}
                      {c.name}
                      {isMe && ' (คุณ)'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--rose-text)',
                background: 'var(--rose)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
              }}>
                {error}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
                ยกเลิก
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกเคส'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
