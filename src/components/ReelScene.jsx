import { useId } from 'react';

// A demo reel's «video»: a showroom scene drawn in code that moves while the reel plays (the demo has no videos and no
// photographs). `playing` starts and stops its motion; a device that asks for less motion sees it still (index.css).

function Chrome({ id }) {
  return (
    <linearGradient id={id} x1="0" x2="1">
      <stop offset="0" stopColor="#7E7A8C" />
      <stop offset=".45" stopColor="#F6F5FA" />
      <stop offset=".62" stopColor="#B9B5C6" />
      <stop offset="1" stopColor="#686477" />
    </linearGradient>
  );
}

function Tiles({ id }) {
  return (
    <pattern id={id} width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M30 0H0V30" fill="none" stroke="#FFFFFF" strokeOpacity=".07" />
    </pattern>
  );
}

export default function ReelScene({ scene, playing = false, className = '' }) {
  const u = useId().replace(/:/g, '');
  const c = `c${u}`;
  const t = `t${u}`;
  const w = `w${u}`;
  return (
    <svg viewBox="0 0 180 320" preserveAspectRatio="xMidYMid slice" className={`reel-scene ${playing ? 'is-playing' : ''} ${className}`} aria-hidden="true">
      <defs>
        <Chrome id={c} />
        <Tiles id={t} />
        <linearGradient id={w} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={scene === 'shower' ? '#2F3D4C' : scene === 'kitchen' ? '#3A3A33' : '#3B3552'} />
          <stop offset="1" stopColor={scene === 'shower' ? '#18202A' : scene === 'kitchen' ? '#1E1E1A' : '#1E1A2A'} />
        </linearGradient>
      </defs>
      <rect width="180" height="320" fill={`url(#${w})`} />
      <rect width="180" height="210" fill={`url(#${t})`} />
      {scene === 'mixer' && (
        <g>
          <rect x="38" y="30" width="104" height="84" rx="10" fill="#FFFFFF" fillOpacity=".07" stroke="#FFFFFF" strokeOpacity=".14" />
          <rect x="0" y="204" width="180" height="12" fill="#EDEAF3" />
          <rect x="0" y="216" width="180" height="104" fill="#5A4A3F" />
          <ellipse cx="88" cy="205" rx="58" ry="10" fill="#FFFFFF" />
          <ellipse cx="88" cy="206" rx="46" ry="6" fill="#D9D5E4" />
          <rect x="98" y="148" width="16" height="58" rx="7" fill={`url(#${c})`} />
          <rect x="60" y="146" width="48" height="10" rx="5" fill={`url(#${c})`} />
          <g className="reel-lever"><rect x="100" y="132" width="34" height="6" rx="3" fill={`url(#${c})`} transform="rotate(-16 104 135)" /></g>
          <line className="reel-flow" x1="64.5" y1="160" x2="64.5" y2="203" stroke="#A9D8FF" strokeWidth="5" strokeLinecap="round" strokeDasharray="7 5" />
        </g>
      )}
      {scene === 'shower' && (
        <g>
          <rect x="0" y="292" width="180" height="28" fill="#3A4757" />
          <path d="M180 50H116v10" fill="none" stroke={`url(#${c})`} strokeWidth="6" />
          <ellipse cx="88" cy="64" rx="44" ry="8" fill={`url(#${c})`} />
          <g className="reel-rain" stroke="#BFE3FF" strokeWidth="2" strokeLinecap="round" strokeDasharray="12 16" strokeOpacity=".85">
            {[52, 60, 68, 76, 84, 92, 100, 108, 116, 124].map((x) => (
              <line key={x} x1={x} y1="72" x2={x + (x - 88) * 0.25} y2="300" />
            ))}
          </g>
          <circle cx="140" cy="190" r="15" fill={`url(#${c})`} />
          <rect x="138" y="168" width="5" height="22" rx="2.5" fill="#D8D5E2" />
          <rect x="40" y="296" width="100" height="5" rx="2" fill="#9AA3AE" />
        </g>
      )}
      {scene === 'kitchen' && (
        <g>
          <rect x="0" y="200" width="180" height="14" fill="#C9C2B4" />
          <rect x="0" y="214" width="180" height="106" fill="#4B4036" />
          <rect x="34" y="198" width="100" height="16" rx="6" fill="#2E2E2C" />
          <path d="M112 200V120q0-22-22-22H72" fill="none" stroke={`url(#${c})`} strokeWidth="9" strokeLinecap="round" />
          <g className="reel-pull">
            <rect x="62" y="94" width="14" height="22" rx="5" fill={`url(#${c})`} />
            <line className="reel-flow" x1="69" y1="118" x2="69" y2="196" stroke="#A9D8FF" strokeWidth="4" strokeLinecap="round" strokeDasharray="7 5" />
          </g>
        </g>
      )}
    </svg>
  );
}
