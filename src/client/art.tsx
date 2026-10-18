// Ilustracje budynków — proste elewacje frontowe w SVG (spójny styl zamiast emotek).
import type { BuildingType } from '../engine/data.ts';
import { BIG_PROJECTS, projectInfo } from '../engine/data.ts';

const INK = '#3a3226';
const GLASS = '#a8d8ea';
const GLASS_DARK = '#7fb8cf';

function Window({ x, y, w = 6, h = 8 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={GLASS} stroke={INK} strokeWidth={1.2} rx={0.6} />
      <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h} stroke={INK} strokeWidth={0.7} />
      <line x1={x} y1={y + h / 2} x2={x + w} y2={y + h / 2} stroke={INK} strokeWidth={0.7} />
    </g>
  );
}

function Smoke({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#d9d6cf" opacity={0.9} className="art-smoke">
      <circle cx={x} cy={y} r={2.6} />
      <circle cx={x + 3} cy={y - 4} r={3.2} />
      <circle cx={x + 7} cy={y - 8} r={3.6} />
    </g>
  );
}

function Ground() {
  return <rect x={4} y={56} width={56} height={3} rx={1.5} fill={INK} opacity={0.18} />;
}

function House() {
  return (
    <g>
      <Ground />
      <rect x={40} y={14} width={6} height={12} fill="#9c4a3a" stroke={INK} strokeWidth={1.4} />
      <rect x={14} y={30} width={36} height={26} fill="#f6e7c8" stroke={INK} strokeWidth={1.6} />
      <path d="M9 32 L32 12 L55 32 Z" fill="#cf5c43" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <rect x={28} y={42} width={9} height={14} fill="#7a4b2a" stroke={INK} strokeWidth={1.3} rx={0.8} />
      <Window x={17} y={36} w={8} h={8} />
      <Window x={40} y={36} w={8} h={8} />
    </g>
  );
}

function Tenement() {
  return (
    <g>
      <Ground />
      <rect x={12} y={12} width={40} height={44} fill="#e8c88f" stroke={INK} strokeWidth={1.6} />
      <rect x={10} y={9} width={44} height={5} fill="#b9895a" stroke={INK} strokeWidth={1.4} />
      <rect x={10} y={24} width={44} height={2} fill="#b9895a" />
      <rect x={10} y={37} width={44} height={2} fill="#b9895a" />
      {[16, 28.5, 41].map((x) => (
        <g key={x}>
          <Window x={x} y={15} w={7} h={8} />
          <Window x={x} y={28} w={7} h={8} />
        </g>
      ))}
      <Window x={16} y={42} w={7} h={8} />
      <Window x={41} y={42} w={7} h={8} />
      <path d="M28 56 V45 a4 4 0 0 1 8 0 V56 Z" fill="#7a4b2a" stroke={INK} strokeWidth={1.3} />
    </g>
  );
}

function Office() {
  return (
    <g>
      <Ground />
      <rect x={36} y={22} width={18} height={34} fill={GLASS_DARK} stroke={INK} strokeWidth={1.5} />
      <rect x={14} y={6} width={24} height={50} fill="#bfe3f0" stroke={INK} strokeWidth={1.6} />
      <rect x={20} y={2} width={12} height={5} fill="#5d7d8c" stroke={INK} strokeWidth={1.3} />
      {[12, 20, 28, 36, 44].map((y) => (
        <line key={y} x1={14} y1={y} x2={38} y2={y} stroke={INK} strokeWidth={0.8} opacity={0.7} />
      ))}
      {[20, 26, 32].map((x) => (
        <line key={x} x1={x} y1={6} x2={x} y2={56} stroke={INK} strokeWidth={0.8} opacity={0.7} />
      ))}
      {[28, 35, 42, 49].map((y) => (
        <line key={y} x1={36} y1={y} x2={54} y2={y} stroke={INK} strokeWidth={0.8} opacity={0.6} />
      ))}
      <path d="M15 8 L22 8 L15 20 Z" fill="#fff" opacity={0.45} />
    </g>
  );
}

function Sawmill({ level }: { level?: number }) {
  return (
    <g>
      <Ground />
      {level === 2 && <rect x={8} y={30} width={14} height={26} fill="#a87445" stroke={INK} strokeWidth={1.4} />}
      <rect x={18} y={28} width={30} height={28} fill="#c08a5a" stroke={INK} strokeWidth={1.6} />
      {[24, 30, 36, 42].map((x) => (
        <line key={x} x1={x} y1={28} x2={x} y2={56} stroke={INK} strokeWidth={0.7} opacity={0.5} />
      ))}
      <path d="M14 30 L33 16 L52 30 Z" fill="#7d5a3c" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <rect x={28} y={40} width={10} height={16} fill="#5c3b22" stroke={INK} strokeWidth={1.2} />
      <circle cx={33} cy={22} r={5} fill="#d9dde1" stroke={INK} strokeWidth={1.2} />
      <circle cx={33} cy={22} r={1.4} fill={INK} />
      {[
        [48, 52],
        [54, 52],
        [51, 47],
      ].map(([cx, cy]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={3.2} fill="#d6a46c" stroke={INK} strokeWidth={1.1} />
          <circle cx={cx} cy={cy} r={1.2} fill="#a87445" />
        </g>
      ))}
    </g>
  );
}

function Brickworks({ level }: { level?: number }) {
  return (
    <g>
      <Ground />
      <Smoke x={44} y={8} />
      {level === 2 && <Smoke x={18} y={14} />}
      <rect x={40} y={12} width={7} height={24} fill="#8e3b25" stroke={INK} strokeWidth={1.4} />
      {level === 2 && <rect x={14} y={18} width={6} height={18} fill="#8e3b25" stroke={INK} strokeWidth={1.4} />}
      <rect x={10} y={32} width={44} height={24} fill="#c4643f" stroke={INK} strokeWidth={1.6} />
      {[38, 44, 50].map((y) => (
        <line key={y} x1={10} y1={y} x2={54} y2={y} stroke={INK} strokeWidth={0.6} opacity={0.45} />
      ))}
      <path d="M22 56 V46 a6 6 0 0 1 12 0 V56 Z" fill="#3d2418" stroke={INK} strokeWidth={1.2} />
      <path d="M24 56 V48 a4 4 0 0 1 8 0 V56 Z" fill="#f2a541" opacity={0.85} />
      <rect x={40} y={46} width={10} height={4} fill="#d97b52" stroke={INK} strokeWidth={0.9} />
      <rect x={42} y={42} width={10} height={4} fill="#d97b52" stroke={INK} strokeWidth={0.9} />
    </g>
  );
}

function Steelworks({ level }: { level?: number }) {
  return (
    <g>
      <Ground />
      <Smoke x={18} y={6} />
      <Smoke x={30} y={10} />
      {level === 2 && <Smoke x={44} y={8} />}
      <rect x={14} y={10} width={6} height={22} fill="#5b6470" stroke={INK} strokeWidth={1.3} />
      <rect x={27} y={14} width={6} height={18} fill="#5b6470" stroke={INK} strokeWidth={1.3} />
      {level === 2 && <rect x={41} y={12} width={6} height={20} fill="#5b6470" stroke={INK} strokeWidth={1.3} />}
      <path d="M8 56 V32 L18 26 V32 L28 26 V32 L38 26 V32 L48 26 V32 L56 28 V56 Z" fill="#9aa5b1" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      {[13, 23, 33, 43].map((x) => (
        <rect key={x} x={x} y={38} width={7} height={6} fill="#f5a83a" stroke={INK} strokeWidth={1} />
      ))}
      <rect x={26} y={47} width={12} height={9} fill="#4a525c" stroke={INK} strokeWidth={1.2} />
    </g>
  );
}

function Park() {
  return (
    <g>
      <path d="M6 56 Q32 50 58 56 Z" fill="#7fbf6a" />
      <path d="M26 56 Q30 46 40 42" stroke="#e8d9b5" strokeWidth={4} fill="none" strokeLinecap="round" />
      {[
        [17, 32, 11, '#4f9a4a'],
        [44, 26, 13, '#3f8a43'],
        [30, 38, 8, '#62ad57'],
      ].map(([cx, cy, r, c]) => (
        <g key={`${cx}`}>
          <rect x={(cx as number) - 1.5} y={(cy as number) + (r as number) - 3} width={3} height={10} fill="#7a5233" />
          <circle cx={cx} cy={cy} r={r} fill={c as string} stroke={INK} strokeWidth={1.3} />
        </g>
      ))}
      <rect x={46} y={48} width={10} height={2.4} fill="#8a5a36" stroke={INK} strokeWidth={0.8} />
      <line x1={47.5} y1={50} x2={47.5} y2={54} stroke={INK} strokeWidth={1} />
      <line x1={54.5} y1={50} x2={54.5} y2={54} stroke={INK} strokeWidth={1} />
    </g>
  );
}

function Civic({ big }: { big: boolean }) {
  return (
    <g>
      <Ground />
      {big && <path d="M20 20 a12 12 0 0 1 24 0 Z" fill="#e8c25a" stroke={INK} strokeWidth={1.4} />}
      {big && <line x1={32} y1={8} x2={32} y2={3} stroke={INK} strokeWidth={1.3} />}
      <rect x={10} y={50} width={44} height={6} fill="#d8cdb8" stroke={INK} strokeWidth={1.3} />
      <rect x={13} y={46} width={38} height={4} fill="#e6dcc8" stroke={INK} strokeWidth={1.2} />
      <rect x={13} y={26} width={38} height={4} fill="#e6dcc8" stroke={INK} strokeWidth={1.2} />
      <path d="M10 27 L32 14 L54 27 Z" fill="#f1eadb" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      {[17, 25, 33.5, 42].map((x) => (
        <rect key={x} x={x} y={30} width={5} height={16} fill="#f8f3e8" stroke={INK} strokeWidth={1.1} />
      ))}
      <circle cx={32} cy={22} r={2.2} fill={big ? '#e8c25a' : '#c9bda6'} stroke={INK} strokeWidth={0.9} />
    </g>
  );
}

const ART: Record<Exclude<BuildingType, 'public'>, (p: { level?: number }) => React.JSX.Element> = {
  house: House,
  tenement: Tenement,
  office: Office,
  sawmill: Sawmill,
  brickworks: Brickworks,
  steelworks: Steelworks,
  park: Park,
};

export function BuildingArt({
  type,
  level,
  contractId,
  className,
}: {
  type: BuildingType;
  level?: number;
  contractId?: string;
  className?: string;
}) {
  const Art = type === 'public' ? null : ART[type];
  return (
    <span className={`building-art ${className ?? ''}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        {Art ? <Art level={level} /> : <Civic big={!!contractId && !!BIG_PROJECTS[contractId]} />}
      </svg>
      {type === 'public' && contractId && <span className="art-badge">{projectInfo(contractId).icon}</span>}
      {level === 2 && <span className="art-level">II</span>}
    </span>
  );
}

// Panorama miasteczka na ekran startowy.
export function Skyline() {
  const row: { type: BuildingType; level?: number; contractId?: string }[] = [
    { type: 'sawmill' },
    { type: 'house' },
    { type: 'tenement' },
    { type: 'public', contractId: 'ratuszMiejski' },
    { type: 'office' },
    { type: 'park' },
    { type: 'brickworks' },
  ];
  return (
    <div className="skyline" aria-hidden="true">
      {row.map((b, i) => (
        <BuildingArt key={i} {...b} />
      ))}
    </div>
  );
}
