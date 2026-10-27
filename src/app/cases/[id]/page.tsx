'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Users,
  FileText,
  PenTool,
  Trash2,
  Edit,
  CheckCircle2,
  FileDown,
  Printer,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/date';
import { useAuth } from '@/lib/auth';
import { exportElementToPdf } from '@/lib/pdf';
import {
  getCaseById,
  updateCase,
  deleteCase,
  addCaseUpdate,
  addSignature,
  getCaretakers,
  getStudents,
  updateCaseStudents,
  updateCaseCaretakers,
} from '@/lib/queries';
import type { CaseWithRelations, Caretaker, Student } from '@/lib/types';
import { CASE_TYPE_LABELS } from '@/lib/types';
import { SignaturePad } from '@/components/SignaturePad';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EditCaseModal } from '@/components/EditCaseModal';

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { currentUser } = useAuth();
  const [caseData, setCaseData] = useState<CaseWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const caseReportRef = useRef<HTMLDivElement>(null);

  // Update form
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [activityNote, setActivityNote] = useState('');
  const [resultNote, setResultNote] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [markDone, setMarkDone] = useState(false);
  const [savingUpdate, setSavingUpdate] = useState(false);

  // Signature
  const [showSignature, setShowSignature] = useState(false);

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchCase = useCallback(async () => {
    try {
      const data = await getCaseById(id);
      setCaseData(data);
    } catch {
      setError('ไม่พบเคสนี้');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  const isCaretaker = caseData?.caretakers.some((c) => c.id === currentUser?.id);

  const handleUpdate = async () => {
    if (!activityNote.trim() && !resultNote.trim() && !nextStep.trim()) return;

    setSavingUpdate(true);
    try {
      await addCaseUpdate({
        case_id: id,
        caretaker_id: currentUser!.id,
        activity_note: activityNote.trim() || null,
        result_note: resultNote.trim() || null,
        next_step: nextStep.trim() || null,
      });

      if (markDone) {
        await updateCase(id, { status: 'done' });
      }

      setActivityNote('');
      setResultNote('');
      setNextStep('');
      setMarkDone(false);
      setShowUpdateForm(false);
      await fetchCase();
    } catch {
      setError('ไม่สามารถบันทึกการอัปเดตได้');
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleSignature = async (signerName: string, signerRole: string, signatureData: string) => {
    try {
      await addSignature({
        case_id: id,
        signer_name: signerName,
        signer_role: signerRole,
        signature_data: signatureData,
      });
      setShowSignature(false);
      await fetchCase();
    } catch {
      setError('ไม่สามารถบันทึกลายเซ็นได้');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCase(id);
      router.push('/');
    } catch {
      setError('ไม่สามารถลบเคสได้');
      setDeleting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!caseReportRef.current || !caseData) return;
    setExportingPdf(true);
    try {
      const typeLabel = caseData.case_type === 'other' ? caseData.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[caseData.case_type];
      const filename = `ITPC_เคส_${typeLabel.replace(/[\s\/]/g, '_')}`;
      await exportElementToPdf(caseReportRef.current, filename);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถส่งออก PDF ได้');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (error && !caseData) {
    return (
      <div className="empty-state">
        <p>{error}</p>
        <button onClick={() => router.push('/')} className="btn-secondary" style={{ marginTop: '12px' }}>
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  if (!caseData) return null;

  const typeLabel = caseData.case_type === 'other'
    ? caseData.other_text || 'อื่นๆ'
    : CASE_TYPE_LABELS[caseData.case_type];

  return (
    <div className="page-container" style={{ maxWidth: '860px', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 0',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <button
          onClick={() => router.back()}
          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: 'var(--foreground)' }}
        >
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0, flex: 1 }}>รายละเอียดเคส</h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="no-print"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--primary)',
            }}
            title="ส่งออก PDF"
          >
            <FileDown size={20} />
          </button>
          <button
            onClick={() => window.print()}
            className="no-print"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#9e9690',
            }}
            title="พิมพ์"
          >
            <Printer size={20} />
          </button>
          {isCaretaker && (
            <>
              <button
                onClick={() => setShowEditModal(true)}
                className="no-print"
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#9e9690' }}
                title="แก้ไข"
              >
                <Edit size={20} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="no-print"
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#d88a8a' }}
                title="ลบ"
              >
                <Trash2 size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 0' }}>
        {/* สถานะ + ประเภท */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className={`status-badge status-${caseData.status}`}>
              <span className="status-dot" />
              {caseData.status === 'planned' ? 'วางแผน' : 'เสร็จสิ้น'}
            </span>
            <span className="chip chip-peach" style={{ fontSize: '0.75rem' }}>
              {caseData.case_type === 'other' ? 'อื่นๆ' : CASE_TYPE_LABELS[caseData.case_type].replace('นักเรียน', '')}
            </span>
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
            {typeLabel}
          </h2>
        </div>

        {/* วันเวลา */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#8a8280', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} strokeWidth={1.8} />
            <span>เวลานัด: {safeFormatDate(caseData.scheduled_at, 'd MMMM yyyy เวลา HH:mm น.')}</span>
          </div>
          {(() => {
            const latestUpdate = caseData.updates[caseData.updates.length - 1]?.created_at || caseData.updated_at;
            if (latestUpdate && latestUpdate !== caseData.scheduled_at) {
              return (
                <span style={{ fontSize: '0.8125rem', color: '#9e9690' }}>
                  • อัปเดตจริง: {safeFormatDate(latestUpdate, 'd MMM yyyy เวลา HH:mm น.')}
                </span>
              );
            }
            return null;
          })()}
        </div>

        {/* รายละเอียด */}
        {caseData.details && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.8125rem', fontWeight: 500, color: '#8a8280' }}>
              <FileText size={14} />
              รายละเอียด
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, margin: 0, padding: '12px', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
              {caseData.details}
            </p>
          </div>
        )}

        {/* นักเรียน */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.8125rem', fontWeight: 500, color: '#8a8280' }}>
            <Users size={14} />
            นักเรียน ({caseData.students.length} คน)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {caseData.students.map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/students/${s.id}`)}
                className="chip chip-sky"
                style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}
              >
                {s.first_name_th} {s.last_name_th} ({s.nickname_th})
              </button>
            ))}
          </div>
        </div>

        {/* ผู้ดูแล */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#8a8280', marginBottom: '8px' }}>
            ผู้ดูแล
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {caseData.caretakers.map((c) => (
              <span key={c.id} className="chip chip-mint">
                {c.name}
                {c.id === caseData.created_by && ' (ผู้สร้าง)'}
              </span>
            ))}
          </div>
        </div>

        {/* ประวัติการอัปเดต */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} />
            ประวัติการดำเนินงาน
          </h3>

          {caseData.updates.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: '#b5aca6', padding: '16px 0' }}>
              ยังไม่มีบันทึกการดำเนินงาน
            </p>
          ) : (
            <div>
              {caseData.updates.map((u, i) => (
                <div
                  key={u.id}
                  style={{
                    padding: '14px 16px',
                    borderLeft: '2px solid var(--primary-light)',
                    marginLeft: '8px',
                    marginBottom: i < caseData.updates.length - 1 ? '4px' : 0,
                    background: 'var(--card-bg)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', color: '#9e9690' }}>
                    <span>{u.caretaker?.name || 'ผู้ดูแล'}</span>
                    <span>{safeFormatDate(u.created_at, 'd MMM yyyy HH:mm น.')}</span>
                  </div>
                  {u.activity_note && (
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#8a8280' }}>สิ่งที่ทำ: </span>
                      <span style={{ fontSize: '0.875rem' }}>{u.activity_note}</span>
                    </div>
                  )}
                  {u.result_note && (
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#8a8280' }}>ผลที่ได้: </span>
                      <span style={{ fontSize: '0.875rem' }}>{u.result_note}</span>
                    </div>
                  )}
                  {u.next_step && (
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#8a8280' }}>ขั้นตอนต่อไป: </span>
                      <span style={{ fontSize: '0.875rem' }}>{u.next_step}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ลายเซ็น */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PenTool size={16} />
            ลายเซ็น
          </h3>

          {caseData.signatures.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: '#b5aca6', padding: '8px 0' }}>
              ยังไม่มีลายเซ็น
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {caseData.signatures.map((sig) => (
                <div key={sig.id} className="card" style={{ padding: '12px', textAlign: 'center' }}>
                  <img
                    src={sig.signature_data}
                    alt={`ลายเซ็น ${sig.signer_name}`}
                    style={{ maxWidth: '100%', height: '60px', objectFit: 'contain', marginBottom: '8px' }}
                  />
                  <div style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{sig.signer_name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9e9690' }}>{sig.signer_role}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#b5aca6' }}>
                    {safeFormatDate(sig.signed_at, 'd MMM yyyy')}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowSignature(true)}
            className="btn-secondary"
            style={{ marginTop: '12px', width: '100%' }}
          >
            <PenTool size={16} />
            เพิ่มลายเซ็น
          </button>
        </div>

        {/* ปุ่มอัปเดตเคส (เฉพาะผู้ดูแลในเคส) */}
        {isCaretaker && !showUpdateForm && (
          <button
            onClick={() => setShowUpdateForm(true)}
            className="btn-primary"
            style={{ width: '100%', marginBottom: '16px' }}
          >
            อัปเดตเคส
          </button>
        )}

        {/* ฟอร์มอัปเดต */}
        {showUpdateForm && (
          <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '14px' }}>อัปเดตเคส</h3>

            <div style={{ marginBottom: '14px' }}>
              <label className="label">สิ่งที่ทำ</label>
              <textarea
                className="input-field"
                placeholder="เช่น พูดคุยกับนักเรียน..."
                value={activityNote}
                onChange={(e) => setActivityNote(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="label">ผลที่ได้</label>
              <textarea
                className="input-field"
                placeholder="เช่น นักเรียนรู้สึกดีขึ้น..."
                value={resultNote}
                onChange={(e) => setResultNote(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="label">ขั้นตอนต่อไป</label>
              <textarea
                className="input-field"
                placeholder="เช่น ติดตามผลอีกครั้ง..."
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
              />
            </div>

            {caseData.status === 'planned' && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={markDone}
                  onChange={(e) => setMarkDone(e.target.checked)}
                  style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                />
                เปลี่ยนสถานะเป็น &ldquo;เสร็จสิ้น&rdquo;
              </label>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowUpdateForm(false)} className="btn-secondary" style={{ flex: 1 }}>
                ยกเลิก
              </button>
              <button onClick={handleUpdate} className="btn-primary" style={{ flex: 1 }} disabled={savingUpdate}>
                {savingUpdate ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p style={{
            fontSize: '0.8125rem',
            color: 'var(--rose-text)',
            background: 'var(--rose)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
          }}>
            {error}
          </p>
        )}
      </div>

      {/* Signature Modal */}
      {showSignature && (
        <SignaturePad
          onClose={() => setShowSignature(false)}
          onSave={handleSignature}
        />
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="ลบเคสนี้?"
          message="เคสและข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบ ไม่สามารถกู้คืนได้"
          confirmLabel={deleting ? 'กำลังลบ...' : 'ลบเคส'}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditCaseModal
          caseData={caseData}
          onClose={() => setShowEditModal(false)}
          onUpdated={() => {
            setShowEditModal(false);
            fetchCase();
          }}
        />
      )}

      {/* Hidden Printable Report for PDF Export */}
      <div style={{ position: 'fixed', left: 0, top: 0, width: '760px', opacity: 0, pointerEvents: 'none', zIndex: -999 }}>
        <div
          ref={caseReportRef}
          style={{
            width: '760px',
            padding: '36px',
            backgroundColor: '#ffffff',
            color: '#111111',
            fontFamily: "'Noto Sans Thai', sans-serif",
            lineHeight: 1.6,
          }}
        >
          {/* Header */}
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
                itpctakecare — รายงานการดูแลนักเรียนรายเคส
              </h1>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                คณะเทคโนโลยีสารสนเทศและการสื่อสาร มหาวิทยาลัยเชียงใหม่
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#888' }}>
              พิมพ์เมื่อ: {format(new Date(), 'd MMMM yyyy HH:mm น.', { locale: th })}
            </div>
          </div>

          {/* Case Info Box */}
          <div
            style={{
              backgroundColor: '#f8f4fc',
              border: '1px solid #e0d5ec',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#5c3582' }}>
                {typeLabel}
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  backgroundColor: caseData.status === 'done' ? '#d4f0e7' : '#d6eaf8',
                  color: caseData.status === 'done' ? '#2e6b52' : '#2d5978',
                  fontWeight: 600,
                }}
              >
                สถานะ: {caseData.status === 'done' ? 'เสร็จสิ้น' : 'วางแผน'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px', marginTop: '10px' }}>
              <div>
                <strong>วัน-เวลานัด:</strong>{' '}
                {safeFormatDate(caseData.scheduled_at, 'd MMMM yyyy เวลา HH:mm น.')}
              </div>
              <div>
                <strong>ผู้ดูแล:</strong> {caseData.caretakers.map((c) => c.name).join(', ')}
              </div>
            </div>

            {caseData.details && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e8e0f0', fontSize: '12px' }}>
                <strong>รายละเอียด/ประเด็นปัญหา:</strong>
                <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-line' }}>{caseData.details}</p>
              </div>
            )}
          </div>

          {/* Students Involved */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 8px 0', color: '#444' }}>
              นักเรียนที่เกี่ยวข้อง ({caseData.students.length} คน)
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {caseData.students.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <strong>{s.first_name_th} {s.last_name_th}</strong> ({s.nickname_th || '-'})
                  <span style={{ color: '#666', marginLeft: '6px' }}>{s.grade}/{s.room}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Update History */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 10px 0', color: '#444' }}>
              ประวัติการดำเนินงาน
            </h3>
            {caseData.updates.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>ยังไม่มีบันทึกการดำเนินงาน</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {caseData.updates.map((u, i) => (
                  <div
                    key={u.id}
                    style={{
                      borderLeft: '3px solid #784ba3',
                      paddingLeft: '12px',
                      fontSize: '12px',
                      backgroundColor: '#fcfaf7',
                      padding: '8px 12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '10px', marginBottom: '4px' }}>
                      <span>ผู้บันทึก: {u.caretaker?.name || 'ผู้ดูแล'}</span>
                      <span>{safeFormatDate(u.created_at, 'd MMM yyyy HH:mm น.')}</span>
                    </div>
                    {u.activity_note && <div><strong>สิ่งที่ทำ:</strong> {u.activity_note}</div>}
                    {u.result_note && <div><strong>ผลที่ได้:</strong> {u.result_note}</div>}
                    {u.next_step && <div><strong>ขั้นตอนต่อไป:</strong> {u.next_step}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 10px 0', color: '#444' }}>
              ลายเซ็นรับรอง ({caseData.signatures.length})
            </h3>
            {caseData.signatures.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>ยังไม่มีลายเซ็น</p>
            ) : (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {caseData.signatures.map((sig) => (
                  <div
                    key={sig.id}
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      textAlign: 'center',
                      minWidth: '150px',
                    }}
                  >
                    <img
                      src={sig.signature_data}
                      alt=""
                      style={{ height: '48px', maxWidth: '140px', objectFit: 'contain', marginBottom: '6px' }}
                    />
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>{sig.signer_name}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>{sig.signer_role}</div>
                    <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                      {safeFormatDate(sig.signed_at, 'd MMM yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
