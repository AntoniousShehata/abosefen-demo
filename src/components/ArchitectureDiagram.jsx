import { useI18n } from '../i18n/I18nProvider.jsx';

// The production system at a glance, drawn as plain SVG (no library, no network). Boxes are laid out left to right
// in every language — a diagram reads the same way for everyone; only its words change.
const SERVICES = ['identity', 'catalog', 'cart', 'orders', 'inventory', 'payment', 'shipping', 'books', 'notification', 'jobs'];

function Box({ x, y, w, h, title, sub, tone = 'service' }) {
  const tones = {
    service: { fill: 'rgb(var(--c-primary) / 0.07)', stroke: 'rgb(var(--c-primary) / 0.35)', text: 'rgb(var(--c-primary-dark))' },
    edge: { fill: '#ffffff', stroke: 'rgb(var(--c-primary) / 0.55)', text: '#1f1f1f' },
    infra: { fill: '#fff7ed', stroke: 'rgb(var(--c-secondary) / 0.6)', text: '#7c2d12' },
  }[tone];
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={tones.fill} stroke={tones.stroke} strokeWidth="1.5" />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 3 : h / 2 + 5)} textAnchor="middle" fontSize="14" fontWeight="700" fill={tones.text}>
        {title}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 15} textAnchor="middle" fontSize="11" fill={tones.text} opacity="0.8">
          {sub}
        </text>
      )}
    </g>
  );
}

const Arrow = ({ d, dashed = false }) => (
  <path d={d} fill="none" stroke="rgb(var(--c-primary) / 0.55)" strokeWidth="1.6" strokeDasharray={dashed ? '5 4' : undefined} markerEnd="url(#arch-arrow)" />
);

export default function ArchitectureDiagram() {
  const { t } = useI18n();
  const a = (key) => t(`engineering.arch.${key}`);
  const col = (i) => 330 + (i % 5) * 126;
  const row = (i) => (i < 5 ? 150 : 250);

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white p-3" dir="ltr">
      <svg viewBox="0 0 980 470" className="min-w-[760px]" role="img" aria-label={a('label')} data-testid="architecture-diagram">
        <defs>
          <marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="rgb(var(--c-primary) / 0.7)" />
          </marker>
        </defs>

        <Box x={20} y={40} w={170} h={64} title={a('browser')} sub={a('browserSub')} tone="edge" />
        <Box x={20} y={150} w={170} h={64} title={a('web')} sub={a('webSub')} tone="edge" />
        <Box x={20} y={260} w={170} h={64} title={a('gateway')} sub={a('gatewaySub')} tone="edge" />
        <Arrow d="M105,104 L105,146" />
        <Arrow d="M105,214 L105,256" />
        <Arrow d="M190,292 C250,292 260,182 322,182" />
        <Arrow d="M190,292 C250,292 260,282 322,282" />

        <text x={645} y={128} textAnchor="middle" fontSize="12" fontWeight="600" fill="#6b7280">
          {a('servicesTitle')}
        </text>
        {SERVICES.map((s, i) => (
          <Box key={s} x={col(i)} y={row(i)} w={114} h={64} title={a(`svc.${s}`)} sub={a(s === 'jobs' ? 'jobsSub' : 'ownDb')} />
        ))}

        <Box x={330} y={356} w={366} h={52} title={a('bus')} sub={a('busSub')} tone="infra" />
        <Box x={712} y={356} w={240} h={52} title={a('workers')} sub={a('workersSub')} tone="infra" />
        <Arrow d="M450,316 L450,352" dashed />
        <Arrow d="M576,316 L576,352" dashed />
        <Arrow d="M832,316 L832,352" dashed />

        <text x={490} y={440} textAnchor="middle" fontSize="11" fill="#6b7280">
          {a('legend')}
        </text>
      </svg>
    </div>
  );
}
