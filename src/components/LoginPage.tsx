'use client';

import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getCaretakers, verifyPin } from '@/lib/queries';
import type { Caretaker } from '@/lib/types';

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
        });
      } else {
        setError(result.message || 'PIN ไม่ถูกต้อง');
      }
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--background)',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        {/* โลโก้ */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'var(--lavender)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Shield size={28} color="var(--primary)" strokeWidth={1.8} />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>ITPC Techcare</h1>
          <p style={{ fontSize: '0.875rem', color: '#9e9690', margin: '4px 0 0' }}>ระบบดูแลนักเรียน</p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: '24px' }}>
          {/* เลือกผู้ดูแล */}
          <div style={{ marginBottom: '16px' }}>
            <label className="label" htmlFor="caretaker-select">ผู้ดูแล</label>
            {loadingList ? (
              <div style={{ padding: '10px 0' }}><div className="spinner" /></div>
            ) : (
              <select
                id="caretaker-select"
                className="input-field"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
              >
                <option value="">เลือกชื่อผู้ดูแล...</option>
                {caretakers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* กรอก PIN */}
          <div style={{ marginBottom: '20px' }}>
            <label className="label" htmlFor="pin-input">PIN</label>
            <input
              id="pin-input"
              className="input-field"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              minLength={4}
              maxLength={6}
              placeholder="กรอก PIN 4–6 หลัก"
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '');
                if (v.length <= 6) setPin(v);
              }}
              required
            />
          </div>

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

          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading || !selectedId || !pin}>
            {loading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  );
}
