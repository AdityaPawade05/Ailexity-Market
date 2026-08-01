export function StarRating({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          fill={n <= Math.round(value) ? "#111112" : "#d4d4d8"}
        >
          <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.77l-5.21 2.75 1-5.8-4.21-4.1 5.82-.85L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}
