'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getCaretakers, verifyPin } from '@/lib/queries';
import type { Caretaker } from '@/lib/types';
import { SchoolLogo } from './SchoolLogo';
import { Lock, UserCheck, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [caretakers, setCaretakers] = useState<Caretaker[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    getCaretakers()
      .then((data) => {
        setCaretakers(data);
        setLoadingList(false);
      })
      .catch(() => {
        setError('ไม่สามารถโหลดรายชื่อผู้ดูแลได้ กรุณาตรวจสอบการเชื่อมต่อ');
        setLoadingList(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !pin) return;
    if (pin.length < 4 || pin.length > 6) {
      setError('PIN ต้องมี 4–6 หลัก');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await verifyPin(selectedId, pin);
      if (result.success) {
        const found = caretakers.find((c) => c.id === selectedId);
        login({
          id: result.caretaker_id || selectedId,
          name: result.name || found?.name || 'ผู้ดูแล',
          role: result.role || found?.role || 'caretaker',
        });
      } else {
        setError(result.message || 'PIN ไม่ถูกต้อง');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'radial-gradient(circle at 50% 20%, #f7f0fc 0%, #FCFAFD 70%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* School Emblem & Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '14px' }}>
            <SchoolLogo size="lg" showText={false} />
          </div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 4px',
              letterSpacing: '-0.01em',
            }}
          >
            โรงเรียนสาธิตมหาวิทยาลัยเชียงใหม่
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--primary-dark)',
              fontWeight: 600,
              margin: 0,
            }}
          >
            ระดับอนุบาลและประถมศึกษา
          </p>
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              margin: '4px 0 0',
            }}
          >
            ระบบบริหารจัดการและปฏิทินดูแลนักเรียน
          </p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{
            padding: '28px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 28px rgba(159, 119, 180, 0.12)',
            border: '1px solid var(--border)',
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: '18px',
                padding: '12px 14px',
                background: 'var(--event-holiday-bg)',
                color: 'var(--event-holiday-text)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid var(--event-holiday-border)',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* เลือกคุณครู / ผู้ดูแล */}
          <div style={{ marginBottom: '18px' }}>
            <label
              className="label"
              htmlFor="caretaker-select"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserCheck size={15} color="var(--primary)" />
              <span>เลือกชื่อผู้เข้าใช้งาน</span>
            </label>
            {loadingList ? (
              <div style={{ padding: '12px 0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>กำลังโหลดรายชื่อ...</span>
              </div>
            ) : (
              <select
                id="caretaker-select"
                className="input-field"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
                style={{
                  height: '46px',
                  borderRadius: 'var(--radius-sm)',
                  borderColor: 'var(--border)',
                }}
              >
                <option value="">เลือกชื่อครู / ผู้ดูแลระบบ...</option>
                {caretakers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.role === 'admin' ? '(ผู้ดูแลระบบ)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* กรอกรหัส PIN */}
          <div style={{ marginBottom: '22px' }}>
            <label
              className="label"
              htmlFor="pin-input"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Lock size={15} color="var(--primary)" />
              <span>รหัส PIN (4–6 หลัก)</span>
            </label>
            <input
              id="pin-input"
              className="input-field"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              minLength={4}
              maxLength={6}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
              autoComplete="current-password"
              style={{
                height: '46px',
                borderRadius: 'var(--radius-sm)',
                borderColor: 'var(--border)',
                letterSpacing: '4px',
                fontSize: '1.1rem',
              }}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              ค่าเริ่มต้นสำหรับทดสอบ: <strong>1234</strong>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedId || !pin}
            className="btn-primary"
            style={{
              width: '100%',
              height: '46px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.938rem',
              fontWeight: 600,
            }}
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          ระบบสารสนเทศและการดูแลช่วยเหลือผู้เรียน • Chiang Mai University Demonstration School
        </div>
      </div>
    </div>
  );
}
