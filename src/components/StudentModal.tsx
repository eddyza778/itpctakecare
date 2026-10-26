'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createStudent, updateStudent } from '@/lib/queries';
import type { Student } from '@/lib/types';

interface Props {
  student?: Student | null; // If provided, edit mode; else create mode
  onClose: () => void;
  onSaved: () => void;
}

export function StudentModal({ student, onClose, onSaved }: Props) {
  const isEdit = !!student;
  const [studentId, setStudentId] = useState(student?.student_id || '');
  const [firstName, setFirstName] = useState(student?.first_name_th || '');
  const [lastName, setLastName] = useState(student?.last_name_th || '');
  const [nickname, setNickname] = useState(student?.nickname_th || '');
  const [grade, setGrade] = useState(student?.grade || 'ม.1');
  const [room, setRoom] = useState(student?.room ? String(student.room) : '1');
  const [gender, setGender] = useState(student?.gender || 'ชาย');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('กรุณากรอกชื่อและนามสกุล');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (isEdit && student) {
        await updateStudent(student.id, {
          student_id: studentId.trim() || null,
          first_name_th: firstName.trim(),
          last_name_th: lastName.trim(),
          nickname_th: nickname.trim() || null,
          grade: grade.trim() || null,
          room: room ? parseInt(room, 10) : null,
          gender: gender || null,
        });
      } else {
        await createStudent({
          student_id: studentId.trim() || null,
          first_name_th: firstName.trim(),
          last_name_th: lastName.trim(),
          nickname_th: nickname.trim() || null,
          grade: grade.trim() || null,
          room: room ? parseInt(room, 10) : null,
          gender: gender || null,
        });
      }

      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลนักเรียนได้';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-content"
        style={{ maxWidth: '480px', padding: '24px' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            {isEdit ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#9e9690', display: 'flex' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* รหัสนักเรียน */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="student-id" className="label">รหัสนักเรียน</label>
            <input
              id="student-id"
              className="input-field"
              type="text"
              placeholder="เช่น 67001"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>

          {/* ชื่อ - นามสกุล */}
          <div style={rowStyle}>
            <div>
              <label htmlFor="student-first-name" className="label">
                ชื่อจริง <span style={{ color: 'var(--rose-text)' }}>*</span>
              </label>
              <input
                id="student-first-name"
                className="input-field"
                type="text"
                placeholder="ชื่อ"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="student-last-name" className="label">
                นามสกุล <span style={{ color: 'var(--rose-text)' }}>*</span>
              </label>
              <input
                id="student-last-name"
                className="input-field"
                type="text"
                placeholder="นามสกุล"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* ชื่อเล่น + เพศ */}
          <div style={rowStyle}>
            <div>
              <label htmlFor="student-nickname" className="label">ชื่อเล่น</label>
              <input
                id="student-nickname"
                className="input-field"
                type="text"
                placeholder="ชื่อเล่น"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="student-gender" className="label">เพศ</label>
              <select
                id="student-gender"
                className="input-field"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
          </div>

          {/* ชั้น + ห้อง */}
          <div style={{ ...rowStyle, marginBottom: '24px' }}>
            <div>
              <label htmlFor="student-grade" className="label">ระดับชั้น</label>
              <input
                id="student-grade"
                className="input-field"
                type="text"
                placeholder="เช่น ม.1"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="student-room" className="label">ห้อง</label>
              <input
                id="student-room"
                className="input-field"
                type="number"
                min="1"
                placeholder="1"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
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

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              ยกเลิก
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มนักเรียน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
