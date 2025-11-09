import React from 'react';

interface DaemonLogoProps {
  className?: string;
  size?: number;
}

export default function DaemonLogo({ className = "", size = 24 }: DaemonLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* White circular border */}
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="black"
        stroke="white"
        strokeWidth="2"
      />
      
      {/* Main abstract symbol - eye/bird wing shape */}
      <path
        d="M6 8 L16 10 L14 14 L8 12 Z"
        fill="white"
      />
      
      {/* Inner eye/lens details */}
      <path
        d="M7 9.5 Q9 9 11 9.5 Q9 10 7 10.5 Z"
        fill="black"
      />
      
      <path
        d="M8 10 Q9 10.2 8.5 10.8 Q8 10.6 8 10 Z"
        fill="black"
      />
    </svg>
  );
}
