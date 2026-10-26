'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Calendar,
  List,
  LayoutGrid,
  FileSpreadsheet,
  X,
  Clock,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { safeFormatDate, safeParseDate } from '@/lib/date';
import { useAuth } from '@/lib/auth';
import { getCalendarEvents } from '@/lib/queries';
import type { CalendarEvent } from '@/lib/types';
import { CASE_TYPE_LABELS } from '@/lib/types';
import { CreateCaseModal } from '@/components/CreateCaseModal';
import { exportMonthlyCasesToExcel } from '@/lib/excel';

type ViewMode = 'month' | 'week' | 'list';

export default function CalendarPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMyOnly, setShowMyOnly] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<string | undefined>(undefined);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let start: Date, end: Date;
      if (viewMode === 'month') {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        start = startOfWeek(monthStart, { weekStartsOn: 0 });
        end = endOfWeek(monthEnd, { weekStartsOn: 0 });
      } else if (viewMode === 'week') {
        start = startOfWeek(currentDate, { weekStartsOn: 0 });
        end = endOfWeek(currentDate, { weekStartsOn: 0 });
      } else {
        // list: ดึงทั้งเดือน
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      }

      const data = await getCalendarEvents(
        start.toISOString(),
        end.toISOString(),
        showMyOnly ? currentUser?.id : undefined
      );
      setEvents(data);
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string; hint?: string };
      const msg = e?.message
        ? `ฐานข้อมูลแจ้งเตือน (${e.code || ''}): ${e.message}`
        : 'ไม่สามารถโหลดข้อมูลปฏิทินได้';
      setError(msg);
      console.error('fetchEvents error:', e?.message || err, e?.hint || '');
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode, showMyOnly, currentUser]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const navigate = (dir: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(dir === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(dir === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(dir === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };

  const goToday = () => setCurrentDate(new Date());

  const getEventsForDate = (date: Date) =>
    events.filter((e) => e.scheduled_at && isSameDay(safeParseDate(e.scheduled_at), date));

  const getLabel = (e: CalendarEvent) =>
    e.case_type === 'other' ? e.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[e.case_type];

  // ======= RENDER =======

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    return (
      <div style={{ padding: 0, width: '100%', overflow: 'hidden' }}>
        {/* วันในสัปดาห์ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px', marginBottom: '4px', width: '100%' }}>
          {weekDays.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9e9690', padding: '6px 0', fontWeight: 500, minWidth: 0 }}>
              {d}
            </div>
          ))}
        </div>

        {/* ตารางวัน */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px', width: '100%' }}>
          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);

            // รวมประเภทเคสในวันนี้: แสดงแค่ประเภทเคส และหากประเภทไหนยังไม่เสร็จสิ้นจะแสดงสีส้ม
            const typeMap = new Map<string, { label: string; allDone: boolean; count: number }>();
            for (const ev of dayEvents) {
              const label = getLabel(ev);
              const isEvDone = ev.status === 'done';
              const existing = typeMap.get(label);
              if (!existing) {
                typeMap.set(label, { label, allDone: isEvDone, count: 1 });
              } else {
                existing.count += 1;
                if (!isEvDone) existing.allDone = false;
              }
            }
            const caseTypes = Array.from(typeMap.values());

            return (
              <div
                key={day.toISOString()}
                onClick={() => setSelectedDay(day)}
                role="button"
                tabIndex={0}
                title={`ดูเคสวันที่ ${format(day, 'd MMMM yyyy', { locale: th })} (${dayEvents.length} เคส)`}
                className="cal-day-cell"
                style={{
                  padding: '2px',
                  borderRadius: 'var(--radius-sm)',
                  background: today ? 'var(--lavender)' : inMonth ? 'var(--card-bg)' : 'transparent',
                  border: today ? '1.5px solid var(--primary-light)' : '1px solid var(--border-light)',
                  opacity: inMonth ? 1 : 0.4,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, border-color 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  width: '100%',
                  overflow: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  fontWeight: today ? 600 : 400,
                  color: today ? 'var(--primary-dark)' : 'var(--foreground)',
                  marginBottom: '2px',
                  minWidth: 0,
                  padding: '0 2px',
                }}>
                  <span>{format(day, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <span
                      style={{
                        fontSize: '0.625rem',
                        background: today ? 'var(--primary)' : '#ede4f3',
                        color: today ? '#fff' : 'var(--primary-dark)',
                        padding: '0 3px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        lineHeight: '13px',
                        flexShrink: 0,
                      }}
                    >
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, width: '100%', overflow: 'hidden' }}>
                  {caseTypes.slice(0, 2).map((ct) => {
                    const isOrange = !ct.allDone; // ถ้ามีเคสที่ยังไม่เสร็จ -> สีส้ม
                    return (
                      <div
                        key={ct.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          width: '100%',
                          minWidth: 0,
                          padding: '1px 3px',
                          borderRadius: '3px',
                          fontSize: '0.5625rem',
                          lineHeight: '1.2',
                          fontFamily: 'inherit',
                          fontWeight: 500,
                          backgroundColor: isOrange ? '#ffedd5' : '#d4f0e7',
                          color: isOrange ? '#c2410c' : '#2e6b52',
                          border: isOrange ? '1px solid #fdba74' : '1px solid #a7f3d0',
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                        }}
                        title={`${ct.label} (${ct.count} เคส, ${ct.allDone ? 'เสร็จสิ้นทั้งหมด' : 'ยังไม่เสร็จสิ้น'})`}
                      >
                        <span
                          style={{
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            backgroundColor: isOrange ? '#ea580c' : '#10b981',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                          {ct.label}
                        </span>
                        {ct.count > 1 && (
                          <span
                            style={{
                              fontSize: '0.5625rem',
                              fontWeight: 700,
                              padding: '0 2px',
                              borderRadius: '2px',
                              backgroundColor: isOrange ? '#fed7aa' : '#bbf0dd',
                              color: isOrange ? '#9a3412' : '#1d5440',
                              flexShrink: 0,
                              lineHeight: '11px',
                            }}
                          >
                            +{ct.count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {caseTypes.length > 2 && (
                    <div
                      style={{
                        padding: '1px 2px',
                        fontSize: '0.5rem',
                        textAlign: 'center',
                        color: caseTypes.slice(2).some((c) => !c.allDone) ? '#c2410c' : '#8a8280',
                        backgroundColor: caseTypes.slice(2).some((c) => !c.allDone) ? '#ffedd5' : 'var(--lavender)',
                        border: caseTypes.slice(2).some((c) => !c.allDone) ? '1px solid #fdba74' : 'none',
                        borderRadius: '2px',
                        fontWeight: 600,
                        lineHeight: '1.1',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        minWidth: 0,
                      }}
                      title={`ยังมีอีก ${caseTypes.length - 2} ประเภท`}
                    >
                      +{caseTypes.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div style={{ padding: 0 }}>
        {days.map((day) => {
          const dayEvents = getEventsForDate(day);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px 0',
                borderBottom: '1px solid var(--border-light)',
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedDay(day)}
                style={{
                  width: '44px',
                  textAlign: 'center',
                  flexShrink: 0,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
                title={`ดูเคสวันที่ ${format(day, 'd MMMM yyyy', { locale: th })}`}
              >
                <div style={{ fontSize: '0.75rem', color: '#9e9690' }}>
                  {format(day, 'EEE', { locale: th })}
                </div>
                <div style={{
                  fontSize: '1.125rem',
                  fontWeight: today ? 700 : 400,
                  color: today ? 'var(--primary)' : 'var(--foreground)',
                  width: '32px',
                  height: '32px',
                  lineHeight: '32px',
                  borderRadius: '50%',
                  background: today ? 'var(--lavender)' : 'transparent',
                  margin: '0 auto',
                  transition: 'transform 0.1s',
                }}>
                  {format(day, 'd')}
                </div>
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                {dayEvents.length === 0 && (
                  <div style={{ fontSize: '0.8125rem', color: '#c5bcb6', padding: '8px 0' }}>
                    ไม่มีเคส
                  </div>
                )}
                <div className="cases-grid">
                  {dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => router.push(`/cases/${ev.id}`)}
                      className="card"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span className={`status-badge status-${ev.status}`}>
                          <span className="status-dot" />
                          {ev.status === 'planned' ? 'วางแผน' : 'เสร็จสิ้น'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#9e9690' }}>
                          {safeFormatDate(ev.scheduled_at, 'HH:mm น.')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {getLabel(ev)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9e9690' }}>
                        {ev.student_count} คน
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    const sorted = [...events].sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );

    if (sorted.length === 0) {
      return (
        <div className="empty-state">
          <CalendarDays size={40} strokeWidth={1.5} />
          <p>ไม่มีเคสในเดือนนี้</p>
        </div>
      );
    }

    return (
      <div style={{ padding: 0 }}>
        <div className="cases-grid">
          {sorted.map((ev) => (
            <button
              key={ev.id}
              onClick={() => router.push(`/cases/${ev.id}`)}
              className="card"
              style={{
                display: 'block',
                width: '100%',
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span className={`status-badge status-${ev.status}`}>
                  <span className="status-dot" />
                  {ev.status === 'planned' ? 'วางแผน' : 'เสร็จสิ้น'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#9e9690' }}>
                  {safeFormatDate(ev.scheduled_at, 'd MMM yyyy HH:mm น.')}
                </span>
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                {getLabel(ev)}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#9e9690' }}>
                นักเรียน {ev.student_count} คน
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const headerLabel = viewMode === 'week'
    ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'd')}–${format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'd MMM yyyy', { locale: th })}`
    : format(currentDate, 'MMMM yyyy', { locale: th });

  return (
    <div className="page-container" style={{ paddingBottom: '32px' }}>
      {/* Header */}
      <div style={{
        padding: '16px 0 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: 'var(--primary-dark)' }}>ปฏิทินเคส</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => exportMonthlyCasesToExcel(events, headerLabel)}
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.75rem', minHeight: '34px', gap: '4px' }}
            title="ส่งออกเคสเดือนนี้เป็น Excel"
          >
            <FileSpreadsheet size={15} />
            ส่งออก Excel
          </button>
          <span style={{ fontSize: '0.8125rem', color: '#9e9690' }}>{currentUser?.name}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        padding: '12px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
      }}>
        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => navigate('prev')} className="btn-secondary" style={{ padding: '8px', minHeight: '36px' }}>
            <ChevronLeft size={18} />
          </button>
          <button onClick={goToday} className="btn-secondary" style={{ padding: '8px 12px', minHeight: '36px', fontSize: '0.8125rem' }}>
            วันนี้
          </button>
          <button onClick={() => navigate('next')} className="btn-secondary" style={{ padding: '8px', minHeight: '36px' }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* View mode */}
        <div style={{ display: 'flex', gap: '2px', background: 'var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
          {[
            { mode: 'month' as ViewMode, icon: <LayoutGrid size={16} />, label: 'เดือน' },
            { mode: 'week' as ViewMode, icon: <CalendarDays size={16} />, label: 'สัปดาห์' },
            { mode: 'list' as ViewMode, icon: <List size={16} />, label: 'รายการ' },
          ].map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                background: viewMode === mode ? 'var(--card-bg)' : 'transparent',
                color: viewMode === mode ? 'var(--primary)' : '#9e9690',
                fontWeight: viewMode === mode ? 500 : 400,
                boxShadow: viewMode === mode ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Month label + filter */}
      <div style={{
        padding: '0 0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, textTransform: 'capitalize' }}>
          {headerLabel}
        </h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: '#9e9690', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showMyOnly}
            onChange={(e) => setShowMyOnly(e.target.checked)}
            style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
          />
          เฉพาะเคสของฉัน
        </label>
      </div>

      {error && (
        <div style={{
          margin: '0 0 12px',
          padding: '10px 14px',
          background: 'var(--rose)',
          color: 'var(--rose-text)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8125rem',
        }}>
          {error} (กรุณารันคำสั่ง GRANT สิทธิ์ตารางให้ role anon บน Supabase SQL Editor)
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'list' && renderListView()}
        </>
      )}

      {/* FAB */}
      <button
        className="fab"
        onClick={() => {
          setCreateModalDate(undefined);
          setShowCreateModal(true);
        }}
        aria-label="สร้างเคสใหม่"
      >
        <Plus size={26} strokeWidth={2} />
      </button>

      {/* Day Cases Modal — ดูเคสประจำวัน */}
      {selectedDay && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedDay(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '480px', padding: '24px' }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border-light)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '2px' }}>
                  <CalendarDays size={16} />
                  <span>เคสประจำวัน</span>
                </div>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, margin: 0 }}>
                  {format(selectedDay, 'EEEEที่ d MMMM yyyy', { locale: th })}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                aria-label="ปิด"
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#9e9690',
                  display: 'flex',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Cases list */}
            {(() => {
              const dayEvents = getEventsForDate(selectedDay);
              if (dayEvents.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#9e9690' }}>
                    <CalendarDays size={38} strokeWidth={1.5} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ margin: '0 0 6px 0', fontSize: '0.9375rem', fontWeight: 500, color: '#6e6560' }}>
                      ไม่มีเคสในวันนี้
                    </p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#b5aca6' }}>
                      สามารถกดปุ่มด้านล่างเพื่อเปิดเคสใหม่สำหรับวันนี้ได้ทันที
                    </p>
                  </div>
                );
              }

              return (
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8a8280', marginBottom: '10px', fontWeight: 500 }}>
                    ทั้งหมด {dayEvents.length} เคส
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', marginBottom: '8px', paddingRight: '2px' }}>
                    {dayEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          setSelectedDay(null);
                          router.push(`/cases/${ev.id}`);
                        }}
                        className="card"
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          border: '1px solid var(--border)',
                          transition: 'border-color 0.15s, transform 0.1s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span className={`status-badge status-${ev.status}`}>
                            <span className="status-dot" />
                            {ev.status === 'planned' ? 'วางแผน' : 'เสร็จสิ้น'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#9e9690', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={13} />
                            {safeFormatDate(ev.scheduled_at, 'HH:mm น.')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>
                              {getLabel(ev)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#9e9690', marginTop: '3px' }}>
                              นักเรียน {ev.student_count} คน
                            </div>
                          </div>
                          <ChevronRight size={18} color="#9e9690" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={() => {
                  const dateStr = format(selectedDay, 'yyyy-MM-dd');
                  setSelectedDay(null);
                  setCreateModalDate(dateStr);
                  setShowCreateModal(true);
                }}
                className="btn-primary"
                style={{ flex: 1.2 }}
              >
                <Plus size={16} />
                เปิดเคสในวันนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Case Modal */}
      {showCreateModal && (
        <CreateCaseModal
          initialDate={createModalDate}
          onClose={() => {
            setShowCreateModal(false);
            setCreateModalDate(undefined);
          }}
          onCreated={() => {
            setShowCreateModal(false);
            setCreateModalDate(undefined);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
}
