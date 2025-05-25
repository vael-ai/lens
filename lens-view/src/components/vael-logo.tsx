import React from 'react';

export function VaelLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L3 7v10c0 5.1 3.9 9.3 9 10c5.1-.7 9-4.9 9-10V7l-9-5z"
        fill="currentColor"
      />
      <path
        d="M12 5v14"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 9l4 4l4-4"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
