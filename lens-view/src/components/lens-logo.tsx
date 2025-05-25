import React from 'react';

export function LensLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="lensGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8F8CF3" />
          <stop offset="100%" stopColor="#4F8DFD" />
        </linearGradient>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="27"
        stroke="url(#lensGradient2)"
        strokeWidth="4"
        fill="#181828"
        opacity="0.95"
      />
      <circle
        cx="32"
        cy="32"
        r="13"
        fill="none"
        stroke="url(#lensGradient2)"
        strokeWidth="2.5"
        opacity="0.7"
      />
      <circle
        cx="32"
        cy="32"
        r="4.5"
        fill="#8F8CF3"
        stroke="#fff"
        strokeWidth="1.5"
        opacity="0.85"
      />
      <circle
        cx="40"
        cy="26"
        r="2"
        fill="#fff"
        opacity="0.4"
      />
    </svg>
  );
}
