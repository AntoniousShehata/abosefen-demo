export default function Logo({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#ffffff" fillOpacity="0.14" />
      <path d="M32 12c-7 10-13 17-13 25a13 13 0 0 0 26 0c0-8-6-15-13-25z" fill="#ffffff" />
      <path d="M26 39a6 6 0 0 0 6 6" stroke="rgb(var(--c-secondary))" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
