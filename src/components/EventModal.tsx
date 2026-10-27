'use client';

import { useState } from 'react';
import { X, Calendar, Clock, MapPin, FileText, Trash2, CheckCircle2 } from 'lucide-react';
import { SchoolEvent, SchoolEventCategory, EVENT_CATEGORY_CONFIG } from '@/lib/schoolEvents';

interface EventModalProps {
  initialDate?: string;
  initialEvent?: SchoolEvent | null;
  onClose: () => void;
  onSave: (event: SchoolEvent) => void;
  onDelete?: (id: string) => void;
}

export function EventModal({
  initialDate,
  initialEvent,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [category, setCategory] = useState<SchoolEventCategory>(
    initialEvent?.category || 'academic'
  );
  const [date, setDate] = useState(
    initialEvent?.date || initialDate || new Date().toISOString().split('T')[0]
  );
  const [time, setTime] = useState(initialEvent?.time || '08:30 - 12:00');
  const [location, setLocation] = useState(initialEvent?.location || '');
  const [details, setDetails] = useState(initialEvent?.details || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('กรุณากรอกชื่อกิจกรรม');
      return;
    }
    if (!date) {
      setError('กรุณาเลือกวันที่');
      return;
    }

    const eventToSave: SchoolEvent = {
      id: initialEvent?.id || `event-${Date.now()}`,
      title: title.trim(),
      category,
      date,
      time: time.trim() || undefined,
      location: location.trim() || undefined,
      details: details.trim() || undefined,
      is_demo: initialEvent?.is_demo !== undefined ? initialEvent.is_demo : true,
    };

    onSave(eventToSave);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(53, 38, 63, 0.45)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 36px rgba(159, 119, 180, 0.25)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--accent)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.063rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
              {initialEvent ? 'แก้ไขกิจกรรมโรงเรียน' : 'เพิ่มกิจกรรมโรงเรียน'}
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              โรงเรียนสาธิตมหาวิทยาลัยเชียงใหม่ ระดับอนุบาลและประถมศึกษา
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '22px', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '10px 14px',
                background: 'var(--event-holiday-bg)',
                color: 'var(--event-holiday-text)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8125rem',
              }}
            >
              {error}
            </div>
          )}

          {/* 1. ชื่อกิจกรรม */}
          <div style={{ marginBottom: '16px' }}>
            <label className="label">ชื่อกิจกรรม *</label>
            <input
              type="text"
              className="input-field"
              placeholder="เช่น กิจกรรมวันสำคัญ, ประชุมผู้ปกครอง..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* 2. ประเภทกิจกรรม */}
          <div style={{ marginBottom: '16px' }}>
            <label className="label">ประเภทกิจกรรม *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {(Object.keys(EVENT_CATEGORY_CONFIG) as SchoolEventCategory[]).map((catKey) => {
                const conf = EVENT_CATEGORY_CONFIG[catKey];
                const selected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: selected ? `2px solid ${conf.dotColor}` : '1px solid var(--border)',
                      background: selected ? conf.bg : '#ffffff',
                      color: selected ? conf.text : 'var(--text-primary)',
                      fontWeight: selected ? 600 : 400,
                      fontSize: '0.8125rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: conf.dotColor,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1 }}>{conf.label}</span>
                    {selected && <CheckCircle2 size={16} color={conf.dotColor} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. วันที่และเวลา */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={14} color="var(--primary)" /> วันที่ *
              </label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} color="var(--primary)" /> เวลา
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="เช่น 08:30 - 12:00"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* 4. สถานที่ */}
          <div style={{ marginBottom: '16px' }}>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={14} color="var(--primary)" /> สถานที่
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="เช่น หอประชุมใหญ่ อาคาร 50 ปี, ห้องบัวตอง..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* 5. รายละเอียด */}
          <div style={{ marginBottom: '20px' }}>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={14} color="var(--primary)" /> รายละเอียดเพิ่มเติม
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="ระบุรายละเอียดกิจกรรม กำหนดการ หรือสิ่งที่ต้องเตรียม..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            {initialEvent && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`คุณต้องการลบกิจกรรม "${initialEvent.title}" หรือไม่?`)) {
                    onDelete(initialEvent.id);
                  }
                }}
                className="btn-danger"
                style={{ padding: '8px 14px', fontSize: '0.875rem' }}
              >
                <Trash2 size={16} /> ลบกิจกรรม
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                ยกเลิก
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              {initialEvent && onDelete && (
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.875rem' }}
              >
                บันทึกกิจกรรม
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
