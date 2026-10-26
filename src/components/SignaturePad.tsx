'use client';

import { useRef, useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import SignaturePadLib from 'signature_pad';

interface Props {
  onClose: () => void;
  onSave: (signerName: string, signerRole: string, signatureData: string) => void;
}

export function SignaturePad({ onClose, onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('นักเรียน');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ปรับขนาด canvas ให้ตรงกับ container
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = parent.clientWidth * ratio;
      canvas.height = 200 * ratio;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = '200px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(ratio, ratio);
      if (padRef.current) padRef.current.clear();
    };

    padRef.current = new SignaturePadLib(canvas, {
      penColor: '#3d3536',
      backgroundColor: '#ffffff',
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      padRef.current?.off();
    };
  }, []);

  const handleClear = () => padRef.current?.clear();

  const handleSave = async () => {
    if (!signerName.trim()) return;
    if (padRef.current?.isEmpty()) return;

    setSaving(true);
    const data = padRef.current!.toDataURL('image/png');
    await onSave(signerName.trim(), signerRole, data);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-light)',
        }}>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0 }}>เพิ่มลายเซ็น</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#9e9690' }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <label className="label">ชื่อผู้เซ็น *</label>
            <input
              className="input-field"
              placeholder="เช่น สมชาย ใจดี"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label className="label">บทบาท *</label>
            <select
              className="input-field"
              value={signerRole}
              onChange={(e) => setSignerRole(e.target.value)}
            >
              <option value="นักเรียน">นักเรียน</option>
              <option value="ผู้ปกครอง">ผู้ปกครอง</option>
              <option value="ผู้ดูแล">ผู้ดูแล</option>
              <option value="ครู">ครู</option>
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="label" style={{ margin: 0 }}>ลายเซ็น *</label>
              <button
                type="button"
                onClick={handleClear}
                style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', color: '#9e9690' }}
              >
                <RotateCcw size={14} />
                ล้าง
              </button>
            </div>
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              touchAction: 'none',
            }}>
              <canvas ref={canvasRef} style={{ display: 'block', cursor: 'crosshair' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#b5aca6', marginTop: '4px' }}>
              วาดลายเซ็นด้วยนิ้วหรือเมาส์
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              style={{ flex: 1 }}
              disabled={saving || !signerName.trim()}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกลายเซ็น'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
