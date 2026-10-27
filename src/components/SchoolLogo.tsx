'use client';

import React from 'react';
import Image from 'next/image';
import horizontalLogo from '../../public/itpctakecare-horizontal.png';

interface SchoolLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function SchoolLogo({ size = 'md' }: SchoolLogoProps) {
  const height = size === 'sm' ? 40 : size === 'lg' ? 62 : 52;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      <Image
        src={horizontalLogo}
        alt="itpctakecare"
        priority
        style={{
          height: `${height}px`,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
}
