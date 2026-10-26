'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileSpreadsheet,
  FileDown,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/date';
import { getStudentById, getStudentCases, deleteStudent } from '@/lib/queries';
import type { Student, CaseWithRelations } from '@/lib/types';
import { CASE_TYPE_LABELS } from '@/lib/types';
import { StudentModal } from '@/components/StudentModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CreateCaseModal } from '@/components/CreateCaseModal';
import { exportStudentCasesToExcel } from '@/lib/excel';
import { exportElementToPdf } from '@/lib/pdf';

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [student, setStudent] = useState<Student | null>(null);
  const [cases, setCases] = useState<CaseWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateCaseModal, setShowCreateCaseModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Report print ref
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchStudentData = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([getStudentById(id), getStudentCases(id)]);
      setStudent(s);
      setCases(c);
    } catch {
      setError('ไม่พบข้อมูลนักเรียนคนนี้');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteStudent(id);
      router.push('/students');
    } catch {
      setError('ไม่สามารถลบข้อมูลนักเรียนได้');
      setDeleting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!reportRef.current || !student) return;
    setExportingPdf(true);
    try {
      const filename = `ITPC_รายงานนักเรียน_${student.first_name_th}_${student.last_name_th}`;
      await exportElementToPdf(reportRef.current, filename);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถส่งออก PDF ได้');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = () => {
    if (!student) return;
    exportStudentCasesToExcel(student, cases);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="empty-state">
        <p>{error}</p>
        <button onClick={() => router.push('/students')} className="btn-secondary" style={{ marginTop: '12px' }}>
          กลับหน้ารายชื่อนักเรียน
        </button>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="page-container" style={{ maxWidth: '860px', paddingBottom: '40px' }}>
      {/* Header */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 0',
          borderBottom: '1px solid var(--border-light)',
          background: 'var(--card-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push('/students')}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: 'var(--foreground)' }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0, flex: 1 }}>ประวัตินักเรียน</h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setShowEditModal(true)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: '#9e9690' }}
            title="แก้ไขข้อมูลนักเรียน"
          >
            <Edit size={19} />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px', color: '#d88a8a' }}
            title="ลบนักเรียน"
          >
            <Trash2 size={19} />
          </button>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Student Profile Card */}
        <div
          className="card"
          style={{
            padding: '20px',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #ffffff 0%, var(--lavender) 100%)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {student.first_name_th ? student.first_name_th.slice(0, 1) : <User size={24} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
                {student.first_name_th} {student.last_name_th}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                {student.nickname_th && (
                  <span className="chip chip-cream" style={{ fontSize: '0.75rem' }}>
                    ชื่อเล่น: {student.nickname_th}
                  </span>
                )}
                {student.gender && (
                  <span className="chip chip-sky" style={{ fontSize: '0.75rem' }}>
                    {student.gender}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              fontSize: '0.8125rem',
            }}
          >
            <div>
              <span style={{ color: '#8a8280', display: 'block', fontSize: '0.6875rem' }}>รหัสนักเรียน</span>
              <span style={{ fontWeight: 500 }}>{student.student_id || '-'}</span>
            </div>
            <div>
              <span style={{ color: '#8a8280', display: 'block', fontSize: '0.6875rem' }}>ระดับชั้น/ห้อง</span>
              <span style={{ fontWeight: 500 }}>{student.grade ? `${student.grade}/${student.room || 1}` : '-'}</span>
            </div>
            <div>
              <span style={{ color: '#8a8280', display: 'block', fontSize: '0.6875rem' }}>เคสทั้งหมด</span>
              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{cases.length} เคส</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar (Export PDF & Excel) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="btn-primary"
            style={{ flex: 1, minWidth: '140px', fontSize: '0.8125rem', padding: '9px 12px' }}
          >
            <FileDown size={16} />
            {exportingPdf ? 'กำลังสร้าง PDF...' : 'ส่งออก PDF สรุป'}
          </button>
          <button
            onClick={handleExportExcel}
            className="btn-secondary"
            style={{ flex: 1, minWidth: '130px', fontSize: '0.8125rem', padding: '9px 12px' }}
          >
            <FileSpreadsheet size={16} />
            ส่งออก Excel
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary"
            style={{ width: '44px', padding: '9px', justifyContent: 'center' }}
            title="พิมพ์หน้านี้"
          >
            <Printer size={16} />
          </button>
        </div>

        {/* Section Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={17} color="var(--primary)" />
            ประวัติการดูแลรายเคส ({cases.length})
          </h3>
          <button
            onClick={() => setShowCreateCaseModal(true)}
            className="no-print"
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--primary)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={14} />
            เปิดเคสใหม่
          </button>
        </div>

        {/* Cases Timeline */}
        {cases.length === 0 ? (
          <div className="card" style={{ padding: '32px 16px', textAlign: 'center' }}>
            <AlertCircle size={36} color="#b5aca6" style={{ margin: '0 auto 8px auto' }} />
            <p style={{ margin: '0 0 12px 0', fontSize: '0.875rem', color: '#8a8280' }}>
              ยังไม่มีประวัติการดูแลสำหรับนักเรียนคนนี้
            </p>
            <button
              onClick={() => setShowCreateCaseModal(true)}
              className="btn-primary"
              style={{ fontSize: '0.8125rem', padding: '8px 16px' }}
            >
              <Plus size={15} />
              บันทึกเคสแรก
            </button>
          </div>
        ) : (
          <div className="cases-grid">
            {cases.map((c) => {
              const typeLabel =
                c.case_type === 'other' ? c.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[c.case_type];
              const latestUpdate =
                c.updates && c.updates.length > 0 ? c.updates[c.updates.length - 1] : null;

              return (
                <div
                  key={c.id}
                  onClick={() => router.push(`/cases/${c.id}`)}
                  className="card"
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`status-badge status-${c.status}`}>
                        <span className="status-dot" />
                        {c.status === 'planned' ? 'วางแผน' : 'เสร็จสิ้น'}
                      </span>
                      <span className="chip chip-peach" style={{ fontSize: '0.6875rem' }}>
                        {c.case_type === 'other' ? 'อื่นๆ' : CASE_TYPE_LABELS[c.case_type].replace('นักเรียน', '')}
                      </span>
                    </div>
                    <ChevronRight size={18} color="#9e9690" />
                  </div>

                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 6px 0', lineHeight: 1.4 }}>
                    {typeLabel}
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#8a8280', marginBottom: '8px' }}>
                    <Clock size={13} />
                    {safeFormatDate(c.scheduled_at, 'd MMMM yyyy เวลา HH:mm น.')}
                  </div>

                  {c.details && (
                    <p
                      style={{
                        fontSize: '0.8125rem',
                        lineHeight: 1.5,
                        color: '#555',
                        margin: '0 0 8px 0',
                        background: 'var(--cream)',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      {c.details}
                    </p>
                  )}

                  {/* ผู้ดูแล */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '0.75rem', marginBottom: '8px' }}>
                    <span style={{ color: '#8a8280' }}>ผู้ดูแล:</span>
                    {c.caretakers.map((ct) => (
                      <span key={ct.id} className="chip chip-mint" style={{ fontSize: '0.6875rem' }}>
                        {ct.name}
                      </span>
                    ))}
                  </div>

                  {/* ความคืบหน้าล่าสุด & ลายเซ็น */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.6875rem',
                      color: '#9e9690',
                      borderTop: '1px solid var(--border-light)',
                      paddingTop: '8px',
                    }}
                  >
                    <span>
                      {latestUpdate
                        ? `อัปเดตล่าสุด: ${safeFormatDate(latestUpdate.created_at, 'd MMM yyyy')}`
                        : 'ยังไม่มีบันทึกดำเนินงาน'}
                    </span>
                    <span>
                      {c.signatures.length > 0 ? (
                        <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>
                          ✓ เซ็นแล้ว ({c.signatures.length})
                        </span>
                      ) : (
                        'ยังไม่เซ็น'
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden / Report Template for Clean PDF Export (Guaranteed Thai Typography) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div
          ref={reportRef}
          style={{
            width: '760px',
            padding: '36px',
            backgroundColor: '#ffffff',
            color: '#111111',
            fontFamily: "'Noto Sans Thai', sans-serif",
            lineHeight: 1.6,
          }}
        >
          {/* PDF Report Header */}
          <div
            style={{
              borderBottom: '2px solid #784ba3',
              paddingBottom: '16px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: '#784ba3' }}>
                ITPC Techcare — รายงานประวัติการดูแลนักเรียนรายเคส
              </h1>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยเชียงใหม่
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#888' }}>
              พิมพ์เมื่อ: {format(new Date(), 'd MMMM yyyy HH:mm น.', { locale: th })}
            </div>
          </div>

          {/* Student Profile in PDF */}
          <div
            style={{
              backgroundColor: '#f8f4fc',
              border: '1px solid #e0d5ec',
              borderRadius: '6px',
              padding: '14px 18px',
              marginBottom: '24px',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 10px 0', color: '#5c3582' }}>
              ข้อมูลนักเรียน
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div>
                <strong>ชื่อ-นามสกุล:</strong> {student.first_name_th} {student.last_name_th}
              </div>
              <div>
                <strong>ชื่อเล่น:</strong> {student.nickname_th || '-'}
              </div>
              <div>
                <strong>รหัสนักเรียน:</strong> {student.student_id || '-'}
              </div>
              <div>
                <strong>ชั้น/ห้อง:</strong> {student.grade ? `${student.grade}/${student.room || 1}` : '-'}
              </div>
            </div>
          </div>

          {/* Cases List in PDF */}
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: '#333' }}>
            ประวัติการดูแล ({cases.length} เคส)
          </h3>

          {cases.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>ไม่มีประวัติเคส</p>
          ) : (
            cases.map((c, idx) => {
              const typeLabel =
                c.case_type === 'other' ? c.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[c.case_type];
              return (
                <div
                  key={c.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '14px',
                    marginBottom: '14px',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#784ba3' }}>
                      {idx + 1}. {typeLabel}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: c.status === 'done' ? '#d4f0e7' : '#d6eaf8',
                        color: c.status === 'done' ? '#2e6b52' : '#2d5978',
                      }}
                    >
                      {c.status === 'done' ? 'เสร็จสิ้น' : 'วางแผน'}
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                    <strong>วัน-เวลา:</strong>{' '}
                    {safeFormatDate(c.scheduled_at, 'd MMMM yyyy เวลา HH:mm น.')} |{' '}
                    <strong>ผู้ดูแล:</strong> {c.caretakers.map((ct) => ct.name).join(', ')}
                  </div>

                  {c.details && (
                    <div style={{ fontSize: '12px', marginBottom: '8px', backgroundColor: '#fcfaf7', padding: '6px 8px' }}>
                      <strong>รายละเอียด:</strong> {c.details}
                    </div>
                  )}

                  {/* Updates */}
                  {c.updates && c.updates.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px dashed #eee', paddingTop: '8px' }}>
                      <strong style={{ fontSize: '11px', color: '#444' }}>ประวัติการดำเนินงาน:</strong>
                      {c.updates.map((u) => (
                        <div key={u.id} style={{ fontSize: '11px', margin: '4px 0 4px 10px', color: '#333' }}>
                          • {u.activity_note ? `สิ่งที่ทำ: ${u.activity_note} ` : ''}
                          {u.result_note ? `| ผล: ${u.result_note} ` : ''}
                          {u.next_step ? `| ต่อไป: ${u.next_step}` : ''}
                          <span style={{ color: '#888', marginLeft: '6px' }}>
                            ({u.caretaker?.name || 'ผู้ดูแล'},{' '}
                            {safeFormatDate(u.created_at, 'd MMM yy')})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Signatures */}
                  {c.signatures && c.signatures.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {c.signatures.map((sig) => (
                        <div
                          key={sig.id}
                          style={{
                            border: '1px solid #eee',
                            borderRadius: '4px',
                            padding: '6px 10px',
                            textAlign: 'center',
                            fontSize: '10px',
                          }}
                        >
                          <img
                            src={sig.signature_data}
                            alt=""
                            style={{ height: '36px', maxWidth: '100px', objectFit: 'contain' }}
                          />
                          <div><strong>{sig.signer_name}</strong></div>
                          <div style={{ color: '#666' }}>{sig.signer_role}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Student Modal */}
      {showEditModal && (
        <StudentModal
          student={student}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            fetchStudentData();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={`ลบนักเรียน ${student.first_name_th} ${student.last_name_th}?`}
          message="ข้อมูลนักเรียนและการเชื่อมโยงเคสจะถูกลบทั้งหมด ยืนยันการลบ?"
          confirmLabel={deleting ? 'กำลังลบ...' : 'ลบนักเรียน'}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Create Case for Student Modal */}
      {showCreateCaseModal && (
        <CreateCaseModal
          onClose={() => setShowCreateCaseModal(false)}
          onCreated={() => {
            setShowCreateCaseModal(false);
            fetchStudentData();
          }}
        />
      )}
    </div>
  );
}
