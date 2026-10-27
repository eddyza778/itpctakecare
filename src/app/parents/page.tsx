'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  HeartHandshake,
  Search,
  Phone,
  User,
  GraduationCap,
  ChevronRight,
  Filter,
  UserCheck,
} from 'lucide-react';
import { getStudents } from '@/lib/queries';
import type { Student } from '@/lib/types';

export default function ParentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');

  useEffect(() => {
    getStudents()
      .then((data) => {
        setStudents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching students for parents directory:', err);
        setLoading(false);
      });
  }, []);

  const grades = useMemo(() => {
    return [...new Set(students.map((s) => s.grade).filter(Boolean))].sort() as string[];
  }, [students]);

  const rooms = useMemo(() => {
    return [
      ...new Set(
        students
          .filter((s) => !gradeFilter || s.grade === gradeFilter)
          .map((s) => s.room)
          .filter((r) => r !== null)
      ),
    ].sort() as number[];
  }, [students, gradeFilter]);

  // สร้างข้อมูลจำลองความสัมพันธ์ผู้ปกครองสำหรับนักเรียนที่มีในระบบ
  const parentRecords = useMemo(() => {
    return students.map((s, idx) => {
      const parentTypes = ['บิดา', 'มารดา', 'ผู้ปกครอง'];
      const pType = parentTypes[idx % 3];
      const parentName = `${pType === 'บิดา' ? 'นาย' : 'นาง'} ${s.last_name_th || 'สมบูรณ์'} (ผู้ปกครอง ${s.nickname_th ? `น้อง${s.nickname_th}` : ''})`.trim();
      const phone = `08${(idx + 1).toString().padStart(2, '0')}-${123 + idx}-${4567 + idx}`;

      return {
        id: `parent-${s.id}`,
        student: s,
        parentName,
        relation: pType,
        phone,
        emergencyPhone: `053-94${1000 + (idx % 100)}`,
        email: `parent.${s.student_id || idx}@satitcmu.ac.th`,
      };
    });
  }, [students]);

  const filtered = useMemo(() => {
    return parentRecords.filter((rec) => {
      const s = rec.student;
      if (gradeFilter && s.grade !== gradeFilter) return false;
      if (roomFilter && s.room !== Number(roomFilter)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const studentMatch =
          s.first_name_th?.toLowerCase().includes(q) ||
          s.last_name_th?.toLowerCase().includes(q) ||
          s.nickname_th?.toLowerCase().includes(q) ||
          s.student_id?.includes(q);
        const parentMatch =
          rec.parentName.toLowerCase().includes(q) ||
          rec.phone.includes(q);
        if (!studentMatch && !parentMatch) return false;
      }
      return true;
    });
  }, [parentRecords, gradeFilter, roomFilter, search]);

  return (
    <div className="page-container page-container-fluid" style={{ maxWidth: '100%', width: '100%', padding: '24px 28px 48px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-dark)', marginBottom: '4px' }}>
          <HeartHandshake size={22} />
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            ข้อมูลผู้ปกครอง
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          ระบบสมุดโทรศัพท์และข้อมูลการติดต่อผู้ปกครอง โรงเรียนสาธิตมหาวิทยาลัยเชียงใหม่
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          background: 'var(--surface)',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
            }}
          />
          <input
            type="text"
            className="input-field"
            placeholder="ค้นหาชื่อผู้ปกครอง, นักเรียน, หรือเบอร์โทร..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '42px', margin: 0 }}
          />
        </div>

        {/* Grade filter */}
        <select
          className="input-field"
          value={gradeFilter}
          onChange={(e) => {
            setGradeFilter(e.target.value);
            setRoomFilter('');
          }}
          style={{ width: 'auto', minWidth: '130px', height: '42px', margin: 0 }}
        >
          <option value="">ทุกระดับชั้น</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              ชั้น {g}
            </option>
          ))}
        </select>

        {/* Room filter */}
        <select
          className="input-field"
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          style={{ width: 'auto', minWidth: '100px', height: '42px', margin: 0 }}
        >
          <option value="">ทุกห้อง</option>
          {rooms.map((r) => (
            <option key={r} value={r}>
              ห้อง {r}
            </option>
          ))}
        </select>

        {(search || gradeFilter || roomFilter) && (
          <button
            onClick={() => {
              setSearch('');
              setGradeFilter('');
              setRoomFilter('');
            }}
            className="btn-secondary"
            style={{ height: '42px', padding: '0 14px', fontSize: '0.813rem' }}
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Stats summary */}
      <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', marginBottom: '14px', fontWeight: 500 }}>
        พบข้อมูลผู้ปกครองทั้งหมด {filtered.length} รายการ
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            background: 'var(--surface)',
          }}
        >
          <UserCheck size={42} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
            ไม่พบข้อมูลผู้ปกครองที่ตรงกับเงื่อนไข
          </p>
          <p style={{ margin: 0, fontSize: '0.813rem' }}>
            ลองเปลี่ยนคำค้นหา หรือเลือกชั้นเรียนอื่น
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '14px',
          }}
        >
          {filtered.map((rec) => {
            const s = rec.student;
            const studentFullName = `${s.first_name_th || ''} ${s.last_name_th || ''}`.trim() || 'ไม่ระบุชื่อ';

            return (
              <div
                key={rec.id}
                className="card"
                style={{
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  transition: 'all 0.18s ease',
                }}
              >
                {/* Parent info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        color: 'var(--primary-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        flexShrink: 0,
                      }}
                    >
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.938rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {rec.parentName}
                      </div>
                      <span
                        style={{
                          fontSize: '0.688rem',
                          background: 'var(--border-light)',
                          color: 'var(--primary-dark)',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 500,
                        }}
                      >
                        {rec.relation}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact phone */}
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'var(--background)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.813rem' }}>
                    <Phone size={14} color="var(--primary)" />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rec.phone}</span>
                  </div>
                  <a
                    href={`tel:${rec.phone.replace(/-/g, '')}`}
                    className="btn-secondary"
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      minHeight: '28px',
                      borderRadius: '4px',
                      textDecoration: 'none',
                    }}
                  >
                    โทรออก
                  </a>
                </div>

                {/* Student linkage card */}
                <button
                  type="button"
                  onClick={() => router.push(`/students/${s.id}`)}
                  style={{
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GraduationCap size={16} color="var(--primary)" />
                    <div>
                      <div style={{ fontSize: '0.813rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        นักเรียน: {studentFullName} {s.nickname_th ? `(${s.nickname_th})` : ''}
                      </div>
                      <div style={{ fontSize: '0.688rem', color: 'var(--text-secondary)' }}>
                        {s.grade ? `ชั้น ${s.grade}` : ''} {s.room ? `ห้อง ${s.room}` : ''}{' '}
                        {s.student_id ? `• รหัส ${s.student_id}` : ''}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-secondary)" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
