export function LogoMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <path d="M20 58V30a12 12 0 0 1 12-12h12a12 12 0 0 1 12 12v6" stroke="#4F46E5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="58" r="5" fill="#4F46E5" />
      <path d="m38 48 10 10 20-22" stroke="#4F46E5" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
