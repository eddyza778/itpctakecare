'use client';

import { useState, useRef } from 'react';
import { UserCircle2, KeyRound, CheckCircle2, Camera, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { updateOwnProfile } from '@/lib/queries';
import { ROLE_LABELS } from '@/lib/types';

export default function ProfilePage() {
  const { currentUser, login } = useAuth();
  const [name, setName] = useState(currentUser?.name || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatar_url || null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const digitsOnly = (v: string) => v.replace(/\D/g, '').slice(0, 6);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setError('ไฟล์รูปภาพมีขนาดใหญ่เกิน 12MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // ย่อรูปเป็นสี่เหลี่ยมจัตุรัส 256x256 คุณภาพสูงและประหยัดพื้นที่ (~20KB)
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // ครอปตรงกลาง (center-crop)
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setAvatarUrl(dataUrl);
        setAvatarChanged(true);
        setError('');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    setAvatarChanged(true);
  };

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
        avatarUrl: avatarChanged ? (avatarUrl || '') : undefined,
      });

      if (!res.success) {
        setError(res.message || 'บันทึกไม่สำเร็จ');
        return;
      }

      login({
        ...currentUser,
        name: name.trim(),
        avatar_url: avatarUrl,
      });

      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setAvatarChanged(false);
      setSuccess('บันทึกข้อมูลและอัปเดตรูปโปรไฟล์เรียบร้อย');
    } catch (err: unknown) {
      console.error('Update profile error:', err);
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '540px', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-light)' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: 'var(--primary-dark)' }}>
          ข้อมูลส่วนตัว
        </h1>
        <p style={{ fontSize: '0.75rem', color: '#9e9690', margin: '2px 0 0 0' }}>
          แก้ไขรูปโปรไฟล์ ชื่อที่แสดง และ PIN สำหรับเข้าสู่ระบบ
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageSelect}
      />

      {/* Profile Card With Avatar Upload */}
      <div
        className="card"
        style={{
          marginTop: '16px',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          background: 'linear-gradient(135deg, #ffffff 0%, var(--lavender) 100%)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {/* Avatar with click to upload */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => fileInputRef.current?.click()}
            title="คลิกเพื่ออัปโหลดรูปภาพ"
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface)',
              border: '3px solid #ffffff',
              boxShadow: '0 4px 12px rgba(159, 119, 180, 0.25)',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name || currentUser.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'var(--accent)',
                  color: 'var(--primary-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.75rem',
                }}
              >
                {name ? name.charAt(0) : <UserCircle2 size={46} color="var(--primary)" />}
              </div>
            )}
          </div>

          {/* Camera floating badge */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="อัปโหลดรูปโปรไฟล์"
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: '2px solid #ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'transform 0.15s ease',
            }}
          >
            <Camera size={14} />
          </button>
        </div>

        {/* User Info & Quick Action Buttons */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1.063rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
            {name || currentUser.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              className="chip"
              style={{
                fontSize: '0.688rem',
                padding: '2px 8px',
                background: currentUser.role === 'admin' ? 'var(--peach)' : 'var(--sky)',
                color: currentUser.role === 'admin' ? 'var(--peach-text)' : 'var(--sky-text)',
                fontWeight: 600,
              }}
            >
              {ROLE_LABELS[currentUser.role || 'caretaker']}
            </span>
            {avatarChanged && (
              <span style={{ fontSize: '0.688rem', color: 'var(--primary)', fontWeight: 600 }}>
                • มีการเปลี่ยนแปลงรูป (กดบันทึก)
              </span>
            )}
          </div>

          {/* Avatar Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: '#ffffff',
                color: 'var(--primary-dark)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 500,
              }}
            >
              <Upload size={13} />
              {avatarUrl ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}
            </button>

            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--rose-border, #fecdd3)',
                  background: 'var(--rose, #fff1f2)',
                  color: 'var(--rose-text, #be123c)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 500,
                }}
              >
                <Trash2 size={13} />
                ลบรูป
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Edit Form */}
      <form onSubmit={handleSubmit} className="card" style={{ marginTop: '16px', padding: '22px' }}>
        <div style={{ marginBottom: '18px' }}>
          <label className="label" htmlFor="profile-name">
            ชื่อที่แสดง <span style={{ color: 'var(--rose-text)' }}>*</span>
          </label>
          <input
            id="profile-name"
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ชื่อ-นามสกุล หรือชื่อเรียก"
            required
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.813rem',
            fontWeight: 600,
            color: 'var(--primary-dark)',
            margin: '12px 0 10px',
          }}
        >
          <KeyRound size={15} /> เปลี่ยน PIN (เว้นว่างถ้าไม่ต้องการเปลี่ยน)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
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
              placeholder="กรอกอีกครั้ง"
              value={confirmPin}
              onChange={(e) => setConfirmPin(digitsOnly(e.target.value))}
            />
          </div>
        </div>

        <div style={{ marginBottom: '22px', paddingTop: '16px', borderTop: '1px dashed var(--border)' }}>
          <label className="label" htmlFor="profile-current-pin">
            PIN ปัจจุบัน <span style={{ color: 'var(--rose-text)' }}>*</span>
          </label>
          <input
            id="profile-current-pin"
            className="input-field"
            type="password"
            inputMode="numeric"
            placeholder="ยืนยันตัวตนด้วย PIN ปัจจุบันก่อนบันทึก"
            value={currentPin}
            onChange={(e) => setCurrentPin(digitsOnly(e.target.value))}
            required
          />
        </div>

        {error && (
          <p
            style={{
              fontSize: '0.813rem',
              color: 'var(--rose-text)',
              background: 'var(--rose)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
            }}
          >
            {error}
          </p>
        )}
        {success && (
          <p
            style={{
              fontSize: '0.813rem',
              color: 'var(--mint-text)',
              background: 'var(--mint)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={16} /> {success}
          </p>
        )}

        <button
          id="profile-save-btn"
          type="submit"
          className="btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '0.938rem', fontWeight: 600 }}
          disabled={saving}
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </form>
    </div>
  );
}
