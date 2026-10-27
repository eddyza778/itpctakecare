'use client';

import { useState, useEffect } from 'react';
import {
  FileBarChart,
  FileSpreadsheet,
  Printer,
  Users,
  CheckCircle2,
  Clock,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getStudents, getCalendarEvents } from '@/lib/queries';
import type { Student, CalendarEvent } from '@/lib/types';
import { CASE_TYPE_LABELS } from '@/lib/types';
import { exportMonthlyCasesToExcel } from '@/lib/excel';

export default function ReportsPage() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    let isMounted = true;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
    const endOfYear = new Date(now.getFullYear(), 11, 31).toISOString();

    async function loadData(retryCount = 0) {
      try {
        const [s, evs] = await Promise.all([
          getStudents(),
          getCalendarEvents(startOfYear, endOfYear, undefined, currentUser?.id),
        ]);
        if (isMounted) {
          setStudents(s);
          setEvents(evs);
          setLoading(false);
        }
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        if ((rawMsg.includes('unexpected response') || rawMsg.includes('Failed to fetch') || rawMsg.includes('abort')) && retryCount < 2) {
          setTimeout(() => {
            if (isMounted) loadData(retryCount + 1);
          }, 400);
          return;
        }
        if (isMounted) {
          console.warn('Reports fetch notice:', rawMsg);
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [currentUser, authLoading]);

  const totalStudents = students.length;
  const totalCases = events.length;
  const doneCases = events.filter((e) => e.status === 'done').length;
  const plannedCases = events.filter((e) => e.status === 'planned').length;

  // Breakdown by case type
  const typeBreakdown: Record<string, number> = {};
  events.forEach((ev) => {
    const label = ev.case_type === 'other' ? ev.other_text || 'อื่นๆ' : CASE_TYPE_LABELS[ev.case_type];
    typeBreakdown[label] = (typeBreakdown[label] || 0) + 1;
  });



  return (
    <div className="page-container page-container-fluid" style={{ maxWidth: '100%', width: '100%', padding: '24px 28px 48px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-dark)' }}>
            <FileBarChart size={24} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              รายงานและสถิติภาพรวม
            </h1>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => exportMonthlyCasesToExcel(events, 'รายงานสรุปภาพรวมประจำปี 2569')}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.875rem' }}
          >
            <FileSpreadsheet size={16} /> ส่งออก Excel
          </button>
          <button
            onClick={() => window.print()}
            className="btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.875rem' }}
          >
            <Printer size={16} /> พิมพ์รายงาน
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '14px',
              marginBottom: '28px',
            }}
          >
            {/* 1. นักเรียนทั้งหมด */}
            <div
              className="card"
              style={{
                padding: '20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'var(--accent)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  นักเรียนทั้งหมด
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {totalStudents} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>คน</span>
                </div>
              </div>
            </div>

            {/* 2. เคสการดูแลทั้งหมด */}
            <div
              className="card"
              style={{
                padding: '20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'var(--accent)',
                  color: 'var(--primary-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Calendar size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  เคสดูแลในระบบ
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {totalCases} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>เคส</span>
                </div>
              </div>
            </div>

            {/* 3. ดำเนินการเสร็จสิ้น */}
            <div
              className="card"
              style={{
                padding: '20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#e8f7f0',
                  color: '#276749',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  ดูแลเสร็จสิ้นแล้ว
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#276749' }}>
                  {doneCases} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>เคส</span>
                </div>
              </div>
            </div>

            {/* 4. กำลังวางแผน/ดำเนินการ */}
            <div
              className="card"
              style={{
                padding: '20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: '#fef7e6',
                  color: '#c05621',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  กำลังวางแผน / ดำเนินการ
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c05621' }}>
                  {plannedCases} <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>เคส</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Section */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {/* สรุปตามประเภทเคส */}
            <div
              className="card"
              style={{
                padding: '22px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <BookOpen size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  สถิติตามประเภทปัญหาการดูแล
                </h3>
              </div>

              {Object.keys(typeBreakdown).length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  ยังไม่มีข้อมูลเคส
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(typeBreakdown).map(([label, count]) => {
                    const percent = totalCases > 0 ? Math.round((count / totalCases) * 100) : 0;
                    return (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
                          <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>
                            {count} เคส ({percent}%)
                          </span>
                        </div>
                        <div
                          style={{
                            height: '8px',
                            background: 'var(--accent)',
                            borderRadius: '100px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${percent}%`,
                              height: '100%',
                              background: 'var(--primary)',
                              borderRadius: '100px',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>


          </div>
        </>
      )}
    </div>
  );
}
