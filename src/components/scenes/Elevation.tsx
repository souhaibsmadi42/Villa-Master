import type { CSSProperties } from 'react';

/**
 * Villa Ajloun — illustrative south elevation at dusk.
 * An original drawing composed from the project's building list (chalet duplex,
 * precast private suite, wellness & gym, pool, courts, boundary wall, guard house)
 * on a terraced Ajloun hillside. It is labelled illustrative and is NOT site
 * photography or the design model. Pure SVG: no requests, crisp at any size.
 *
 * `animated` plays the drafting sequence (lines draw, windows light) using CSS
 * keyframes offset by --intro-delay, so it runs before hydration.
 */

export const VIEW_W = 1600;
export const VIEW_H = 900;

/** Anchor points (viewBox coords) for overlaying data on each building. */
export const BUILDING_ANCHORS: Record<string, { x: number; y: number; label: string }> = {
  guard_house:   { x: 95,   y: 586, label: 'Guard house' },
  private_suite: { x: 315,  y: 540, label: 'Private suite' },
  main_chalet:   { x: 830,  y: 486, label: 'Main chalet' },
  pool:          { x: 905,  y: 678, label: 'Pool' },
  wellness:      { x: 1215, y: 566, label: 'Wellness & gym' },
  courts:        { x: 1470, y: 698, label: 'Courts' },
  boundary_wall: { x: 330,  y: 836, label: 'Boundary wall' },
};

const d = (s: number): CSSProperties => ({ animationDelay: `calc(var(--intro-delay) + ${s}s)` });

// 'wide' extends the landscape to the left and above so the villa can sit right of a text column.
const FRAMES = { default: `0 0 ${VIEW_W} ${VIEW_H}`, wide: '-900 -200 2500 1100' };

export function Elevation({ animated = false, className, fit = 'slice', align = 'xMidYMid', frame = 'default', annotations = true }: {
  animated?: boolean; className?: string; fit?: 'slice' | 'meet'; align?: 'xMidYMid' | 'xMaxYMid' | 'xMaxYMax'; frame?: keyof typeof FRAMES; annotations?: boolean;
}) {
  const draw = (delay: number, len = 1600): CSSProperties | undefined => animated
    ? { strokeDasharray: len, strokeDashoffset: len, animation: `vm-draw 2.2s var(--ease-swoop) forwards`, ['--len' as string]: len, ...d(delay) }
    : undefined;
  const glow = (delay: number, o = 1): CSSProperties | undefined => animated
    ? { opacity: 0, animation: 'vm-glow 1.4s var(--ease-glide) forwards', ['--o' as string]: o, ...d(delay) }
    : { opacity: o };

  return (
    <svg viewBox={FRAMES[frame]} preserveAspectRatio={`${align} ${fit}`} className={className}
      role="img" aria-label="Illustrative south elevation of Villa Ajloun at dusk — not site photography">
      <defs>
        <linearGradient id="el-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0D0E0C" />
          <stop offset=".45" stopColor="#1A1C18" />
          <stop offset=".62" stopColor="#2B2822" />
          <stop offset=".72" stopColor="#4A3D2E" />
        </linearGradient>
        <radialGradient id="el-sun" cx="0.74" cy="0.62" r="0.42">
          <stop offset="0" stopColor="#C9A47A" stopOpacity=".55" />
          <stop offset=".4" stopColor="#8E7356" stopOpacity=".18" />
          <stop offset="1" stopColor="#8E7356" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="el-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F0CF97" />
          <stop offset="1" stopColor="#B88752" />
        </linearGradient>
        <linearGradient id="el-glass-cool" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3F3A" />
          <stop offset="1" stopColor="#24272311" />
        </linearGradient>
        <linearGradient id="el-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CFC5B4" />
          <stop offset="1" stopColor="#A89D8B" />
        </linearGradient>
        <linearGradient id="el-stone-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8F8676" />
          <stop offset="1" stopColor="#6E675B" />
        </linearGradient>
        <linearGradient id="el-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#262823" />
          <stop offset="1" stopColor="#121311" />
        </linearGradient>
        <linearGradient id="el-water" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6F8C8A" stopOpacity="0" />
          <stop offset=".5" stopColor="#B7D0C8" />
          <stop offset="1" stopColor="#6F8C8A" stopOpacity="0" />
        </linearGradient>
        <pattern id="el-course" width="40" height="9" patternUnits="userSpaceOnUse">
          <path d="M0 8.5H40M12 0v8.5M32 0v4" stroke="#5E574C" strokeOpacity=".35" strokeWidth=".8" />
        </pattern>
        <pattern id="el-rubble" width="28" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 13.5H28M0 6.5H28M9 0v6.5M21 7v6.5" stroke="#3D3A33" strokeOpacity=".7" strokeWidth=".8" />
        </pattern>
        <linearGradient id="el-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".55" stopColor="#0D0E0C" stopOpacity="0" />
          <stop offset="1" stopColor="#0D0E0C" stopOpacity=".85" />
        </linearGradient>
      </defs>

      {/* Sky + low sun */}
      <rect x="-900" y="-200" width="2500" height="1100" fill="url(#el-sky)" />
      <rect x="-900" y="-200" width="2500" height="1100" fill="url(#el-sun)" />
      <circle cx="-320" cy="120" r="1.4" fill="#E8E1D5" opacity=".4" /><circle cx="-640" cy="260" r="1" fill="#E8E1D5" opacity=".3" />
      <circle cx="1268" cy="236" r="2" fill="#E8E1D5" opacity=".7" />
      <circle cx="402" cy="168" r="1.2" fill="#E8E1D5" opacity=".45" />
      <circle cx="930" cy="120" r="1" fill="#E8E1D5" opacity=".35" />

      {/* Ajloun hills — far, mid, near */}
      <path d="M-900 500 C -700 470 -520 420 -320 440 S -120 486 0 470 C 160 430 260 452 380 420 S 640 392 760 418 S 1000 450 1120 418 S 1380 380 1600 430 V900 H-900Z" fill="#2A2A25" opacity=".85" />
      <path d="M-900 560 C -720 520 -560 548 -400 530 S -150 500 0 540 C 140 500 300 520 420 496 S 700 470 840 500 S 1100 540 1240 506 S 1470 480 1600 512 V900 H-900Z" fill="#1F201C" />
      {/* pine silhouettes along the mid ridge */}
      <g fill="#171815">
        {Array.from({ length: 68 }, (_, i) => {
          const x = -870 + i * 36.5 + ((i * 17) % 11);
          const y = 508 + Math.sin(i * 0.7) * 16 + ((i * 7) % 9);
          const h = 22 + ((i * 13) % 18);
          return <path key={i} d={`M${x} ${y - h} L${x - h * 0.28} ${y} H${x + h * 0.28}Z`} />;
        })}
      </g>

      {/* Terraced ground with retaining walls */}
      <path d="M-900 628 H470 V688 H1100 V724 H1330 V752 H1600 V900 H-900Z" fill="url(#el-ground)" />
      <rect x="470" y="628" width="10" height="60" fill="url(#el-rubble)" />
      <rect x="1100" y="688" width="8" height="36" fill="url(#el-rubble)" />
      <rect x="1330" y="724" width="8" height="28" fill="url(#el-rubble)" />
      <path d="M-900 628 H470 V688 H1100 V724 H1330 V752 H1600" fill="none" stroke="#B9B0A2" strokeOpacity=".35" strokeWidth="1" style={draw(0.1, 3400)} />

      {/* Guard house */}
      <rect x="62" y="594" width="70" height="34" fill="url(#el-stone-dark)" />
      <rect x="56" y="589" width="82" height="5" fill="#B9B0A2" />
      <rect x="78" y="604" width="22" height="14" fill="url(#el-glass)" style={glow(0.9, .85)} />

      {/* Private suite — precast panels */}
      <rect x="200" y="548" width="232" height="80" fill="url(#el-stone)" />
      {Array.from({ length: 4 }, (_, i) => <path key={i} d={`M${246 + i * 46} 548 V628`} stroke="#7E7668" strokeOpacity=".45" strokeWidth=".8" />)}
      <rect x="194" y="540" width="244" height="8" fill="#DCD3C3" />
      <rect x="228" y="572" width="176" height="34" fill="url(#el-glass)" style={glow(1.05, .9)} />
      <path d="M272 572 V606 M316 572 V606 M360 572 V606" stroke="#2A2620" strokeOpacity=".55" strokeWidth="1.2" />

      {/* Main chalet — duplex: stone base, cantilevered upper storey, deep roof plate */}
      <rect x="560" y="598" width="420" height="90" fill="url(#el-stone)" />
      <rect x="560" y="598" width="420" height="90" fill="url(#el-course)" />
      <rect x="604" y="614" width="300" height="66" fill="url(#el-glass)" style={glow(1.2, .95)} />
      {Array.from({ length: 5 }, (_, i) => <path key={i} d={`M${654 + i * 50} 614 V680`} stroke="#2A2620" strokeOpacity=".6" strokeWidth="1.4" />)}
      <rect x="920" y="626" width="40" height="54" fill="#2F2B25" />
      <rect x="620" y="508" width="420" height="90" fill="#E2D9CA" />
      <rect x="620" y="590" width="420" height="8" fill="#000" opacity=".22" />
      <rect x="660" y="528" width="206" height="58" fill="url(#el-glass)" style={glow(1.35, .92)} />
      <path d="M712 528 V586 M763 528 V586 M814 528 V586" stroke="#2A2620" strokeOpacity=".55" strokeWidth="1.2" />
      <rect x="884" y="520" width="140" height="70" fill="url(#el-course)" />
      <rect x="944" y="534" width="10" height="48" fill="url(#el-glass)" style={glow(1.5, .8)} />
      <rect x="598" y="494" width="466" height="14" fill="#F2ECE2" />
      <rect x="598" y="506" width="466" height="3" fill="#000" opacity=".25" />
      {/* terrace balustrade (glass) */}
      <path d="M560 598 H620" stroke="#E8E1D5" strokeOpacity=".5" />

      {/* Pool along the chalet terrace edge */}
      <rect x="720" y="684" width="300" height="5" fill="url(#el-water)" style={glow(1.6, .9)} />
      <rect x="700" y="688" width="340" height="3" fill="#D8D0C2" opacity=".55" />

      {/* Wellness centre & gym — stone lower, finned glass upper */}
      <rect x="1130" y="650" width="170" height="74" fill="url(#el-stone-dark)" />
      <rect x="1130" y="650" width="170" height="74" fill="url(#el-course)" />
      <rect x="1150" y="676" width="28" height="18" fill="url(#el-glass)" style={glow(1.45, .7)} />
      <rect x="1196" y="676" width="28" height="18" fill="url(#el-glass)" style={glow(1.55, .7)} />
      <rect x="1124" y="574" width="182" height="76" fill="#3B3E38" />
      <rect x="1136" y="586" width="158" height="58" fill="url(#el-glass)" style={glow(1.65, .75)} />
      <g stroke="#2B2D29" strokeWidth="3">{Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${1140 + i * 12.5} 580 V650`} />)}</g>
      <rect x="1118" y="566" width="194" height="8" fill="#D6CDBD" />

      {/* Courts — fenced, paddle glass enclosure */}
      <path d="M1352 752 V700 M1352 700 H1590 M1590 700 V752" stroke="#B9B0A2" strokeOpacity=".55" strokeWidth="1" style={draw(0.6, 400)} />
      <g stroke="#B9B0A2" strokeOpacity=".3" strokeWidth=".8">{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${1372 + i * 18} 700 V752`} />)}</g>
      <rect x="1470" y="716" width="110" height="36" fill="#A9C4C0" opacity=".12" stroke="#A9C4C0" strokeOpacity=".4" />
      <path d="M1352 748 H1590" stroke="#777D68" strokeWidth="3" opacity=".7" />

      {/* Olive & fruit trees */}
      <g fill="#2E3029">
        <circle cx="160" cy="602" r="24" /><rect x="158" y="616" width="4" height="12" />
        <circle cx="508" cy="664" r="18" /><rect x="506" y="676" width="3" height="12" />
        <circle cx="1068" cy="666" r="20" /><rect x="1066" y="680" width="3" height="8" />
        <circle cx="1325" cy="700" r="16" /><rect x="1323" y="712" width="3" height="12" />
      </g>
      <g fill="#262822">
        <path d="M455 628 L440 560 L470 560Z" /><path d="M1112 688 L1098 612 L1126 612Z" />
      </g>

      {/* Foreground boundary wall with gate */}
      <rect x="-900" y="832" width="1660" height="22" fill="url(#el-stone-dark)" />
      <rect x="-900" y="832" width="1660" height="22" fill="url(#el-rubble)" />
      <rect x="840" y="832" width="760" height="22" fill="url(#el-stone-dark)" />
      <rect x="840" y="832" width="760" height="22" fill="url(#el-rubble)" />
      <rect x="752" y="818" width="10" height="36" fill="#8F8676" /><rect x="838" y="818" width="10" height="36" fill="#8F8676" />
      <path d="M766 836 H834" stroke="#AE9270" strokeOpacity=".6" />
      <circle cx="757" cy="815" r="2.5" fill="#F0CF97" style={glow(1.8, .9)} /><circle cx="843" cy="815" r="2.5" fill="#F0CF97" style={glow(1.85, .9)} />

      {/* Atmospheric fade at the base so overlaid text stays legible */}
      <rect x="-900" y="-200" width="2500" height="1100" fill="url(#el-fade)" />

      {annotations && (
        <g fontFamily="var(--font-mono), ui-monospace, monospace" fontSize="10" letterSpacing="1.4" fill="#AE9270">
          {/* Structural grid */}
          <g stroke="#AE9270" strokeOpacity=".45" strokeWidth=".75" strokeDasharray="3 5">
            {[620, 725, 830, 935, 1040].map((x, i) => <path key={x} d={`M${x} 452 V700`} style={draw(0.25 + i * 0.08, 260)} />)}
          </g>
          {['A', 'B', 'C', 'D', 'E'].map((l, i) => (
            <g key={l} style={glow(0.5 + i * 0.08, 1)}>
              <circle cx={620 + i * 105} cy="440" r="9" fill="none" stroke="#AE9270" strokeOpacity=".7" strokeWidth=".8" />
              <text x={620 + i * 105} y="443.5" textAnchor="middle" fontSize="9" fill="#C9AF8C">{l}</text>
            </g>
          ))}
          {/* Level datums */}
          <g stroke="#AE9270" strokeOpacity=".5" strokeWidth=".75">
            <path d="M1050 494 H1110" style={draw(0.7, 60)} /><path d="M1050 598 H1110" style={draw(0.78, 60)} /><path d="M1110 688 H1150" style={draw(0.86, 40)} />
          </g>
          <g style={glow(1.0, .9)}>
            <text x="1056" y="488">▽ ROOF</text>
            <text x="1056" y="592">▽ L1</text>
            <text x="1112" y="682">▽ L0</text>
          </g>
          {/* Dimension line under the chalet */}
          <g stroke="#AE9270" strokeOpacity=".6" strokeWidth=".75" style={draw(0.9, 520)}>
            <path d="M560 770 H1040" /><path d="M560 763 V777 M1040 763 V777 M556 774 L564 766 M1036 774 L1044 766" />
          </g>
          <text x="800" y="790" textAnchor="middle" fill="#B9B0A2" style={glow(1.1, .85)}>MAIN CHALET · DUPLEX</text>
          <text x="316" y="526" textAnchor="middle" fill="#B9B0A2" style={glow(1.15, .75)}>PRIVATE SUITE</text>
          <text x="1215" y="552" textAnchor="middle" fill="#B9B0A2" style={glow(1.2, .75)}>WELLNESS · GYM</text>
          <text x="1470" y="688" textAnchor="middle" fill="#B9B0A2" style={glow(1.25, .75)}>COURTS</text>
          {/* Title block */}
          <g style={glow(1.3, 1)} transform="translate(1270 862)">
            <rect x="0" y="-14" width="316" height="34" fill="none" stroke="#AE9270" strokeOpacity=".45" strokeWidth=".75" />
            <path d="M104 -14 V20" stroke="#AE9270" strokeOpacity=".45" strokeWidth=".75" />
            <text x="10" y="7" fontSize="9" fill="#C9AF8C">VILLA AJLOUN</text>
            <text x="114" y="0" fontSize="8.5" fill="#B9B0A2">SOUTH ELEVATION · ILLUSTRATIVE</text>
            <text x="114" y="13" fontSize="8.5" fill="#8F877A">NOT TO SCALE · NOT SITE PHOTOGRAPHY</text>
          </g>
        </g>
      )}
    </svg>
  );
}
