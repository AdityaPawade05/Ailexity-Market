"use client";

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 22"
      fill="none"
      className="inline-block shrink-0"
      aria-label="Verified"
    >
      {/* Starburst / badge shape */}
      <path
        d="M11 0l2.47 3.76 4.41-.88-.88 4.41L20.76 9.76 17 12.24l3.76 2.47-.88 4.41-4.41-.88L13.24 22 11 18.24 8.76 22l-2.47-3.76-4.41.88.88-4.41L-0.76 12.24 3 9.76-0.76 7.29l.88-4.41 4.41.88L6.76 0z"
        fill="#d97706"
        transform="translate(1,0) scale(0.91)"
      />
      {/* Checkmark */}
      <path
        d="M7.5 11.5l2.5 2.5 4.5-5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
