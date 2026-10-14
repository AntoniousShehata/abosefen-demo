import { useId } from 'react';

// Product pictures drawn in code. The demo uses NO photographs: production product photos are manufacturers'
// pictures and must not travel. Each kind of product has a simple drawing; the chosen finish colours it, so picking
// «Matte black» on the product page visibly changes the picture.

const DEFAULT_COLOR = {
  pipe: '#5E9E6E',
  fitting: '#5E9E6E',
  'valve-ball': '#C9A45C',
  toilet: '#F7F7F5',
  basin: '#F7F7F5',
  sink: '#BCC3CB',
  'dish-rack': '#BCC3CB',
  strainer: '#BCC3CB',
  'flex-hose': '#BCC3CB',
  drain: '#BCC3CB',
  generic: '#B8A47E',
};
const CHROME = '#C7CCD4';

function mix(hex, amount) {
  // amount > 0 → towards white, < 0 → towards black
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const target = amount > 0 ? 255 : 0;
  const k = Math.abs(amount);
  const c = (v) => Math.round(v + (target - v) * k);
  return `#${((1 << 24) | (c(r) << 16) | (c(g) << 8) | c(b)).toString(16).slice(1)}`;
}

function isDark(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 90;
}

function Defs({ id, color }) {
  return (
    <defs>
      <linearGradient id={`${id}-h`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={mix(color, -0.25)} />
        <stop offset="0.35" stopColor={mix(color, 0.45)} />
        <stop offset="0.6" stopColor={color} />
        <stop offset="1" stopColor={mix(color, -0.3)} />
      </linearGradient>
      <linearGradient id={`${id}-v`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor={mix(color, 0.5)} />
        <stop offset="0.45" stopColor={color} />
        <stop offset="1" stopColor={mix(color, -0.3)} />
      </linearGradient>
      <radialGradient id={`${id}-r`} cx="0.35" cy="0.35" r="0.8">
        <stop offset="0" stopColor={mix(color, 0.55)} />
        <stop offset="0.6" stopColor={color} />
        <stop offset="1" stopColor={mix(color, -0.3)} />
      </radialGradient>
    </defs>
  );
}

// ── Drawings ────────────────────────────────────────────────────────────────────────────────────
// Each receives { h, v, r } (gradient fills), e (edge colour), c (base colour), a (art options).

const draw = {
  pipe: ({ v, e, a }) => (
    <g>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${i * 8} ${60 + i * 30})`}>
          <rect x="22" y="0" width="150" height="20" rx="4" fill={v} stroke={e} strokeWidth="1.5" />
          <rect x="22" y="12" width="150" height="2.5" fill={a.stripe || '#2F6FD6'} opacity="0.85" />
          <ellipse cx="172" cy="10" rx="4" ry="10" fill={mix(a.color || '#5E9E6E', -0.45)} />
        </g>
      ))}
    </g>
  ),

  fitting: ({ c, e, a }) => {
    const shape = a.shape || 'elbow';
    const tube = (d) => (
      <g>
        <path d={d} fill="none" stroke={e} strokeWidth="34" strokeLinejoin="round" />
        <path d={d} fill="none" stroke={c} strokeWidth="30" strokeLinejoin="round" />
        <path d={d} fill="none" stroke={mix(c, 0.35)} strokeWidth="8" strokeLinejoin="round" opacity="0.7" transform="translate(-5 -5)" />
      </g>
    );
    const socket = (x, y, w, hgt) => <rect x={x} y={y} width={w} height={hgt} rx="5" fill={mix(c, -0.08)} stroke={e} strokeWidth="1.5" />;
    if (shape === 'elbow')
      return (
        <g>
          {tube('M70 165 V100 Q70 70 100 70 H165')}
          {socket(50, 140, 40, 26)}
          {socket(140, 50, 26, 40)}
        </g>
      );
    if (shape === 'elbow45')
      return (
        <g>
          {tube('M45 160 L95 110 H165')}
          {socket(140, 90, 26, 40)}
          <rect x="30" y="135" width="40" height="26" rx="5" transform="rotate(-45 50 148)" fill={mix(c, -0.08)} stroke={e} strokeWidth="1.5" />
        </g>
      );
    if (shape === 'tee')
      return (
        <g>
          {tube('M30 85 H170')}
          {tube('M100 85 V165')}
          {socket(22, 65, 26, 40)}
          {socket(152, 65, 26, 40)}
          {socket(80, 145, 40, 26)}
        </g>
      );
    if (shape === 'coupling')
      return (
        <g>
          <rect x="50" y="72" width="100" height="56" rx="10" fill={c} stroke={e} strokeWidth="2" />
          <rect x="50" y="78" width="100" height="10" fill={mix(c, 0.35)} opacity="0.7" />
          <rect x="96" y="70" width="8" height="60" rx="3" fill={mix(c, -0.15)} />
        </g>
      );
    if (shape === 'adapter')
      return (
        <g>
          <rect x="30" y="76" width="70" height="48" rx="8" fill={c} stroke={e} strokeWidth="2" />
          <rect x="30" y="82" width="70" height="8" fill={mix(c, 0.35)} opacity="0.7" />
          <polygon points="100,70 130,70 140,100 130,130 100,130 92,100" fill="#C9A45C" stroke={mix('#C9A45C', -0.4)} strokeWidth="2" />
          <rect x="138" y="84" width="34" height="32" rx="3" fill="#D8B76E" stroke={mix('#C9A45C', -0.4)} strokeWidth="1.5" />
          {[144, 151, 158, 165].map((x) => (
            <line key={x} x1={x} y1="84" x2={x - 3} y2="116" stroke={mix('#C9A45C', -0.4)} strokeWidth="1.5" />
          ))}
        </g>
      );
    return (
      <g>
        <rect x="55" y="72" width="70" height="56" rx="8" fill={c} stroke={e} strokeWidth="2" />
        <path d="M125 72 H130 Q160 100 130 128 H125 Z" fill={mix(c, -0.1)} stroke={e} strokeWidth="2" />
        <rect x="55" y="78" width="70" height="9" fill={mix(c, 0.35)} opacity="0.7" />
      </g>
    );
  },

  'valve-angle': ({ h, v, r, e }) => (
    <g>
      <ellipse cx="42" cy="112" rx="9" ry="28" fill={v} stroke={e} strokeWidth="1.5" />
      <rect x="44" y="102" width="44" height="20" rx="4" fill={v} stroke={e} strokeWidth="1.5" />
      <circle cx="100" cy="112" r="22" fill={r} stroke={e} strokeWidth="1.5" />
      <rect x="90" y="52" width="20" height="42" rx="3" fill={h} stroke={e} strokeWidth="1.5" />
      <rect x="85" y="44" width="30" height="14" rx="3" fill={h} stroke={e} strokeWidth="1.5" />
      <rect x="120" y="106" width="22" height="12" rx="3" fill={v} stroke={e} strokeWidth="1.5" />
      <rect x="140" y="90" width="22" height="44" rx="8" fill={h} stroke={e} strokeWidth="1.5" />
    </g>
  ),

  'valve-concealed': ({ r, h, e }) => (
    <g>
      <rect x="20" y="40" width="160" height="130" rx="6" fill="#ECEAE6" />
      <rect x="55" y="50" width="90" height="90" rx="14" fill={r} stroke={e} strokeWidth="2" />
      <circle cx="100" cy="95" r="24" fill={h} stroke={e} strokeWidth="2" />
      <rect x="96" y="60" width="8" height="40" rx="4" fill={mix(e, 0.2)} transform="rotate(35 100 95)" />
    </g>
  ),

  'valve-ball': ({ h, v, e, a }) => (
    <g>
      <polygon points="28,82 52,82 60,100 52,118 28,118 22,100" fill={v} stroke={e} strokeWidth="1.5" />
      <polygon points="148,82 172,82 178,100 172,118 148,118 140,100" fill={v} stroke={e} strokeWidth="1.5" />
      <rect x="55" y="80" width="90" height="40" rx="18" fill={h} stroke={e} strokeWidth="1.5" />
      <rect x="94" y="62" width="12" height="20" rx="2" fill={v} stroke={e} strokeWidth="1.5" />
      {a.handle === 'butterfly' ? (
        <g fill="#D64B3A" stroke="#9E2F22" strokeWidth="1.5">
          <path d="M100 58 Q70 34 60 52 Q64 66 100 66 Z" />
          <path d="M100 58 Q130 34 140 52 Q136 66 100 66 Z" />
        </g>
      ) : (
        <rect x="94" y="52" width="80" height="14" rx="7" fill="#D64B3A" stroke="#9E2F22" strokeWidth="1.5" />
      )}
    </g>
  ),

  'flex-hose': ({ c, e, h, a }) => (
    <g>
      <path d="M45 150 C 40 50, 160 50, 155 150" fill="none" stroke={e} strokeWidth="14" strokeLinecap="round" />
      <path d="M45 150 C 40 50, 160 50, 155 150" fill="none" stroke={c} strokeWidth="11" strokeLinecap="round" />
      <path d="M45 150 C 40 50, 160 50, 155 150" fill="none" stroke={mix(c, -0.3)} strokeWidth="11" strokeDasharray="2 3" opacity="0.6" />
      <polygon points="31,148 59,148 63,160 59,172 31,172 27,160" fill={h} stroke={e} strokeWidth="1.5" />
      {a.ends === 'mixer' ? (
        <g>
          <rect x="150" y="146" width="10" height="34" rx="2" fill="#D8B76E" stroke={mix('#C9A45C', -0.4)} strokeWidth="1.5" />
          {[154, 160, 166, 172].map((y) => (
            <line key={y} x1="150" y1={y} x2="160" y2={y + 2} stroke={mix('#C9A45C', -0.4)} />
          ))}
        </g>
      ) : a.ends === 'shower' ? (
        <path d="M143 148 H167 L162 176 H148 Z" fill={h} stroke={e} strokeWidth="1.5" />
      ) : (
        <polygon points="141,148 169,148 173,160 169,172 141,172 137,160" fill={h} stroke={e} strokeWidth="1.5" />
      )}
    </g>
  ),

  drain: ({ h, e, a }) =>
    a.shape === 'linear' ? (
      <g>
        <rect x="15" y="82" width="170" height="36" rx="5" fill={h} stroke={e} strokeWidth="2" />
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={i} x={24 + i * 10} y="90" width="5" height="20" rx="2" fill={mix(e, -0.2)} />
        ))}
      </g>
    ) : (
      <g>
        <rect x="45" y="45" width="110" height="110" rx="10" fill={h} stroke={e} strokeWidth="2" />
        {Array.from({ length: 5 }, (_, row) => row).flatMap((row) =>
          Array.from({ length: 5 }, (_, col) => (
            <rect key={`${row}-${col}`} x={60 + col * 17} y={60 + row * 17} width="10" height="10" rx="3" fill={mix(e, -0.2)} />
          )),
        )}
      </g>
    ),

  trap: ({ h, v, e }) => (
    <g>
      <rect x="92" y="28" width="16" height="56" rx="3" fill={h} stroke={e} strokeWidth="1.5" />
      <rect x="84" y="24" width="32" height="10" rx="3" fill={v} stroke={e} strokeWidth="1.5" />
      <rect x="74" y="80" width="52" height="80" rx="16" fill={h} stroke={e} strokeWidth="1.5" />
      <rect x="126" y="96" width="44" height="16" rx="3" fill={v} stroke={e} strokeWidth="1.5" />
      <ellipse cx="172" cy="104" rx="5" ry="16" fill={v} stroke={e} strokeWidth="1.5" />
    </g>
  ),

  'mixer-basin': ({ h, v, e, a }) => {
    const tall = a.shape === 'tall';
    const top = tall ? 38 : 72;
    const radius = a.shape === 'round' ? 14 : a.shape === 'square' ? 2 : 7;
    return (
      <g>
        <ellipse cx="108" cy="166" rx="40" ry="8" fill={v} stroke={e} strokeWidth="1.5" />
        <rect x="92" y={top} width="32" height={166 - top} rx={radius} fill={h} stroke={e} strokeWidth="1.5" />
        <rect x="38" y={top + 6} width="60" height="16" rx={radius > 7 ? 8 : radius} fill={v} stroke={e} strokeWidth="1.5" />
        <rect x="38" y={top + 18} width="14" height="10" rx="2" fill={mix(e, -0.1)} />
        <path d={`M108 ${top} L150 ${top - 16}`} stroke={e} strokeWidth="11" strokeLinecap="round" />
        <path d={`M108 ${top} L150 ${top - 16}`} stroke={v} strokeWidth="8" strokeLinecap="round" />
      </g>
    );
  },

  'mixer-kitchen': ({ h, v, c, e, a }) => {
    const arc = a.shape === 'goose' ? 'M110 112 V52 A38 38 0 0 0 34 52 V82' : 'M110 112 V72 A32 32 0 0 0 46 72 V92';
    return (
      <g>
        <ellipse cx="110" cy="168" rx="36" ry="7" fill={v} stroke={e} strokeWidth="1.5" />
        <rect x="96" y="108" width="28" height="60" rx="8" fill={h} stroke={e} strokeWidth="1.5" />
        <path d={arc} fill="none" stroke={e} strokeWidth="15" strokeLinecap="round" />
        <path d={arc} fill="none" stroke={c} strokeWidth="11" strokeLinecap="round" />
        <path d={arc} fill="none" stroke={mix(c, 0.5)} strokeWidth="3" strokeLinecap="round" transform="translate(-2 -2)" opacity="0.7" />
        {a.shape === 'pullout' && <rect x={a.shape === 'goose' ? 26 : 38} y="88" width="16" height="22" rx="5" fill={mix(c, -0.25)} stroke={e} strokeWidth="1.5" />}
        <path d="M124 124 L156 112" stroke={e} strokeWidth="10" strokeLinecap="round" />
        <path d="M124 124 L156 112" stroke={v} strokeWidth="7" strokeLinecap="round" />
      </g>
    );
  },

  'mixer-bath': ({ h, v, c, e, a }) => (
    <g>
      <rect x="18" y="40" width="10" height="130" fill="#ECEAE6" />
      <circle cx="44" cy="92" r="14" fill={v} stroke={e} strokeWidth="1.5" />
      <circle cx="156" cy="92" r="14" fill={v} stroke={e} strokeWidth="1.5" />
      <rect x="40" y="80" width="120" height="26" rx="13" fill={h} stroke={e} strokeWidth="1.5" />
      {a.shape === 'wallKitchen' ? (
        <g>
          <path d="M100 106 V122 Q100 140 120 140 H170" fill="none" stroke={e} strokeWidth="13" strokeLinecap="round" />
          <path d="M100 106 V122 Q100 140 120 140 H170" fill="none" stroke={c} strokeWidth="9" strokeLinecap="round" />
        </g>
      ) : a.shape === 'shower' ? (
        <rect x="92" y="106" width="16" height="14" rx="3" fill={v} stroke={e} strokeWidth="1.5" />
      ) : (
        <g>
          <rect x="88" y="106" width="24" height="30" rx="4" fill={h} stroke={e} strokeWidth="1.5" />
          <rect x="86" y="132" width="28" height="8" rx="3" fill={mix(e, -0.1)} />
        </g>
      )}
      <rect x="95" y="62" width="10" height="20" fill={v} stroke={e} strokeWidth="1.5" />
      <path d="M100 64 L140 52" stroke={e} strokeWidth="11" strokeLinecap="round" />
      <path d="M100 64 L140 52" stroke={v} strokeWidth="8" strokeLinecap="round" />
    </g>
  ),

  'mixer-concealed': ({ r, h, v, e, c, a }) => (
    <g>
      <rect x="10" y="30" width="180" height="150" rx="6" fill="#ECEAE6" />
      <circle cx={a.shape === 'bidet' ? 80 : 100} cy="100" r="46" fill={r} stroke={e} strokeWidth="2" />
      <circle cx={a.shape === 'bidet' ? 80 : 100} cy="100" r="14" fill={h} stroke={e} strokeWidth="1.5" />
      <path d={`M${a.shape === 'bidet' ? 80 : 100} 100 L${a.shape === 'bidet' ? 112 : 142} 78`} stroke={e} strokeWidth="11" strokeLinecap="round" />
      <path d={`M${a.shape === 'bidet' ? 80 : 100} 100 L${a.shape === 'bidet' ? 112 : 142} 78`} stroke={v} strokeWidth="8" strokeLinecap="round" />
      {a.shape === 'bidet' && (
        <g>
          <path d="M120 128 Q150 170 160 120" fill="none" stroke={mix(c, -0.2)} strokeWidth="5" />
          <rect x="150" y="74" width="16" height="50" rx="7" fill={h} stroke={e} strokeWidth="1.5" transform="rotate(12 158 99)" />
        </g>
      )}
    </g>
  ),

  'bidet-spray': ({ h, v, c, e }) => (
    <g>
      <rect x="20" y="40" width="40" height="40" rx="8" fill={v} stroke={e} strokeWidth="1.5" />
      <rect x="35" y="30" width="10" height="14" fill={h} stroke={e} strokeWidth="1.5" />
      <path d="M40 80 Q40 170 110 150" fill="none" stroke={mix(c, -0.25)} strokeWidth="6" />
      <g transform="rotate(-30 130 100)">
        <rect x="110" y="70" width="26" height="80" rx="11" fill={h} stroke={e} strokeWidth="1.5" />
        <rect x="106" y="62" width="34" height="18" rx="6" fill={v} stroke={e} strokeWidth="1.5" />
        <rect x="118" y="88" width="10" height="18" rx="4" fill={mix(c, -0.3)} />
      </g>
    </g>
  ),

  'shower-column': ({ h, v, c, e, a }) => (
    <g>
      <rect x="128" y="34" width="10" height="140" rx="4" fill={h} stroke={e} strokeWidth="1.5" />
      <rect x="54" y="30" width="84" height="8" rx="4" fill={v} stroke={e} strokeWidth="1.5" />
      {a.shape === 'square' ? (
        <rect x="24" y="38" width="64" height="10" rx="2" fill={v} stroke={e} strokeWidth="1.5" />
      ) : (
        <ellipse cx="56" cy="42" rx="34" ry="7" fill={v} stroke={e} strokeWidth="1.5" />
      )}
      {[34, 44, 54, 64, 74].map((x) => (
        <line key={x} x1={x} y1="52" x2={x - 2} y2="66" stroke="#7FB6E0" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      ))}
      <rect x="110" y="140" width="46" height="18" rx="9" fill={h} stroke={e} strokeWidth="1.5" />
      <rect x="148" y="132" width="20" height="8" rx="4" fill={v} stroke={e} strokeWidth="1.5" />
      <g transform="rotate(-18 150 96)">
        <rect x="144" y="70" width="14" height="56" rx="6" fill={h} stroke={e} strokeWidth="1.5" />
        <ellipse cx="151" cy="70" rx="12" ry="6" fill={v} stroke={e} strokeWidth="1.5" />
      </g>
      <path d="M152 126 Q170 170 130 172" fill="none" stroke={mix(c, -0.25)} strokeWidth="4" />
    </g>
  ),

  'hand-shower': ({ h, v, c, e, a }) => (
    <g>
      {a.shape === 'rail' && (
        <g>
          <rect x="146" y="28" width="9" height="146" rx="4" fill={h} stroke={e} strokeWidth="1.5" />
          <rect x="140" y="64" width="22" height="14" rx="4" fill={v} stroke={e} strokeWidth="1.5" />
        </g>
      )}
      <g transform="rotate(-25 90 95)">
        <circle cx="90" cy="52" r="26" fill={v} stroke={e} strokeWidth="1.5" />
        <circle cx="90" cy="52" r="17" fill={mix(c, -0.15)} />
        {[-8, 0, 8].flatMap((dx) => [-8, 0, 8].map((dy) => <circle key={`${dx}${dy}`} cx={90 + dx} cy={52 + dy} r="1.8" fill={mix(c, -0.45)} />))}
        <rect x="82" y="76" width="16" height="70" rx="7" fill={h} stroke={e} strokeWidth="1.5" />
      </g>
      <path d="M118 148 Q130 182 70 178 Q40 176 46 150" fill="none" stroke={mix(c, -0.2)} strokeWidth="5" />
    </g>
  ),

  toilet: ({ c, e, a }) => {
    const shade = mix(c, -0.12);
    if (a.shape === 'wallhung') {
      return (
        <g>
          <rect x="164" y="20" width="16" height="165" fill="#E4E1DB" />
          <rect x="140" y="44" width="22" height="30" rx="3" fill={mix(c, -0.05)} stroke={e} strokeWidth="1.5" />
          <path d="M32 100 H164 V114 Q160 152 116 156 L100 156 Q40 152 32 114 Z" fill={c} stroke={e} strokeWidth="2" />
          <rect x="28" y="92" width="136" height="10" rx="5" fill={shade} stroke={e} strokeWidth="1.5" />
        </g>
      );
    }
    return (
      <g>
        <rect x="122" y="34" width="44" height={a.shape === 'onepiece' ? 70 : 64} rx="10" fill={c} stroke={e} strokeWidth="2" />
        <rect x="118" y="30" width="52" height="10" rx="4" fill={shade} stroke={e} strokeWidth="1.5" />
        <circle cx="144" cy="35" r="3" fill={mix(e, -0.1)} />
        <path d="M30 104 H160 V118 Q158 152 116 160 L112 182 H74 L80 160 Q36 152 30 118 Z" fill={c} stroke={e} strokeWidth="2" />
        <rect x="26" y="96" width="136" height="10" rx="5" fill={shade} stroke={e} strokeWidth="1.5" />
        <rect x="64" y="180" width="58" height="6" rx="3" fill={shade} stroke={e} strokeWidth="1" />
      </g>
    );
  },

  basin: ({ c, e, h, a }) => {
    const shade = mix(c, -0.12);
    const tap = <rect x="94" y="60" width="12" height="22" rx="3" fill={h} stroke={mix(CHROME, -0.4)} strokeWidth="1.2" />;
    if (a.shape === 'countertop')
      return (
        <g>
          <rect x="20" y="128" width="160" height="16" rx="3" fill="#C9B79C" stroke="#9C8A6E" strokeWidth="1.5" />
          <path d="M45 86 H155 Q155 128 100 128 Q45 128 45 86 Z" fill={c} stroke={e} strokeWidth="2" />
          <ellipse cx="100" cy="86" rx="55" ry="6" fill={shade} stroke={e} strokeWidth="1.5" />
          <rect x="150" y="70" width="10" height="58" rx="3" fill={h} stroke={mix(CHROME, -0.4)} strokeWidth="1.2" />
          <rect x="124" y="70" width="34" height="8" rx="3" fill={h} stroke={mix(CHROME, -0.4)} strokeWidth="1.2" />
        </g>
      );
    if (a.shape === 'cabinet')
      return (
        <g>
          <rect x="34" y="102" width="132" height="76" rx="4" fill="#B98B5E" stroke="#8A6440" strokeWidth="2" />
          <line x1="100" y1="106" x2="100" y2="174" stroke="#8A6440" strokeWidth="2" />
          <rect x="90" y="132" width="4" height="16" rx="2" fill="#E8E2D8" />
          <rect x="106" y="132" width="4" height="16" rx="2" fill="#E8E2D8" />
          <rect x="28" y="86" width="144" height="18" rx="6" fill={c} stroke={e} strokeWidth="2" />
          {tap}
        </g>
      );
    return (
      <g>
        {a.shape === 'wall' && <rect x="20" y="30" width="160" height="10" fill="#E4E1DB" />}
        <path d="M34 84 H166 Q166 124 100 126 Q34 124 34 84 Z" fill={c} stroke={e} strokeWidth="2" />
        <rect x="30" y="78" width="140" height="10" rx="5" fill={shade} stroke={e} strokeWidth="1.5" />
        {a.shape === 'pedestal' ? (
          <path d="M86 124 L80 182 H120 L114 124 Z" fill={c} stroke={e} strokeWidth="2" />
        ) : (
          <g>
            <rect x="94" y="126" width="12" height="24" fill={h} stroke={mix(CHROME, -0.4)} strokeWidth="1.2" />
            <rect x="88" y="148" width="24" height="18" rx="7" fill={h} stroke={mix(CHROME, -0.4)} strokeWidth="1.2" />
          </g>
        )}
        {tap}
      </g>
    );
  },

  sink: ({ c, e, a }) => {
    const bowl = mix(c, -0.18);
    const bowls = a.bowls || 1;
    const right = a.drainer ? 110 : 160;
    const width = (right - 40 - (bowls - 1) * 8) / bowls;
    const dots = a.speckle
      ? Array.from({ length: 60 }, (_, i) => {
          const x = 28 + ((i * 37) % 145);
          const y = 58 + ((i * 53) % 85);
          return <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.9} fill={mix(c, i % 2 ? 0.45 : -0.4)} opacity="0.8" />;
        })
      : null;
    return (
      <g>
        <rect x="22" y="52" width="156" height="96" rx="12" fill={c} stroke={e} strokeWidth="2" />
        {dots}
        {Array.from({ length: bowls }, (_, i) => {
          const x = 36 + i * (width + 8);
          return (
            <g key={i}>
              <rect x={x} y="66" width={width} height="68" rx="12" fill={bowl} stroke={e} strokeWidth="1.5" />
              <circle cx={x + width / 2} cy="112" r="6" fill={mix(c, -0.45)} />
              <circle cx={x + width / 2} cy="112" r="3" fill={mix(c, 0.3)} />
            </g>
          );
        })}
        {a.drainer &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1={124 + i * 8} y1="70" x2={124 + i * 8} y2="130" stroke={mix(c, -0.25)} strokeWidth="2" strokeLinecap="round" />
          ))}
        <circle cx={a.drainer ? 116 : 166} cy="60" r="4" fill={mix(c, -0.35)} />
      </g>
    );
  },

  set: ({ a, id }) =>
    a.shape === 'kitchen' ? (
      <g>
        <g transform="translate(0 30) scale(0.75)">{draw.sink({ c: '#BCC3CB', e: mix('#BCC3CB', -0.45), a: { bowls: 1 } })}</g>
        <g transform="translate(95 15) scale(0.55)">
          {draw['mixer-kitchen']({ h: `url(#${id}-chrome-h)`, v: `url(#${id}-chrome-v)`, c: CHROME, e: mix(CHROME, -0.45), a: { shape: 'pullout' } })}
        </g>
      </g>
    ) : (
      <g>
        <g transform="translate(-6 40) scale(0.62)">{draw.toilet({ c: '#F7F7F5', e: mix('#F7F7F5', -0.4), a: { shape: 'onepiece' } })}</g>
        <g transform="translate(86 46) scale(0.6)">
          {draw.basin({ c: '#F7F7F5', e: mix('#F7F7F5', -0.4), h: `url(#${id}-chrome-h)`, a: { shape: 'pedestal' } })}
        </g>
      </g>
    ),

  'towel-bar': ({ h, v, e }) => (
    <g>
      <rect x="10" y="50" width="180" height="110" rx="6" fill="#ECEAE6" />
      <circle cx="40" cy="96" r="13" fill={v} stroke={e} strokeWidth="1.5" />
      <circle cx="160" cy="96" r="13" fill={v} stroke={e} strokeWidth="1.5" />
      <rect x="36" y="90" width="128" height="12" rx="6" fill={h} stroke={e} strokeWidth="1.5" />
      <path d="M70 102 V148 H130 V102" fill="#E7D9C3" stroke="#BFAF95" strokeWidth="1.5" />
    </g>
  ),

  'roll-holder': ({ h, v, e }) => (
    <g>
      <rect x="10" y="40" width="180" height="130" rx="6" fill="#ECEAE6" />
      <rect x="40" y="70" width="26" height="40" rx="8" fill={v} stroke={e} strokeWidth="1.5" />
      <rect x="60" y="84" width="80" height="10" rx="5" fill={h} stroke={e} strokeWidth="1.5" />
      <rect x="74" y="68" width="60" height="44" rx="10" fill="#FBFBFA" stroke="#D3D0CA" strokeWidth="1.5" />
      <ellipse cx="134" cy="90" rx="8" ry="22" fill="#F0EFEC" stroke="#D3D0CA" strokeWidth="1.5" />
      <path d="M80 112 V150 H120" fill="none" stroke="#D3D0CA" strokeWidth="1.5" />
    </g>
  ),

  hook: ({ h, v, e }) => (
    <g>
      <rect x="10" y="40" width="180" height="130" rx="6" fill="#ECEAE6" />
      <circle cx="100" cy="72" r="20" fill={v} stroke={e} strokeWidth="1.5" />
      <path d="M100 82 V128 Q100 146 120 146 Q136 146 136 128" fill="none" stroke={e} strokeWidth="13" strokeLinecap="round" />
      <path d="M100 82 V128 Q100 146 120 146 Q136 146 136 128" fill="none" stroke={h} strokeWidth="9" strokeLinecap="round" />
    </g>
  ),

  'soap-dish': ({ h, v, e }) => (
    <g>
      <rect x="10" y="40" width="180" height="130" rx="6" fill="#ECEAE6" />
      <circle cx="44" cy="96" r="14" fill={v} stroke={e} strokeWidth="1.5" />
      <rect x="44" y="104" width="56" height="10" rx="5" fill={h} stroke={e} strokeWidth="1.5" />
      <ellipse cx="128" cy="112" rx="44" ry="12" fill={h} stroke={e} strokeWidth="1.5" />
      <rect x="106" y="88" width="44" height="20" rx="10" fill="#B9D7C4" stroke="#8DB79D" strokeWidth="1.5" />
    </g>
  ),

  'acc-set': (args) => (
    <g>
      <rect x="10" y="30" width="180" height="150" rx="6" fill="#ECEAE6" />
      <g transform="translate(5 0) scale(0.5)">{draw['towel-bar'](args)}</g>
      <g transform="translate(95 0) scale(0.5)">{draw.hook(args)}</g>
      <g transform="translate(5 85) scale(0.5)">{draw['roll-holder'](args)}</g>
      <g transform="translate(95 85) scale(0.5)">{draw['soap-dish'](args)}</g>
    </g>
  ),

  'dish-rack': ({ h, e }) => (
    <g>
      {[60, 80, 100, 120].map((x, i) => (
        <ellipse key={x} cx={x} cy="96" rx="9" ry="38" fill={['#F4F1EA', '#DCE8F1', '#F4F1EA', '#F0DCCF'][i]} stroke="#BDB6A8" strokeWidth="1.5" />
      ))}
      <rect x="30" y="110" width="140" height="40" rx="6" fill="none" stroke={e} strokeWidth="4" />
      {[45, 60, 75, 90, 105, 120, 135, 150].map((x) => (
        <line key={x} x1={x} y1="110" x2={x} y2="150" stroke={e} strokeWidth="2.5" />
      ))}
      <rect x="140" y="80" width="30" height="34" rx="4" fill="none" stroke={h} strokeWidth="3" />
      <rect x="36" y="150" width="8" height="12" fill={e} />
      <rect x="156" y="150" width="8" height="12" fill={e} />
    </g>
  ),

  dispenser: ({ h, v, e }) => (
    <g>
      <rect x="20" y="96" width="160" height="12" rx="3" fill="#C9B79C" stroke="#9C8A6E" strokeWidth="1.5" />
      <rect x="84" y="108" width="32" height="64" rx="8" fill="#E8F1EC" stroke="#A9C3B3" strokeWidth="1.5" />
      <rect x="90" y="72" width="20" height="26" rx="5" fill={h} stroke={e} strokeWidth="1.5" />
      <rect x="80" y="62" width="40" height="12" rx="6" fill={v} stroke={e} strokeWidth="1.5" />
      <path d="M118 66 H146 V76" fill="none" stroke={e} strokeWidth="7" strokeLinecap="round" />
      <path d="M118 66 H146 V76" fill="none" stroke={v} strokeWidth="4" strokeLinecap="round" />
    </g>
  ),

  strainer: ({ c, e }) => (
    <g>
      <circle cx="100" cy="100" r="62" fill={c} stroke={e} strokeWidth="2" />
      <circle cx="100" cy="100" r="46" fill={mix(c, -0.15)} stroke={e} strokeWidth="1.5" />
      {[0, 1, 2, 3].flatMap((ring) =>
        Array.from({ length: 6 + ring * 6 }, (_, i) => {
          const angle = (i / (6 + ring * 6)) * Math.PI * 2;
          const radius = 10 + ring * 10;
          return <circle key={`${ring}-${i}`} cx={100 + Math.cos(angle) * radius} cy={100 + Math.sin(angle) * radius} r="2.2" fill={mix(c, -0.5)} />;
        }),
      )}
      <circle cx="100" cy="100" r="6" fill={mix(c, -0.4)} />
    </g>
  ),

  generic: ({ c, e }) => (
    <g>
      <path d="M100 40 L160 70 L100 100 L40 70 Z" fill={mix(c, 0.3)} stroke={e} strokeWidth="2" />
      <path d="M40 70 L100 100 V164 L40 134 Z" fill={c} stroke={e} strokeWidth="2" />
      <path d="M160 70 L100 100 V164 L160 134 Z" fill={mix(c, -0.15)} stroke={e} strokeWidth="2" />
    </g>
  ),
};

/**
 * @param {{ art?: { kind: string, finishHex?: string, color?: string }, color?: string, className?: string, label?: string }} props
 * `color` (a chosen variant's colour) beats the product's own finish.
 */
export default function ProductArt({ art, color, className = '', label }) {
  const reactId = useId();
  const id = `art${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const kind = art && draw[art.kind] ? art.kind : 'generic';
  const base = color || art?.finishHex || art?.color || DEFAULT_COLOR[kind] || CHROME;
  const e = mix(base, isDark(base) ? 0.35 : -0.45);
  const args = {
    id,
    a: art || {},
    c: base,
    e,
    h: `url(#${id}-h)`,
    v: `url(#${id}-v)`,
    r: `url(#${id}-r)`,
  };
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={label || kind} xmlns="http://www.w3.org/2000/svg">
      <Defs id={id} color={base} />
      <Defs id={`${id}-chrome`} color={CHROME} />
      {draw[kind](args)}
    </svg>
  );
}
