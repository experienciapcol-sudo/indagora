import React from 'react';
import { AbsoluteFill, Html5Audio, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, Series, Easing } from 'remotion';
import { FPS, PAGINAS, SCENES, fraseFrame } from './timeline';

// ───────────── tokens ─────────────
const C = {
  bg: '#0b1220', panel: '#111a2e', line: '#24324f', text: '#eaf0ff', muted: '#93a4c7',
  accent: '#5b9bff', danger: '#ff6b7a', ok: '#3ddc97', warn: '#f5b942',
};
const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';
const MONO = '"Cascadia Mono", Consolas, monospace';

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const fade = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
const scene = (n: number) => SCENES[n - 1];
// Cuadro (relativo a la escena n) en que se dice una frase.
const at = (n: number, frase: string) => fraseFrame(frase) - scene(n).from;

// Ancla por frase; si la frase aún no está en la narración (audio sin regenerar) cae a una fracción de la escena.
const atSafe = (n: number, frase: string, fraccion: number) => { try { return at(n, frase); } catch { return Math.round(scene(n).dur * fraccion); } };

// ───────────── piezas ─────────────
const Pill: React.FC<{ text: string; tone?: 'info' | 'danger' | 'ok' | 'warn'; from: number; to: number; left?: number; top?: number; big?: boolean }> = ({ text, tone = 'info', from, to, left = 96, top = 12, big }) => {
  const f = useCurrentFrame();
  const o = Math.min(fade(f, from, from + 10), fade(f, to - 10, to, 1, 0));
  if (o <= 0) return null;
  const color = { info: C.accent, danger: C.danger, ok: C.ok, warn: C.warn }[tone];
  return (
    <div style={{ position: 'absolute', left, top, opacity: o, transform: `translateY(${(1 - o) * -8}px)`, background: 'rgba(11,18,32,0.92)', border: `2px solid ${color}`, color: C.text, padding: big ? '14px 24px' : '8px 20px', borderRadius: 14, fontFamily: FONT, fontSize: big ? 34 : 28, fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,.35)', maxWidth: 1500 }}>
      <span style={{ color, marginRight: 10 }}>●</span>{text}
    </div>
  );
};

const LEVELS = ['unexplored', 'opinion', 'one witness', 'confirmed by two roles', 'backed by a document'];
const Meter: React.FC<{ steps: [number, number][]; from: number; to: number; top?: number }> = ({ steps, from, to, top = 70 }) => {
  const f = useCurrentFrame();
  const o = Math.min(fade(f, from, from + 12), fade(f, to - 12, to, 1, 0));
  if (o <= 0) return null;
  let level = steps[0][1];
  for (const [fr, lv] of steps) if (f >= fr) level = lv;
  return (
    <div style={{ position: 'absolute', left: 96, top, opacity: o, display: 'flex', gap: 8, alignItems: 'center', fontFamily: FONT, background: 'rgba(11,18,32,0.92)', padding: '6px 12px', borderRadius: 14, border: `1px solid ${C.line}` }}>
      <span style={{ color: C.muted, fontSize: 22, marginRight: 6 }}>Evidence meter</span>
      {LEVELS.map((l, i) => (
        <span key={l} style={{ fontSize: 22, padding: '6px 14px', borderRadius: 999, fontWeight: 600, background: i === level ? C.accent : 'transparent', color: i === level ? '#04122b' : i < level ? C.text : C.muted, border: `1px solid ${i <= level ? C.accent : C.line}` }}>{l}</span>
      ))}
    </div>
  );
};

type Trozo = { src: string; rate: number; srcS: number };
const Pantalla: React.FC<{ trozos: Trozo[]; children?: React.ReactNode }> = ({ trozos, children }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    <div style={{ position: 'absolute', left: 96, top: 132, width: 1728, height: 850, borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.55)', border: `1px solid ${C.line}` }}>
      <Series>
        {trozos.map((t, i) => (
          <Series.Sequence key={i} durationInFrames={Math.ceil((t.srcS / t.rate) * FPS)}>
            <OffthreadVideo src={staticFile(`clips/${t.src}.mp4`)} playbackRate={t.rate} muted style={{ width: 1728, height: 972 }} />
          </Series.Sequence>
        ))}
      </Series>
    </div>
    {children}
  </AbsoluteFill>
);

// ───────────── escenas ─────────────
const Escena1: React.FC = () => {
  const f = useCurrentFrame();
  const t2 = at(1, 'The real reason');
  const q = fade(f, 6, 26);
  const cambio = fade(f, t2 - 6, t2 + 14);
  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      <div style={{ opacity: q * (1 - cambio * 0.85), transform: `scale(${1 - cambio * 0.06})`, textAlign: 'center', position: 'absolute', top: 250 }}>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 104, color: C.text }}>“The workshop is just lazy.”</div>
        <div style={{ marginTop: 20, fontSize: 34, color: C.muted, letterSpacing: 4, textTransform: 'uppercase' }}>— the owner</div>
      </div>
      <div style={{ opacity: cambio, transform: `translateY(${(1 - cambio) * 30}px)`, position: 'absolute', top: 520, textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: 40, color: C.ok, letterSpacing: 4, textTransform: 'uppercase', fontWeight: 700 }}>Real cause</div>
        <div style={{ fontSize: 76, fontWeight: 700, color: C.text, marginTop: 10 }}>a hardware supplier <span style={{ color: C.warn }}>9.4 days</span> away</div>
        <div style={{ fontSize: 34, color: C.muted, marginTop: 18 }}>the previous supplier: <span style={{ color: C.ok, fontWeight: 700 }}>3.1 days</span></div>
      </div>
    </AbsoluteFill>
  );
};

const Escena2: React.FC = () => {
  const f = useCurrentFrame();
  const lineas: [string, number, string][] = [
    ['Opinions in.', at(2, 'four opinions') - 10, C.text],
    ['Prescriptions out.', at(2, 'recommend something') - 10, C.warn],
    ['Evidence skipped.', at(2, "before you've checked") - 10, C.danger],
  ];
  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      <div>
        {lineas.map(([t, a, col]) => (
          <div key={t} style={{ opacity: fade(f, a, a + 14), transform: `translateX(${(1 - fade(f, a, a + 14)) * -40}px)`, fontSize: 108, fontWeight: 700, color: col, lineHeight: 1.25 }}>{t}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Nodo: React.FC<{ x: number; y: number; w: number; h: number; titulo: string; sub: string; a: number; color: string }> = ({ x, y, w, h, titulo, sub, a, color }) => {
  const f = useCurrentFrame();
  const o = fade(f, a, a + 14);
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: o, transform: `scale(${0.9 + 0.1 * o})`, background: C.panel, border: `2px solid ${color}`, borderRadius: 18, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: FONT }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: C.text }}>{titulo}</div>
      <div style={{ fontSize: 24, color: C.muted, marginTop: 4 }}>{sub}</div>
    </div>
  );
};

const Tarjeta: React.FC<{ x: number; tag: string; sub: string; titulo: string; detalle: string; color: string; o: number }> = ({ x, tag, sub, titulo, detalle, color, o }) => (
  <div style={{ position: 'absolute', left: x, top: 390, width: 760, height: 262, opacity: o, transform: `translateY(${(1 - o) * 26}px)`, background: C.panel, border: `2px solid ${color}`, borderRadius: 20, padding: '24px 32px', boxSizing: 'border-box' }}>
    <div style={{ fontSize: 28, color, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>{tag}</div>
    <div style={{ fontSize: 24, color: C.muted, marginTop: 4 }}>{sub}</div>
    <div style={{ fontSize: 50, color: C.text, fontWeight: 800, marginTop: 20 }}>{titulo}</div>
    <div style={{ fontSize: 23, color: C.muted, marginTop: 8 }}>{detalle}</div>
  </div>
);

const MetodoPanel: React.FC<{ f: number; m: number; pm: number }> = ({ f, m, pm }) => {
  if (pm <= 0) return null;
  const chips = ['Ishikawa', 'Deming’s PDSA', 'Four actions (Kim & Mauborgne)', 'SMART (Doran)', 'Pareto (Juran)', 'Lewin · Kotter · ADKAR'];
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 336, width: '100%', textAlign: 'center', fontSize: 40, fontWeight: 700, color: C.text, opacity: pm }}>The code picks the method from the case</div>
      <Tarjeta x={160} tag="Sudden problem" sub="a start date, and something that still works" titulo="Kepner & Tregoe" detalle="Is / Is Not · then test every cause" color={C.accent} o={fade(f, m + 6, m + 24)} />
      <Tarjeta x={1000} tag="Chronic problem" sub="no clear start, nothing to compare" titulo="Weisbord’s six boxes" detalle="purpose, structure, relationships, rewards, leadership, mechanisms" color={C.warn} o={fade(f, m + 40, m + 58)} />
      <div style={{ position: 'absolute', top: 690, width: '100%', textAlign: 'center', fontSize: 28, color: C.muted, opacity: fade(f, m + 70, m + 86) }}>and, as the evidence allows:</div>
      <div style={{ position: 'absolute', top: 740, width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, padding: '0 50px', boxSizing: 'border-box' }}>
        {chips.map((c, i) => (
          <span key={c} style={{ opacity: fade(f, m + 76 + i * 6, m + 92 + i * 6), fontSize: 25, fontWeight: 600, color: C.text, border: `1.5px solid ${C.ok}`, borderRadius: 999, padding: '7px 18px', background: 'rgba(61,220,151,.08)' }}>{c}</span>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 860, width: '100%', textAlign: 'center', fontSize: 24, color: C.muted, opacity: fade(f, m + 120, m + 136) }}>Declined on purpose: the five whys (one chain tends to confirm the first guess)</div>
    </AbsoluteFill>
  );
};

const Escena3: React.FC = () => {
  const f = useCurrentFrame();
  const ag = at(3, 'One investigating agent');
  const n1 = at(3, 'one reads each');
  const n2 = at(3, 'one maps possible');
  const n3 = at(3, 'one writes the');
  const gate = at(3, 'plain code checks');
  const cx = 960, cy = 640;
  const nodos = [
    { x: 330, y: 560, titulo: 'Interview readers', sub: 'one per source, in parallel', a: n1, color: C.accent },
    { x: 1590, y: 560, titulo: 'Cause mapper', sub: 'possible causes, tested', a: n2, color: C.accent },
    { x: 960, y: 900, titulo: 'Plan writer', sub: 'every line points to a sentence', a: n3, color: C.accent },
  ];
  const og = fade(f, gate - 6, gate + 20);
  const m = atSafe(3, 'The code also', 0.72);
  const pm = fade(f, m, m + 18);
  const dim = 1 - fade(f, m - 8, m + 14);
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <div style={{ position: 'absolute', top: 70, width: '100%', textAlign: 'center', opacity: fade(f, 6, 24) }}>
        <div style={{ fontSize: 118, fontWeight: 800, color: C.text, letterSpacing: -2 }}>Indagora</div>
        <div style={{ fontSize: 36, color: C.muted, marginTop: 6 }}>the organizational diagnosis agent that investigates before it prescribes.</div>
        <div style={{ fontSize: 26, color: C.accent, marginTop: 12 }}>Built on Meta’s Muse models</div>
      </div>
      <div style={{ position: 'absolute', inset: 0, opacity: dim }}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {nodos.map((n, i) => (
          <line key={i} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={C.line} strokeWidth={3} strokeDasharray="8 8" opacity={fade(f, n.a, n.a + 14)} />
        ))}
        <circle cx={cx} cy={cy} r={150} fill={C.panel} stroke={C.accent} strokeWidth={4} opacity={fade(f, ag, ag + 14)} />
        <circle cx={cx} cy={cy} r={190} fill="none" stroke={C.ok} strokeWidth={3} strokeDasharray="14 10" opacity={og} />
        {nodos.map((n, i) => {
          const mx = cx + (n.x - cx) * 0.56, my = cy + (n.y - cy) * 0.56;
          return (
            <g key={i} opacity={og}>
              <rect x={mx - 26} y={my - 26} width={52} height={52} rx={10} transform={`rotate(45 ${mx} ${my})`} fill={C.bg} stroke={C.ok} strokeWidth={3} />
              <text x={mx} y={my + 9} textAnchor="middle" fontSize={26} fill={C.ok} fontFamily={FONT} fontWeight={700}>✓</text>
            </g>
          );
        })}
      </svg>
      <div style={{ position: 'absolute', left: cx - 150, top: cy - 52, width: 300, textAlign: 'center', opacity: fade(f, ag, ag + 14) }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: C.text }}>Investigating</div>
        <div style={{ fontSize: 34, fontWeight: 800, color: C.text }}>agent</div>
      </div>
      {nodos.map((n, i) => <Nodo key={i} {...n} w={400} h={116} />)}
      <div style={{ position: 'absolute', left: cx + 215, top: cy - 110, opacity: og, fontSize: 28, color: C.ok, fontWeight: 700, width: 360 }}>
        Code is the referee:<br /><span style={{ color: C.muted, fontWeight: 400 }}>checks every step, can say no</span>
      </div>
      </div>
      <MetodoPanel f={f} m={m} pm={pm} />
    </AbsoluteFill>
  );
};

const Escena4: React.FC = () => (
  <Pantalla trozos={[{ src: 's4a', rate: 1, srcS: 3 }, { src: 's4b', rate: 9, srcS: 54 }, { src: 's4c', rate: 3, srcS: 14 }, { src: 's4d', rate: 3.4, srcS: 20 }]}>
    <Pill text="Typed notes or audio" from={at(4, 'typed notes')} to={at(4, 'I record a question') } />
    <Pill text="Audio recorded and transcribed for real" from={at(4, 'I record a question')} to={at(4, 'Every sentence gets')} />
    <Pill text="Every sentence gets an ID" tone="ok" from={at(4, 'Every sentence gets')} to={scene(4).dur} />
  </Pantalla>
);

const Escena5: React.FC = () => {
  const dec = at(5, 'The agent declines');
  const blk = at(5, 'the code blocks');
  const mas = at(5, 'It asks for more');
  return (
    <Pantalla trozos={[{ src: 's5a', rate: 9.3, srcS: 28 }, { src: 's5b', rate: 2.7, srcS: 16 }, { src: 's5c', rate: 5.7, srcS: 40 }, { src: 's5d', rate: 3.7, srcS: 24 }]}>
      <Meter from={at(5, 'One person') - 6} to={mas + 40} steps={[[0, 2]]} />
      <Pill text="Typed in as the consultant’s instruction: the owner wants a plan today" tone="warn" from={at(5, 'I even pass')} to={dec - 4} />
      <Pill text="The agent declines: not enough evidence yet" tone="info" from={dec} to={blk - 4} />
      <Pill text="Blocked by code: not enough evidence yet" tone="danger" from={blk} to={mas - 4} />
      <Pill text="“I need more interviews”" tone="ok" from={mas} to={scene(5).dur} />
    </Pantalla>
  );
};

const Escena6: React.FC = () => {
  const a = at(6, 'The agent compares');
  const two = at(6, 'Two people in');
  const doc = at(6, 'the log confirms');
  const cause = at(6, 'Only then');
  return (
    <Pantalla trozos={[{ src: 's6a', rate: 11, srcS: 88 }, { src: 's6b', rate: 8, srcS: 104 }, { src: 's6c', rate: 2.2, srcS: 26 }]}>
      <Meter from={at(6, 'Now add') + 10} to={scene(6).dur} steps={[[0, 2], [two, 3], [doc, 4]]} />
      <Pill text="Now with all four sources: three interviews and the delivery log" tone="ok" from={at(6, 'Now add')} to={at(6, 'Specialist readers') - 4} />
      <Pill text="Specialist readers go through every source in parallel" from={at(6, 'Specialist readers')} to={a - 4} />
      <Pill text="Kepner–Tregoe: where it happens / where it doesn’t" from={a} to={two - 4} />
      <Pill text="Ishikawa: map of possible causes" from={two - 8} to={doc - 4} />
      <Pill text="Stop rule: the agent only names a cause when the evidence holds" tone="ok" from={cause} to={scene(6).dur} />
    </Pantalla>
  );
};

const Trozo7: React.FC<{ src: string; srcS: number; desde: number; hasta: number }> = ({ src, srcS, desde, hasta }) => {
  const alloc = Math.max(8, hasta - desde);
  const rate = Math.min(4, Math.max(0.6, srcS / (alloc / FPS)));
  return (
    <Sequence from={desde} durationInFrames={alloc} premountFor={30}>
      <OffthreadVideo src={staticFile(`clips/${src}.mp4`)} playbackRate={rate} muted style={{ width: 1728, height: 972 }} />
    </Sequence>
  );
};

const Escena7: React.FC = () => {
  const a = 0;
  const b = atSafe(7, 'With one witness', 0.18);
  const c = atSafe(7, 'When a document', 0.42);
  const d = atSafe(7, 'with targets that', 0.72);
  const e = atSafe(7, 'Click any line', 0.86);
  const fin = scene(7).dur;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position: 'absolute', left: 96, top: 132, width: 1728, height: 850, borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.55)', border: `1px solid ${C.line}`, background: '#f4f6f8' }}>
        <Trozo7 src="v7a" srcS={9} desde={a} hasta={b} />
        <Trozo7 src="v7b" srcS={10} desde={b} hasta={c} />
        <Trozo7 src="v7c" srcS={9} desde={c} hasta={d} />
        <Trozo7 src="v7d" srcS={8} desde={d} hasta={e} />
        <Trozo7 src="v7e" srcS={7} desde={e} hasta={fin} />
      </div>
      <Pill text="The finding: backed by a document (level N4)" tone="ok" from={a + 6} to={b - 4} />
      <Pill text="One witness → a small test first (Deming’s PDSA: plan, try, check, adjust)" tone="warn" from={b} to={c - 4} />
      <Pill text="A document backs it → intervention plan (Kim & Mauborgne’s four actions)" tone="ok" from={c} to={d - 4} />
      <Pill text="Targets with a baseline, a date and an owner (Doran’s SMART)" tone="ok" from={d} to={e - 4} />
      <Pill text="Every claim links to the exact sentence" tone="info" from={e} to={fin} />
    </AbsoluteFill>
  );
};

const F7: { caso: string; prompt: number; nota?: string }[] = [
  { caso: 'Workshop', prompt: 3.33 },
  { caso: 'Clinic', prompt: 3.0 },
  { caso: 'Law firm', prompt: 3.0 },
  { caso: 'Hotel', prompt: 3.33, nota: 'one source: stays at “one witness”, as it should' },
  { caso: 'Print shop', prompt: 3.0 },
  { caso: 'Bakery', prompt: 2.0 },
  { caso: 'Support', prompt: 2.5 },
];
const Escena8: React.FC = () => {
  const f = useCurrentFrame();
  const s1 = at(8, 'The single prompt');
  const s2 = at(8, 'The agent did');
  const W = 780;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT, color: C.text, padding: '60px 150px' }}>
      <div style={{ fontSize: 52, fontWeight: 800, color: C.text, opacity: fade(f, 4, 20) }}>Recommendations the evidence didn’t support yet</div>
      <div style={{ fontSize: 28, color: C.muted, marginTop: 6, opacity: fade(f, 8, 24) }}>per run · 7 fictional cases · 3 runs each · agent vs. a single prompt</div>
      <div style={{ display: 'flex', gap: 34, marginTop: 14, fontSize: 26, opacity: fade(f, 8, 24) }}>
        <span><span style={{ color: C.danger }}>■</span> single prompt</span><span><span style={{ color: C.accent }}>■</span> Indagora agent</span>
      </div>
      <div style={{ marginTop: 22 }}>
        {F7.map((r, i) => {
          const g = fade(f, s1 + i * 4, s1 + i * 4 + 26);
          const z = fade(f, s2 + i * 3, s2 + i * 3 + 14);
          return (
            <div key={r.caso} style={{ display: 'flex', alignItems: 'center', height: 92, opacity: fade(f, 10 + i * 3, 24 + i * 3) }}>
              <div style={{ width: 230, flexShrink: 0, fontSize: 34, color: C.text, fontWeight: 600 }}>{r.caso}</div>
              <div style={{ width: W + 150, flexShrink: 0 }}>
                <div style={{ height: 30, display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: (r.prompt / 3.5) * W * g, height: 24, background: C.danger, borderRadius: 6 }} />
                  <span style={{ marginLeft: 12, fontFamily: MONO, fontSize: 26, color: C.danger, opacity: g }}>{r.prompt.toFixed(2)}</span>
                </div>
                <div style={{ height: 30, display: 'flex', alignItems: 'center', marginTop: 6 }}>
                  <div style={{ width: 8, height: 24, background: C.accent, borderRadius: 4, opacity: z }} />
                  <span style={{ marginLeft: 12, fontFamily: MONO, fontSize: 26, color: C.accent, opacity: z }}>0</span>
                </div>
              </div>
              {r.nota && <div style={{ fontSize: 26, color: C.ok, opacity: z, marginLeft: 20 }}>{r.nota}</div>}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const TOOLS: [string, string][] = [
  ['causas', 'Cause testing'],
  ['oracion-n4', 'The exact sentence behind a finding'],
  ['verificacion', 'Verification plan'],
  ['intervencion', 'Intervention plan'],
  ['indicadores', 'Targets: baseline, date, owner'],
  ['oracion-intervencion', 'Every plan line links to a sentence'],
];
const Escena9: React.FC = () => {
  const f = useCurrentFrame();
  const g0 = atSafe(9, 'For a consultant', 0.0) + 6;
  const b = atSafe(9, 'the analysis takes', 0.5);
  const c = atSafe(9, 'Indagora investigates', 0.7);
  const d = atSafe(9, 'The live link', 0.85);
  const rejilla = Math.min(fade(f, g0, g0 + 16), fade(f, c - 14, c, 1, 0));
  const W = 560, H = 315;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT, alignItems: 'center' }}>
      <div style={{ position: 'absolute', top: 56, width: '100%', textAlign: 'center', opacity: fade(f, 8, 28) }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: C.text }}>Hours of synthesis → <span style={{ color: C.ok }}>minutes</span></div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 170, width: '100%', opacity: rejilla, transform: `scale(${0.97 + 0.03 * rejilla})` }}>
        {TOOLS.map(([img, rotulo], k) => {
          const col = k % 3, fila = Math.floor(k / 3);
          const o = fade(f, g0 + k * 14, g0 + k * 14 + 18);
          return (
            <div key={img} style={{ position: 'absolute', left: 80 + col * (W + 40), top: fila * (H + 56), width: W, opacity: o, transform: `translateY(${(1 - o) * 24}px)` }}>
              <div style={{ width: W, height: H, borderRadius: 12, overflow: 'hidden', border: `2px solid ${C.line}`, boxShadow: '0 12px 34px rgba(0,0,0,.5)', background: '#f4f6f8' }}>
                <Img src={staticFile(`paneles/${img}.png`)} style={{ width: W, height: 'auto', display: 'block' }} />
              </div>
              <div style={{ marginTop: 10, fontSize: 26, fontWeight: 700, color: C.text }}><span style={{ color: C.accent }}>●</span> {rotulo}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', bottom: 108, width: '100%', textAlign: 'center', fontSize: 38, color: C.muted, opacity: Math.min(fade(f, b - 6, b + 14), fade(f, c - 14, c, 1, 0)) }}>
        Every claim defensible in front of the client.
      </div>
      <div style={{ position: 'absolute', top: 250, width: '100%', textAlign: 'center', opacity: fade(f, c - 6, c + 16) }}>
        <div style={{ fontSize: 120, fontWeight: 800, color: C.text, letterSpacing: -2 }}>Indagora</div>
        <div style={{ fontSize: 44, color: C.accent }}>investigates before it prescribes.</div>
      </div>
      <div style={{ position: 'absolute', top: 560, width: '100%', textAlign: 'center', opacity: fade(f, d - 6, d + 14) }}>
        <div style={{ fontSize: 52, color: C.text, fontFamily: MONO }}>indagora.experienciapcol.workers.dev</div>
        <div style={{ fontSize: 32, color: C.muted, marginTop: 14, fontFamily: MONO }}>github.com/experienciapcol-sudo/indagora</div>
      </div>
      <div style={{ position: 'absolute', bottom: 120, textAlign: 'center', width: '100%', fontSize: 26, color: C.muted, opacity: fade(f, d, d + 20) }}>
        Built with the Meta Model API · Voice: ElevenLabs · Fictional data only
      </div>
    </AbsoluteFill>
  );
};

// ───────────── subtítulos y audio ─────────────
const Subtitulos: React.FC = () => {
  const f = useCurrentFrame();
  const p = PAGINAS.find((x) => f >= x.inicio - 3 && f <= x.fin + 12);
  if (!p) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 14, display: 'flex', justifyContent: 'center' }}>
      <div style={{ background: 'rgba(5,9,18,0.88)', borderRadius: 14, padding: '10px 26px', fontFamily: FONT, fontSize: 40, fontWeight: 600, lineHeight: 1.25, maxWidth: 1560, textAlign: 'center', color: C.muted }}>
        {p.palabras.map((w, i) => (
          <span key={i} style={{ color: f >= w.desde ? C.text : C.muted }}>{w.t}{i < p.palabras.length - 1 ? ' ' : ''}</span>
        ))}
      </div>
    </div>
  );
};

const ESCENAS = [Escena1, Escena2, Escena3, Escena4, Escena5, Escena6, Escena7, Escena8, Escena9];

export const Demo: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    {SCENES.map((s, i) => {
      const E = ESCENAS[i];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={`Escena ${s.id}`}>
          <E />
        </Sequence>
      );
    })}
    <Html5Audio src={staticFile('narracion-final.mp3')} />
    <Subtitulos />
  </AbsoluteFill>
);
