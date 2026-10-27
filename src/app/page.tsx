'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Calendar as CalendarIcon,
  List,
  LayoutGrid,
  FileSpreadsheet,
  X,
  Clock,
  Sparkles,
  MapPin,
  CheckCircle2,
  Tag,
  GraduationCap,
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
} from 'date-fns';
import { th } from 'date-fns/locale';
import { safeFormatDate, safeParseDate } from '@/lib/date';
import { useAuth } from '@/lib/auth';
import { getCalendarEvents } from '@/lib/queries';
import type { CalendarEvent } from '@/lib/types';
import { CASE_TYPE_LABELS } from '@/lib/types';
import { CreateCaseModal } from '@/components/CreateCaseModal';
import { exportMonthlyCasesToExcel } from '@/lib/excel';
import {
  SchoolEvent,
  EVENT_CATEGORY_CONFIG,
  getStoredSchoolEvents,
  saveStoredSchoolEvents,
} from '@/lib/schoolEvents';
import { EventModal } from '@/components/EventModal';
import { EventDetailModal } from '@/components/EventDetailModal';

type ViewMode = 'month' | 'week' | 'list';
type StatusFilter = 'all' | 'planned' | 'done';

export default function CalendarPage() {
  const router = useRouter();
  const { currentUser, isAdmin } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMyOnly, setShowMyOnly] = useState(false);

  // Modals state
  const [showCreateCaseModal, setShowCreateCaseModal] = useState(false);
  const [createCaseDate, setCreateCaseDate] = useState<string | undefined>(undefined);

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingSchoolEvent, setEditingSchoolEvent] = useState<SchoolEvent | null>(null);
  const [eventModalDate, setEventModalDate] = useState<string | undefined>(undefined);

  const [viewingSchoolEvent, setViewingSchoolEvent] = useState<SchoolEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Load school events from local storage (demo isolated)
  useEffect(() => {
    setSchoolEvents(getStoredSchoolEvents());
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      let start: Date, end: Date;
      if (viewMode === 'month') {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        start = startOfWeek(monthStart, { weekStartsOn: 1 }); // วันจันทร์ถึงวันอาทิตย์
        end = endOfWeek(monthEnd, { weekStartsOn: 1 });
      } else if (viewMode === 'week') {
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
      } else {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      }

      const filterId = isAdmin ? (showMyOnly ? currentUser.id : undefined) : currentUser.id;

      const data = await getCalendarEvents(
        start.toISOString(),
        end.toISOString(),
        filterId,
        currentUser.id
      );
      setEvents(data);
      setError('');
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string; hint?: string };
      const rawMsg = e?.message || String(err);
      if (rawMsg.includes('unexpected response') || rawMsg.includes('abort') || rawMsg.includes('Failed to fetch')) {
        console.warn('fetchEvents transient notice:', rawMsg);
        return;
      }
      setError('ไม่สามารถโหลดข้อมูลปฏิทินได้');
      console.error('fetchEvents error:', rawMsg, e?.hint || '');
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode, showMyOnly, currentUser, isAdmin]);

  useEffect(() => {
    if (currentUser) {
      fetchEvents();
    }
  }, [fetchEvents, currentUser]);

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

  // Filter helpers
  const getCasesForDate = useCallback((date: Date) => {
    return events.filter((e) => {
      if (!e.scheduled_at || !isSameDay(safeParseDate(e.scheduled_at), date)) return false;
      if (statusFilter === 'planned') return e.status === 'planned';
      if (statusFilter === 'done') return e.status === 'done';
      return true;
    });
  }, [events, statusFilter]);

  const getSchoolEventsForDate = useCallback((_date: Date) => {
    return [];
  }, []);

  const getLabel = (e: CalendarEvent) =>
    e.case_type === 'other' ? e.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[e.case_type];

  // School events CRUD handlers
  const handleSaveSchoolEvent = (savedEvent: SchoolEvent) => {
    const existingIndex = schoolEvents.findIndex((ev) => ev.id === savedEvent.id);
    let updated: SchoolEvent[];
    if (existingIndex >= 0) {
      updated = [...schoolEvents];
      updated[existingIndex] = savedEvent;
    } else {
      updated = [savedEvent, ...schoolEvents];
    }
    setSchoolEvents(updated);
    saveStoredSchoolEvents(updated);
    setShowEventModal(false);
    setEditingSchoolEvent(null);
  };

  const handleDeleteSchoolEvent = (id: string) => {
    const updated = schoolEvents.filter((ev) => ev.id !== id);
    setSchoolEvents(updated);
    saveStoredSchoolEvents(updated);
    setShowEventModal(false);
    setEditingSchoolEvent(null);
    setViewingSchoolEvent(null);
  };

  // Thai Date formatting with Buddhist Year (พ.ศ.)
  const buddhistYear = currentDate.getFullYear() + 543;
  const monthNameThai = format(currentDate, 'MMMM', { locale: th });
  const headerLabel = viewMode === 'week'
    ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'd')}–${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'd MMMM', { locale: th })} ${buddhistYear}`
    : `${monthNameThai} ${buddhistYear}`;

  // =============================================================
  // RENDER: Month View (วันจันทร์ – วันอาทิตย์)
  // =============================================================
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // วันจันทร์ถึงอาทิตย์
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const weekDays = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];

    return (
      <div style={{ padding: 0, width: '100%', overflow: 'hidden' }}>
        {/* Header แถววันในสัปดาห์ (จันทร์ - อาทิตย์) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '4px',
            marginBottom: '6px',
            width: '100%',
          }}
        >
          {weekDays.map((d, index) => {
            const isWeekend = index >= 5;
            return (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  fontSize: '0.781rem',
                  color: isWeekend ? 'var(--primary)' : 'var(--text-secondary)',
                  padding: '8px 0',
                  fontWeight: 600,
                  minWidth: 0,
                  background: isWeekend ? 'var(--accent)' : 'var(--surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}
              >
                {d}
              </div>
            );
          })}
        </div>

        {/* ตารางวันปฏิทิน */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '4px',
            width: '100%',
          }}
        >
          {days.map((day) => {
            const dayCases = getCasesForDate(day);
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const totalCount = dayCases.length;

            // รวมประเภทเคสในวันนี้: แสดงแค่ประเภทเคส และหากประเภทไหนยังไม่เสร็จสิ้นจะแสดงสีส้ม (+count เมื่อมีมากกว่า 1 เคส)
            const typeMap = new Map<string, { label: string; allDone: boolean; count: number }>();
            for (const ev of dayCases) {
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
                className="cal-day-cell"
                title={`ดูเคสวันที่ ${format(day, 'd MMMM yyyy', { locale: th })} (${totalCount} เคส)`}
                style={{
                  padding: '4px 5px',
                  borderRadius: 'var(--radius-md)',
                  background: today ? '#FAF5FF' : inMonth ? 'var(--surface)' : '#FAFAFC',
                  border: today
                    ? '2px solid var(--primary)'
                    : '1px solid var(--border)',
                  opacity: inMonth ? 1 : 0.45,
                  cursor: 'pointer',
                  transition: 'all 0.16s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: today ? '0 2px 8px rgba(159, 119, 180, 0.2)' : 'none',
                }}
              >
                {/* วันที่และจำนวนรวม */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.813rem',
                    fontWeight: today ? 700 : 500,
                    color: today ? 'var(--primary-dark)' : inMonth ? 'var(--text-primary)' : 'var(--text-secondary)',
                    marginBottom: '4px',
                    padding: '0 2px',
                  }}
                >
                  <span
                    style={{
                      width: today ? '24px' : 'auto',
                      height: today ? '24px' : 'auto',
                      borderRadius: today ? '50%' : 'none',
                      background: today ? 'var(--primary)' : 'transparent',
                      color: today ? '#ffffff' : 'inherit',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: today ? '0.75rem' : 'inherit',
                    }}
                  >
                    {format(day, 'd')}
                  </span>

                  {totalCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.625rem',
                        background: today ? 'var(--primary-dark)' : 'var(--accent)',
                        color: today ? '#ffffff' : 'var(--primary-dark)',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        fontWeight: 600,
                      }}
                    >
                      {totalCount}
                    </span>
                  )}
                </div>

                {/* Badges / Items ในช่องวัน (เคสดูแลนักเรียน - จัดกลุ่มตามประเภท) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                  {caseTypes.slice(0, 2).map((ct) => {
                    const isOrange = !ct.allDone; // ถ้ามีเคสที่ยังไม่เสร็จ -> สีส้ม
                    return (
                      <div
                        key={ct.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          fontSize: '0.625rem',
                          lineHeight: '1.25',
                          fontWeight: 500,
                          backgroundColor: isOrange ? '#ffedd5' : '#d4f0e7',
                          color: isOrange ? '#c2410c' : '#2e6b52',
                          border: isOrange ? '1px solid #fdba74' : '1px solid #a7f3d0',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                        title={`${ct.label} (${ct.count} เคส, ${ct.allDone ? 'เสร็จสิ้นทั้งหมด' : 'ยังไม่เสร็จสิ้น'})`}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: isOrange ? '#ea580c' : '#10b981',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {ct.label}
                        </span>
                        {ct.count > 1 && (
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              padding: '0 4px',
                              borderRadius: '4px',
                              backgroundColor: isOrange ? '#fed7aa' : '#bbf0dd',
                              color: isOrange ? '#9a3412' : '#1d5440',
                              flexShrink: 0,
                              lineHeight: '13px',
                            }}
                          >
                            +{ct.count}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* มีประเภทเคสมากกว่า 2 รายการ */}
                  {caseTypes.length > 2 && (
                    <div
                      style={{
                        padding: '1px 4px',
                        fontSize: '0.563rem',
                        textAlign: 'center',
                        color: caseTypes.slice(2).some((c) => !c.allDone) ? '#c2410c' : 'var(--primary-dark)',
                        backgroundColor: caseTypes.slice(2).some((c) => !c.allDone) ? '#ffedd5' : 'var(--accent)',
                        border: caseTypes.slice(2).some((c) => !c.allDone) ? '1px solid #fdba74' : 'none',
                        borderRadius: '3px',
                        fontWeight: 600,
                        lineHeight: '1.2',
                      }}
                      title={`ยังมีอีก ${caseTypes.length - 2} ประเภท`}
                    >
                      +{caseTypes.length - 2} อื่นๆ
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

  // =============================================================
  // RENDER: Week View
  // =============================================================
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {days.map((day) => {
          const dayCases = getCasesForDate(day);
          const daySchoolEvents = getSchoolEventsForDate(day);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className="card"
              style={{
                padding: '16px 18px',
                background: today ? '#FAF5FF' : 'var(--surface)',
                border: today ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: today ? 'var(--primary)' : 'var(--accent)',
                      color: today ? '#ffffff' : 'var(--primary-dark)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      lineHeight: 1.1,
                    }}
                  >
                    <span style={{ fontSize: '0.625rem', textTransform: 'uppercase' }}>
                      {format(day, 'EEE', { locale: th })}
                    </span>
                    <span style={{ fontSize: '1rem' }}>{format(day, 'd')}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.938rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {format(day, 'EEEEที่ d MMMM yyyy', { locale: th })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {dayCases.length} เคสการดูแล
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDay(day)}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', minHeight: '32px', fontSize: '0.75rem' }}
                >
                  เปิดดูวันนี้
                </button>
              </div>

              {/* Items list */}
              {dayCases.length === 0 ? (
                <div style={{ fontSize: '0.813rem', color: 'var(--text-secondary)', padding: '6px 0' }}>
                  ไม่มีเคสดูแลนักเรียนในวันนี้
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dayCases.map((ev) => (
                    <Link
                      key={ev.id}
                      href={`/cases/${ev.id}`}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`status-badge status-${ev.status}`}>
                          <span className="status-dot" />
                          {ev.status === 'planned' ? 'วางแผน' : 'เสร็จสิ้น'}
                        </span>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {getLabel(ev)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            นักเรียน {ev.student_count} คน • อัปเดตจริง:{' '}
                            {safeFormatDate(ev.actual_updated_at || ev.scheduled_at, 'HH:mm น.')}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // =============================================================
  // RENDER: List View
  // =============================================================
  const renderListView = () => {
    const filteredEvents = events.filter((e) => {
      if (statusFilter === 'planned') return e.status === 'planned';
      if (statusFilter === 'done') return e.status === 'done';
      return true;
    });

    const combinedList = filteredEvents.map((e) => ({
      type: 'case' as const,
      id: e.id,
      dateStr: e.scheduled_at,
      actualTime: e.actual_updated_at || e.scheduled_at,
      title: getLabel(e),
      status: e.status,
      subtitle: `นักเรียน ${e.student_count} คน`,
      rawCase: e,
    }));

    combinedList.sort((a, b) => new Date(b.actualTime).getTime() - new Date(a.actualTime).getTime());

    if (combinedList.length === 0) {
      return (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <CalendarDays size={42} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
            ไม่มีกิจกรรมหรือเคสในรายการ
          </p>
          <p style={{ margin: 0, fontSize: '0.813rem' }}>
            ลองเปลี่ยนเดือน หรือคลิกปุ่ม &quot;+ เพิ่มกิจกรรม&quot; ด้านล่างเพื่อเพิ่มข้อมูลใหม่
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {combinedList.map((item) => {
          const ev = item.rawCase;
          return (
            <Link
              key={ev.id}
              href={`/cases/${ev.id}`}
              className="card"
              style={{
                padding: '14px 18px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 'var(--radius-md)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`status-badge status-${ev.status}`}>
                  <span className="status-dot" />
                  {ev.status === 'planned' ? 'วางแผน' : 'เสร็จสิ้น'}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {safeFormatDate(ev.actual_updated_at || ev.scheduled_at, 'd MMM yyyy HH:mm น.')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.938rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {getLabel(ev)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    นักเรียน {ev.student_count} คน
                  </div>
                </div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-container page-container-fluid" style={{ maxWidth: '100%', width: '100%', padding: '24px 28px 48px', boxSizing: 'border-box' }}>
      {/* 1. Header Page Title & Top Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={24} color="var(--primary)" />
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              ปฏิทินโรงเรียน
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              const exportList = events.filter((e) => {
                if (statusFilter === 'planned') return e.status === 'planned';
                if (statusFilter === 'done') return e.status === 'done';
                return true;
              });
              exportMonthlyCasesToExcel(exportList, headerLabel);
            }}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.813rem', minHeight: '38px' }}
            title="ส่งออกเคสเดือนนี้เป็น Excel"
          >
            <FileSpreadsheet size={16} />
            ส่งออก Excel
          </button>
        </div>
      </div>

      {/* 2. Controls Bar (Month Switcher, Views, Filter Tabs) */}
      <div
        className="card"
        style={{
          padding: '14px 16px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--surface)',
        }}
      >
        {/* Navigation Arrows & Today */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('prev')}
            className="btn-secondary"
            style={{ padding: '8px', minHeight: '36px', width: '36px' }}
            title="เดือนก่อนหน้า"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToday}
            className="btn-secondary"
            style={{ padding: '6px 14px', minHeight: '36px', fontSize: '0.813rem', fontWeight: 600 }}
          >
            วันนี้
          </button>
          <button
            onClick={() => navigate('next')}
            className="btn-secondary"
            style={{ padding: '8px', minHeight: '36px', width: '36px' }}
            title="เดือนถัดไป"
          >
            <ChevronRight size={18} />
          </button>

          <h2
            style={{
              fontSize: '1.063rem',
              fontWeight: 700,
              color: 'var(--primary-dark)',
              margin: '0 0 0 8px',
            }}
          >
            {headerLabel}
          </h2>
        </div>

        {/* View Mode Switcher (Month, Week, List) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              background: 'var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              padding: '3px',
              border: '1px solid var(--border)',
            }}
          >
            {[
              { mode: 'month' as ViewMode, icon: <LayoutGrid size={15} />, label: 'เดือน' },
              { mode: 'week' as ViewMode, icon: <CalendarDays size={15} />, label: 'สัปดาห์' },
              { mode: 'list' as ViewMode, icon: <List size={15} />, label: 'รายการ' },
            ].map(({ mode, icon, label }) => {
              const isActive = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.781rem',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    background: isActive ? 'var(--surface)' : 'transparent',
                    color: isActive ? 'var(--primary-dark)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sub-controls: 3 ตัวเลือกสถานะเคส (ทั้งหมด, เคสที่ยังไม่เสร็จ, เคสที่เสร็จแล้ว) และ Checkbox แสดงเฉพาะเคสของฉัน */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* ช่องเลือก 3 ช่อง ข้างล่าง วันนี้: ทั้งหมด | เคสที่ยังไม่เสร็จ | เคสที่เสร็จแล้ว */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '3px',
            gap: '3px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {[
            { key: 'all' as const, label: 'ทั้งหมด' },
            { key: 'planned' as const, label: 'เคสที่ยังไม่เสร็จ', dotColor: '#ea580c' },
            { key: 'done' as const, label: 'เคสที่เสร็จแล้ว', dotColor: '#10b981' },
          ].map((tab) => {
            const isSelected = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.813rem',
                  fontFamily: 'inherit',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                  color: isSelected ? 'var(--primary-dark)' : 'var(--text-secondary)',
                  boxShadow: isSelected ? '0 1px 3px rgba(159, 119, 180, 0.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.dotColor && (
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: tab.dotColor,
                      flexShrink: 0,
                    }}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Checkbox แสดงเฉพาะเคสของฉัน (สำหรับ Admin) */}
        {isAdmin && (
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.813rem',
              color: 'var(--text-primary)',
              fontWeight: 500,
              cursor: 'pointer',
              background: 'var(--surface)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <input
              type="checkbox"
              checked={showMyOnly}
              onChange={(e) => setShowMyOnly(e.target.checked)}
              style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
            />
            <span>แสดงเฉพาะเคสของฉัน</span>
          </label>
        )}
      </div>

      {error && (
        <div
          style={{
            margin: '0 0 16px',
            padding: '12px 16px',
            background: 'var(--event-holiday-bg)',
            color: 'var(--event-holiday-text)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.813rem',
            border: '1px solid var(--event-holiday-border)',
          }}
        >
          {error}
        </div>
      )}

      {/* 4. Calendar Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'list' && renderListView()}
        </>
      )}

      {/* 5. Floating Action Button (FAB) สีม่วง #9f77b4 */}
      <button
        className="fab"
        onClick={() => {
          setCreateCaseDate(undefined);
          setShowCreateCaseModal(true);
        }}
        aria-label="เปิดเคสดูแลนักเรียนใหม่"
        title="เปิดเคสดูแลนักเรียนใหม่"
      >
        <Plus size={26} strokeWidth={2.2} />
      </button>

      {/* 6. Day Cases & Events Modal — ดูรายละเอียดกิจกรรมประจำวัน */}
      {selectedDay && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setSelectedDay(null)}
          style={{ zIndex: 55 }}
        >
          <div className="modal-content" style={{ maxWidth: '520px', padding: '24px' }}>
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '0.813rem', fontWeight: 600, marginBottom: '2px' }}>
                  <CalendarDays size={16} />
                  <span>กิจกรรมและเคสประจำวัน</span>
                </div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {format(selectedDay, 'EEEEที่ d MMMM yyyy', { locale: th })}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content for this day */}
            {(() => {
              const dayCases = [...getCasesForDate(selectedDay)].sort(
                (a, b) =>
                  new Date(b.actual_updated_at || b.scheduled_at).getTime() -
                  new Date(a.actual_updated_at || a.scheduled_at).getTime()
              );
              const daySchoolEvents = getSchoolEventsForDate(selectedDay);
              const totalToday = dayCases.length;

              if (totalToday === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
                    <CalendarDays size={40} strokeWidth={1.5} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ margin: '0 0 6px', fontSize: '0.938rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      ไม่มีเคสดูแลนักเรียนในวันนี้
                    </p>
                    <p style={{ margin: 0, fontSize: '0.813rem' }}>
                      ท่านสามารถกดปุ่มด้านล่างเพื่อเปิดเคสดูแลนักเรียนใหม่สำหรับวันนี้ได้ทันที
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      เคสดูแลนักเรียน ({dayCases.length} เคส)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {dayCases.map((ev) => (
                        <Link
                          key={ev.id}
                          href={`/cases/${ev.id}`}
                          onClick={() => setSelectedDay(null)}
                          className="card"
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '12px 14px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            border: '1px solid var(--border)',
                            textDecoration: 'none',
                            color: 'inherit',
                            borderRadius: 'var(--radius-md)',
                            transition: 'all 0.15s ease',
                            backgroundColor: 'var(--surface)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span className={`status-badge status-${ev.status}`}>
                              <span className="status-dot" />
                              {ev.status === 'planned' ? 'วางแผน' : 'เสร็จสิ้น'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} />
                              {safeFormatDate(ev.actual_updated_at || ev.scheduled_at, 'HH:mm น.')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '0.938rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {getLabel(ev)}
                            </div>
                            <ChevronRight size={18} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                            นักเรียน {ev.student_count} คน
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Bottom Actions */}
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
                  setCreateCaseDate(dateStr);
                  setShowCreateCaseModal(true);
                }}
                className="btn-primary"
                style={{ flex: 1.5 }}
              >
                <Plus size={16} /> + เปิดเคสในวันนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Create Case Modal (เคสดูแลนักเรียน) */}
      {showCreateCaseModal && (
        <CreateCaseModal
          initialDate={createCaseDate}
          onClose={() => {
            setShowCreateCaseModal(false);
            setCreateCaseDate(undefined);
          }}
          onCreated={() => {
            setShowCreateCaseModal(false);
            setCreateCaseDate(undefined);
            fetchEvents();
          }}
        />
      )}

      {/* 8. Event Modal (เพิ่ม/แก้ไขกิจกรรมโรงเรียน) */}
      {showEventModal && (
        <EventModal
          initialDate={eventModalDate}
          initialEvent={editingSchoolEvent}
          onClose={() => {
            setShowEventModal(false);
            setEditingSchoolEvent(null);
          }}
          onSave={handleSaveSchoolEvent}
          onDelete={handleDeleteSchoolEvent}
        />
      )}

      {/* 9. Event Detail Modal (ดูรายละเอียดกิจกรรมโรงเรียน) */}
      {viewingSchoolEvent && (
        <EventDetailModal
          event={viewingSchoolEvent}
          onClose={() => setViewingSchoolEvent(null)}
          onEdit={(eventToEdit) => {
            setViewingSchoolEvent(null);
            setEditingSchoolEvent(eventToEdit);
            setShowEventModal(true);
          }}
        />
      )}
    </div>
  );
}
