'use client';

import React from 'react';
import Image from 'next/image';

interface StructLogoProps {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  theme?: 'light' | 'dark';
  className?: string;
}

export function StructLogo({
  size = 36,
  showText = true,
  subtitle = 'Assessment Suite',
  theme = 'light',
  className = '',
}: StructLogoProps) {
  const isDark = theme === 'dark';
  // Aspect ratio of the original logo is 576 x 420 (~1.37:1)
  const logoWidth = Math.round(size * 1.3);
  const logoHeight = size;

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
      }}
    >
      {/* 3D Ribbon Logo Emblem */}
      <div
        style={{
          width: `${logoWidth}px`,
          height: `${logoHeight}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <img
          src="/struct-logo-transparent.png"
          alt="STRUCT Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: isDark
              ? 'drop-shadow(0 4px 12px rgba(2, 132, 199, 0.45))'
              : 'drop-shadow(0 2px 8px rgba(10, 27, 56, 0.18))',
            transition: 'transform 0.2s ease',
          }}
        />
      </div>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              fontSize: `${Math.max(1.15, size * 0.034)}rem`,
              fontWeight: 800,
              letterSpacing: '-0.5px',
              color: isDark ? '#FFFFFF' : '#0A1B38',
              lineHeight: 1.1,
            }}
          >
            STRUCT
          </span>
          {subtitle && (
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                color: isDark ? '#38BDF8' : '#0284C7',
                marginTop: '1px',
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default StructLogo;

