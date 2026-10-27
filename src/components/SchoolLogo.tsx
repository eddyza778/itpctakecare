'use client';

import React from 'react';

interface SchoolLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function SchoolLogo({ size = 'md', showText = true }: SchoolLogoProps) {
  const iconSize = size === 'sm' ? 36 : size === 'lg' ? 56 : 44;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Emblem / Badge */}
      <div
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          borderRadius: size === 'sm' ? '10px' : '14px',
          background: 'linear-gradient(135deg, #9f77b4 0%, #7b5391 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(159, 119, 180, 0.35)',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative ring */}
        <div
          style={{
            position: 'absolute',
            inset: '2px',
            borderRadius: size === 'sm' ? '8px' : '12px',
            border: '1px dashed rgba(255, 255, 255, 0.4)',
            pointerEvents: 'none',
          }}
        />

        {/* Vector SVG Emblem for Demonstration School */}
        <svg
          width={iconSize * 0.62}
          height={iconSize * 0.62}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Graduation cap & Book symbol */}
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div
            style={{
              fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '0.96rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.25,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            สาธิต มช.
          </div>
          <div
            style={{
              fontSize: size === 'sm' ? '0.688rem' : '0.75rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              lineHeight: 1.2,
              marginTop: '2px',
              whiteSpace: 'nowrap',
            }}
          >
            อนุบาลและประถมศึกษา
          </div>
        </div>
      )}
    </div>
  );
}
