'use client';

import { useState } from 'react';
import { UserCircle2, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { updateOwnProfile } from '@/lib/queries';
import { ROLE_LABELS } from '@/lib/types';

export default function ProfilePage() {
  const { currentUser, login } = useAuth();
  const [name, setName] = useState(currentUser?.name || '');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!currentUser) return null;

  const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 6);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) return setError('กรุณากรอกชื่อ');
    if (currentPin.length < 4) return setError('กรุณากรอก PIN ปัจจุบันเพื่อยืนยัน');
    if (newPin && newPin.length < 4) return setError('PIN ใหม่ต้องมี 4–6 หลัก');
    if (newPin !== confirmPin) return setError('ยืนยัน PIN ใหม่ไม่ตรงกัน');

    setSaving(true);
    try {
      const res = await updateOwnProfile({
        caretakerId: currentUser.id,
        currentPin,
        name: name.trim(),
        newPin: newPin || null,
      });
      if (!res.success) {
        setError(res.message || 'บันทึกไม่สำเร็จ');
        return;
      }
      login({ ...currentUser, name: name.trim() });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setSuccess(newPin ? 'บันทึกชื่อและเปลี่ยน PIN เรียบร้อย' : 'บันทึกข้อมูลเรียบร้อย');
    } catch (err: unknown) {
      console.error('Update profile error:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '520px', paddingBottom: '40px' }}>
      <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-light)' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: 'var(--primary-dark)' }}>
          ข้อมูลส่วนตัว
        </h1>
        <p style={{ fontSize: '0.75rem', color: '#9e9690', margin: '2px 0 0 0' }}>
          แก้ไขชื่อที่แสดงและ PIN สำหรับเข้าสู่ระบบ
        </p>
      </div>

      <div
        className="card"
        style={{
          marginTop: '16px',
          padding: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: 'linear-gradient(135deg, #ffffff 0%, var(--lavender) 100%)',
        }}
      >
        <UserCircle2 size={44} color="var(--primary)" strokeWidth={1.5} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>{currentUser.name}</div>
          <span
            className="chip"
            style={{
              fontSize: '0.6875rem',
              padding: '2px 8px',
              background: currentUser.role === 'admin' ? 'var(--peach)' : 'var(--sky)',
              color: currentUser.role === 'admin' ? 'var(--peach-text)' : 'var(--sky-text)',
              fontWeight: 600,
            }}
          >
            {ROLE_LABELS[currentUser.role || 'caretaker']}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ marginTop: '16px', padding: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label className="label" htmlFor="profile-name">ชื่อที่แสดง</label>
          <input
            id="profile-name"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: 'var(--primary-dark)',
            margin: '8px 0 10px',
          }}
        >
          <KeyRound size={15} /> เปลี่ยน PIN (เว้นว่างถ้าไม่ต้องการเปลี่ยน)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label className="label" htmlFor="profile-new-pin">PIN ใหม่</label>
            <input
              id="profile-new-pin"
              className="input-field"
              type="password"
              inputMode="numeric"
              placeholder="4–6 หลัก"
              value={newPin}
              onChange={(e) => setNewPin(digitsOnly(e.target.value))}
            />
          </div>
          <div>
            <label className="label" htmlFor="profile-confirm-pin">ยืนยัน PIN ใหม่</label>
            <input
              id="profile-confirm-pin"
              className="input-field"
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(digitsOnly(e.target.value))}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px', paddingTop: '14px', borderTop: '1px dashed var(--border)' }}>
          <label className="label" htmlFor="profile-current-pin">
            PIN ปัจจุบัน <span style={{ color: 'var(--rose-text)' }}>*</span>
          </label>
          <input
            id="profile-current-pin"
            className="input-field"
            type="password"
            inputMode="numeric"
            placeholder="ยืนยันตัวตนก่อนบันทึก"
            value={currentPin}
            onChange={(e) => setCurrentPin(digitsOnly(e.target.value))}
            required
          />
        </div>

        {error && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--rose-text)', background: 'var(--rose)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
            {error}
          </p>
        )}
        {success && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--mint-text)', background: 'var(--mint)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} /> {success}
          </p>
        )}

        <button id="profile-save-btn" type="submit" className="btn-primary" style={{ width: '100%' }} disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </form>
    </div>
  );
}
