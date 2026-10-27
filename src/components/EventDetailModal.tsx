'use client';

import { X, Calendar, Clock, MapPin, FileText, Edit2, ShieldAlert } from 'lucide-react';
import { SchoolEvent, EVENT_CATEGORY_CONFIG } from '@/lib/schoolEvents';
import { safeFormatDate } from '@/lib/date';

interface EventDetailModalProps {
  event: SchoolEvent;
  onClose: () => void;
  onEdit: (event: SchoolEvent) => void;
}

export function EventDetailModal({ event, onClose, onEdit }: EventDetailModalProps) {
  const conf = EVENT_CATEGORY_CONFIG[event.category] || EVENT_CATEGORY_CONFIG.academic;

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
          maxWidth: '480px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 36px rgba(159, 119, 180, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Top category banner */}
        <div
          style={{
            padding: '18px 20px',
            background: conf.bg,
            borderBottom: `1px solid ${conf.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: conf.dotColor,
              }}
            />
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: conf.text,
              }}
            >
              {conf.label}
            </span>
            {event.is_demo && (
              <span
                style={{
                  fontSize: '0.625rem',
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: 'var(--text-secondary)',
                  padding: '1px 6px',
                  borderRadius: '100px',
                  fontWeight: 600,
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                สาธิต มช.
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: conf.text,
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content body */}
        <div style={{ padding: '22px' }}>
          <h2
            style={{
              fontSize: '1.188rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 16px',
              lineHeight: 1.4,
            }}
          >
            {event.title}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {/* วันที่ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                  flexShrink: 0,
                }}
              >
                <Calendar size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.688rem', color: 'var(--text-secondary)' }}>วันที่จัดกิจกรรม</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {safeFormatDate(event.date, 'EEEEที่ d MMMM yyyy')}
                </div>
              </div>
            </div>

            {/* เวลา */}
            {event.time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    flexShrink: 0,
                  }}
                >
                  <Clock size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.688rem', color: 'var(--text-secondary)' }}>เวลา</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.time}</div>
                </div>
              </div>
            )}

            {/* สถานที่ */}
            {event.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    flexShrink: 0,
                  }}
                >
                  <MapPin size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.688rem', color: 'var(--text-secondary)' }}>สถานที่</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{event.location}</div>
                </div>
              </div>
            )}
          </div>

          {/* รายละเอียด */}
          {event.details && (
            <div
              style={{
                marginBottom: '22px',
                padding: '14px',
                background: 'var(--background)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={14} /> รายละเอียดกิจกรรม
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                {event.details}
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              onClick={() => {
                onClose();
                onEdit(event);
              }}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.875rem' }}
            >
              <Edit2 size={16} /> แก้ไขกิจกรรม
            </button>
            <button
              onClick={onClose}
              className="btn-primary"
              style={{ padding: '8px 20px', fontSize: '0.875rem' }}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
