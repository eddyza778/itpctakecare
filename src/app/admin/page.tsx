'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  UserPlus,
  Edit,
  Archive,
  RotateCcw,
  Users,
  ShieldCheck,
  X,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  adminListCaretakers,
  adminCreateCaretaker,
  adminUpdateCaretaker,
  adminSetCaretakerClosed,
  adminListClosedStudents,
  setStudentClosed,
} from '@/lib/queries';
import type { CaretakerAccount, CaretakerRole, Student } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/types';
import { safeFormatDate } from '@/lib/date';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'caretakers' | 'closed_students'>('caretakers');
  const [caretakers, setCaretakers] = useState<CaretakerAccount[]>([]);
  const [closedStudents, setClosedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals for caretaker
  const [showModal, setShowModal] = useState(false);
  const [editingCaretaker, setEditingCaretaker] = useState<CaretakerAccount | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<CaretakerRole>('caretaker');
  const [formPin, setFormPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Confirm dialogs
  const [toggleCaretaker, setToggleCaretaker] = useState<{ account: CaretakerAccount; close: boolean } | null>(null);
  const [reopenStudent, setReopenStudent] = useState<Student | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser || !isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const [cList, sList] = await Promise.all([
        adminListCaretakers(currentUser.id),
        adminListClosedStudents(currentUser.id),
      ]);
      setCaretakers(cList);
      setClosedStudents(sList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลผู้ดูแลระบบได้');
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser && isAdmin) {
      loadData();
    }
  }, [currentUser, isAdmin, loadData]);

  if (!currentUser) return null;

  if (!isAdmin) {
    return (
      <div className="page-container" style={{ maxWidth: '520px', padding: '60px 20px', textAlign: 'center' }}>
        <ShieldAlert size={48} color="var(--rose-text)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 8px' }}>ไม่มีสิทธิ์เข้าถึง</h2>
        <p style={{ color: '#8a8280', fontSize: '0.875rem', margin: '0 0 20px' }}>
          หน้านี้สงวนไว้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น
        </p>
        <button onClick={() => router.push('/')} className="btn-secondary">
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  const openCreateModal = () => {
    setEditingCaretaker(null);
    setFormName('');
    setFormRole('caretaker');
    setFormPin('');
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (c: CaretakerAccount) => {
    setEditingCaretaker(c);
    setFormName(c.name);
    setFormRole(c.role);
    setFormPin('');
    setModalError('');
    setShowModal(true);
  };

  const handleSaveCaretaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setModalError('');

    if (!formName.trim()) {
      setModalError('กรุณากรอกชื่อ');
      return;
    }

    if (!editingCaretaker && (!formPin || formPin.length < 4)) {
      setModalError('PIN ต้องเป็นตัวเลข 4–6 หลัก');
      return;
    }

    if (editingCaretaker && formPin && formPin.length < 4) {
      setModalError('PIN ใหม่ต้องเป็นตัวเลข 4–6 หลัก');
      return;
    }

    setSaving(true);
    try {
      if (editingCaretaker) {
        await adminUpdateCaretaker(currentUser.id, editingCaretaker.id, {
          name: formName.trim(),
          role: formRole,
          newPin: formPin || null,
        });
        setSuccess('แก้ไขข้อมูลบัญชีเรียบร้อย');
      } else {
        await adminCreateCaretaker(currentUser.id, {
          name: formName.trim(),
          pin: formPin,
          role: formRole,
        });
        setSuccess('เพิ่มบัญชีผู้ดูแลใหม่เรียบร้อย');
      }
      setShowModal(false);
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCaretakerClosed = async () => {
    if (!toggleCaretaker || !currentUser) return;
    setActionLoading(true);
    try {
      await adminSetCaretakerClosed(currentUser.id, toggleCaretaker.account.id, toggleCaretaker.close);
      setToggleCaretaker(null);
      setSuccess(toggleCaretaker.close ? 'ปิดบัญชีเรียบร้อย' : 'เปิดใช้งานบัญชีอีกครั้งเรียบร้อย');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะบัญชีได้');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenStudent = async () => {
    if (!reopenStudent || !currentUser) return;
    setActionLoading(true);
    try {
      await setStudentClosed(currentUser.id, reopenStudent.id, false);
      setReopenStudent(null);
      setSuccess(`เปิดใช้งานนักเรียน ${reopenStudent.first_name_th} ${reopenStudent.last_name_th} เรียบร้อย`);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'ไม่สามารถเปิดใช้งานนักเรียนได้');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '820px', paddingBottom: '60px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 0',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--card-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: 'var(--primary-dark)' }}>
              จัดการระบบ
            </h1>
            <span
              className="chip"
              style={{
                fontSize: '0.6875rem',
                padding: '2px 8px',
                background: 'var(--peach)',
                color: 'var(--peach-text)',
                fontWeight: 600,
              }}
            >
              Admin
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9e9690', margin: '2px 0 0 0' }}>
            เพิ่ม/แก้ไข/ปิดบัญชีผู้ดูแล และเปิดใช้งานนักเรียนที่ถูกปิด
          </p>
        </div>

        {activeTab === 'caretakers' && (
          <button
            onClick={openCreateModal}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.8125rem', height: '38px', minHeight: '38px' }}
          >
            <UserPlus size={16} />
            เพิ่มผู้ดูแล
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', padding: '16px 0 8px', borderBottom: '1px solid var(--border-light)' }}>
        <button
          onClick={() => setActiveTab('caretakers')}
          style={{
            padding: '8px 16px',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'caretakers' ? 600 : 500,
            color: activeTab === 'caretakers' ? 'var(--primary-dark)' : '#7a706b',
            background: activeTab === 'caretakers' ? 'var(--lavender)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <ShieldCheck size={16} />
          บัญชีผู้ดูแล ({caretakers.length})
        </button>

        <button
          onClick={() => setActiveTab('closed_students')}
          style={{
            padding: '8px 16px',
            fontSize: '0.875rem',
            fontWeight: activeTab === 'closed_students' ? 600 : 500,
            color: activeTab === 'closed_students' ? 'var(--primary-dark)' : '#7a706b',
            background: activeTab === 'closed_students' ? 'var(--lavender)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Archive size={16} />
          นักเรียนที่ปิด ({closedStudents.length})
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--rose)', color: 'var(--rose-text)', borderRadius: 'var(--radius-sm)', marginTop: '16px', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 14px', background: 'var(--mint)', color: 'var(--mint-text)', borderRadius: 'var(--radius-sm)', marginTop: '16px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {/* Tab 1: Caretakers */}
      {activeTab === 'caretakers' && (
        <div style={{ marginTop: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div className="spinner" />
            </div>
          ) : caretakers.length === 0 ? (
            <div className="empty-state">
              <Users size={40} style={{ margin: '0 auto 12px', color: '#b5aca6' }} />
              <p>ยังไม่มีบัญชีผู้ดูแล</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {caretakers.map((c) => {
                const isClosed = !!c.closed_at;
                const isMe = c.id === currentUser.id;

                return (
                  <div
                    key={c.id}
                    className="card"
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      opacity: isClosed ? 0.6 : 1,
                      background: isClosed ? 'var(--border-light)' : '#ffffff',
                      border: isClosed ? '1px dashed var(--border)' : '1px solid var(--border)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: isClosed ? '#7a706b' : 'var(--foreground)' }}>
                          {c.name}
                        </span>
                        {isMe && (
                          <span className="chip chip-cream" style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>
                            บัญชีคุณ
                          </span>
                        )}
                        <span
                          className="chip"
                          style={{
                            fontSize: '0.6875rem',
                            padding: '2px 8px',
                            background: c.role === 'admin' ? 'var(--peach)' : 'var(--sky)',
                            color: c.role === 'admin' ? 'var(--peach-text)' : 'var(--sky-text)',
                            fontWeight: 600,
                          }}
                        >
                          {ROLE_LABELS[c.role]}
                        </span>
                        {isClosed ? (
                          <span
                            className="chip"
                            style={{
                              fontSize: '0.6875rem',
                              padding: '2px 8px',
                              background: 'var(--rose)',
                              color: 'var(--rose-text)',
                              fontWeight: 600,
                            }}
                          >
                            ปิดใช้งานแล้ว
                          </span>
                        ) : (
                          <span
                            className="chip"
                            style={{
                              fontSize: '0.6875rem',
                              padding: '2px 8px',
                              background: 'var(--mint)',
                              color: 'var(--mint-text)',
                            }}
                          >
                            ใช้งานอยู่
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#9e9690' }}>
                        {isClosed ? (
                          <span>ปิดเมื่อ: {safeFormatDate(c.closed_at, 'd MMM yyyy HH:mm น.')}</span>
                        ) : (
                          <span>สร้างเมื่อ: {safeFormatDate(c.created_at, 'd MMM yyyy')}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        disabled={isClosed}
                        style={{
                          border: '1px solid var(--border)',
                          background: 'var(--card-bg)',
                          cursor: isClosed ? 'not-allowed' : 'pointer',
                          padding: '7px 10px',
                          color: '#6e6560',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.8125rem',
                          opacity: isClosed ? 0.5 : 1,
                        }}
                        title="แก้ไขบัญชี / รีเซ็ต PIN"
                      >
                        <Edit size={15} />
                        แก้ไข
                      </button>

                      {isClosed ? (
                        <button
                          type="button"
                          onClick={() => setToggleCaretaker({ account: c, close: false })}
                          className="btn-primary"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8125rem',
                            minHeight: '34px',
                            height: '34px',
                            background: 'var(--mint-text)',
                          }}
                          title="เปิดใช้งานอีกครั้ง"
                        >
                          <RotateCcw size={15} />
                          เปิดคืน
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setToggleCaretaker({ account: c, close: true })}
                          disabled={isMe}
                          style={{
                            border: '1px solid var(--border)',
                            background: 'var(--card-bg)',
                            cursor: isMe ? 'not-allowed' : 'pointer',
                            padding: '7px 10px',
                            color: isMe ? '#ccc' : '#d88a8a',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8125rem',
                            opacity: isMe ? 0.4 : 1,
                          }}
                          title={isMe ? 'ไม่สามารถปิดบัญชีของตนเองได้' : 'ปิดบัญชีนี้'}
                        >
                          <Archive size={15} />
                          ปิดบัญชี
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Closed Students */}
      {activeTab === 'closed_students' && (
        <div style={{ marginTop: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div className="spinner" />
            </div>
          ) : closedStudents.length === 0 ? (
            <div className="empty-state">
              <Archive size={40} style={{ margin: '0 auto 12px', color: '#b5aca6' }} />
              <p>ไม่มีนักเรียนที่ถูกปิดใช้งาน</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {closedStudents.map((s) => (
                <div
                  key={s.id}
                  className="card"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: 'var(--border-light)',
                    border: '1px dashed var(--border)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#555' }}>
                        {s.first_name_th} {s.last_name_th}
                      </span>
                      {s.nickname_th && (
                        <span className="chip chip-cream" style={{ fontSize: '0.6875rem', padding: '1px 6px' }}>
                          ชื่อเล่น: {s.nickname_th}
                        </span>
                      )}
                      <span className="chip chip-sky" style={{ fontSize: '0.6875rem', padding: '2px 8px' }}>
                        {s.grade ? `${s.grade}/${s.room || 1}` : 'ไม่ระบุห้อง'}
                      </span>
                      {s.student_id && (
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>
                          รหัส {s.student_id}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#8a8280' }}>
                      ปิดเมื่อ: {safeFormatDate(s.closed_at, 'd MMMM yyyy เวลา HH:mm น.')}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReopenStudent(s)}
                    className="btn-primary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8125rem',
                      minHeight: '34px',
                      height: '34px',
                      background: 'var(--mint-text)',
                    }}
                  >
                    <RotateCcw size={15} />
                    เปิดใช้งานอีกครั้ง
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Caretaker Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                {editingCaretaker ? 'แก้ไขบัญชีผู้ดูแล' : 'เพิ่มผู้ดูแลใหม่'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#9e9690' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCaretaker}>
              <div style={{ marginBottom: '16px' }}>
                <label className="label" htmlFor="ct-name">
                  ชื่อผู้ดูแล <span style={{ color: 'var(--rose-text)' }}>*</span>
                </label>
                <input
                  id="ct-name"
                  className="input-field"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น ครูสมชาย"
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="label" htmlFor="ct-role">
                  บทบาท / Role <span style={{ color: 'var(--rose-text)' }}>*</span>
                </label>
                <select
                  id="ct-role"
                  className="input-field"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as CaretakerRole)}
                  disabled={editingCaretaker?.id === currentUser.id}
                >
                  <option value="caretaker">ครูผู้ดูแล (Caretaker)</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                </select>
                {editingCaretaker?.id === currentUser.id && (
                  <p style={{ fontSize: '0.75rem', color: '#9e9690', margin: '4px 0 0' }}>
                    ไม่สามารถเปลี่ยน role ของตัวเองได้
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="label" htmlFor="ct-pin" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <KeyRound size={14} />
                  {editingCaretaker ? 'รีเซ็ต PIN ใหม่ (เว้นว่างถ้าไม่ต้องการเปลี่ยน)' : 'ตั้ง PIN (4–6 หลัก)'}
                  {!editingCaretaker && <span style={{ color: 'var(--rose-text)' }}>*</span>}
                </label>
                <input
                  id="ct-pin"
                  className="input-field"
                  type="password"
                  inputMode="numeric"
                  placeholder="ตัวเลข 4–6 หลัก"
                  value={formPin}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setFormPin(v);
                  }}
                  required={!editingCaretaker}
                />
              </div>

              {modalError && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--rose-text)', background: 'var(--rose)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                  {modalError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'กำลังบันทึก...' : editingCaretaker ? 'บันทึกการแก้ไข' : 'สร้างบัญชี'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Caretaker Close / Reopen */}
      {toggleCaretaker && (
        <ConfirmDialog
          title={toggleCaretaker.close ? `ปิดบัญชี ${toggleCaretaker.account.name}?` : `เปิดใช้งานบัญชี ${toggleCaretaker.account.name}?`}
          message={
            toggleCaretaker.close
              ? 'บัญชีนี้จะไม่สามารถเข้าสู่ระบบได้ และจะไม่ปรากฏในรายชื่อผู้ดูแลสำหรับสร้างเคส'
              : 'บัญชีนี้จะกลับมาเข้าสู่ระบบและร่วมดูแลเคสได้ตามปกติ'
          }
          confirmLabel={actionLoading ? 'กำลังดำเนินการ...' : toggleCaretaker.close ? 'ปิดบัญชี' : 'เปิดใช้งาน'}
          onConfirm={handleToggleCaretakerClosed}
          onCancel={() => setToggleCaretaker(null)}
        />
      )}

      {/* Confirm Reopen Student */}
      {reopenStudent && (
        <ConfirmDialog
          title={`เปิดใช้งานนักเรียน ${reopenStudent.first_name_th} ${reopenStudent.last_name_th}?`}
          message="นักเรียนจะกลับมาแสดงในรายชื่อนักเรียนและสามารถสร้างเคสใหม่หรือติดตามต่อได้ตามปกติ"
          confirmLabel={actionLoading ? 'กำลังดำเนินการ...' : 'เปิดใช้งาน'}
          onConfirm={handleReopenStudent}
          onCancel={() => setReopenStudent(null)}
        />
      )}
    </div>
  );
}
