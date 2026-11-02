// Juego único de iconos SVG de Indagora (UI.md §4): trazo 1.5, viewBox 24,
// sin color propio (currentColor) y siempre decorativos (aria-hidden).
// Cada componente es autocontenido para poder usarse sin montar el sprite;
// SpriteIconos deja disponibles los símbolos #i-* para <use href="#i-…">.

interface PropsIcono {
  className?: string;
}

function clase(nombre: string, extra?: string) {
  return extra ? `${nombre} ${extra}` : nombre;
}

export function SpriteIconos() {
  return (
    <svg aria-hidden="true" focusable="false" style={{ display: 'none' }} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <symbol id="i-check" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" /></symbol>
      <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
      <symbol id="i-alerta" viewBox="0 0 24 24"><path d="M12 4L2.5 20h19L12 4z" /><path d="M12 10v4.5" /><path d="M12 17.2v.3" /></symbol>
      <symbol id="i-flecha" viewBox="0 0 24 24"><path d="M4 12h15M13 6l6 6-6 6" /></symbol>
      <symbol id="i-parar" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></symbol>
      <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 7.8v.3" /></symbol>
      <symbol id="i-reloj" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></symbol>
      <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6 3.5h8L19 8.5v12H6z" /><path d="M13.5 3.5v5.5H19" /></symbol>
      <symbol id="i-descargar" viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5" /><path d="M4.5 20h15" /></symbol>
      <symbol id="i-imprimir" viewBox="0 0 24 24"><path d="M7 8V3.5h10V8" /><rect x="4" y="8" width="16" height="8" /><path d="M7 13.5h10v7H7z" /></symbol>
      <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5l11 6.5-11 6.5z" /></symbol>
      <symbol id="i-reiniciar" viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2-4.9" /><path d="M19 3.5V8h-4.5" /></symbol>
      <symbol id="i-mas" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
      <symbol id="i-quitar" viewBox="0 0 24 24"><path d="M5 7h14M10 7V4.5h4V7M8 7l1 13h6l1-13" /></symbol>
      <symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></symbol>
      <symbol id="i-ajuste" viewBox="0 0 24 24"><path d="M5 7h9M18 7h1M5 17h3M12 17h7" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></symbol>
    </svg>
  );
}

function Base({ className, children }: PropsIcono & { children: React.ReactNode }) {
  return (
    <svg
      className={clase('icono', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconoCheck(p: PropsIcono) { return <Base {...p}><path d="M4 12.5l5 5L20 6.5" /></Base>; }
export function IconoX(p: PropsIcono) { return <Base {...p}><path d="M6 6l12 12M18 6L6 18" /></Base>; }
export function IconoAlerta(p: PropsIcono) { return <Base {...p}><path d="M12 4L2.5 20h19L12 4z" /><path d="M12 10v4.5" /><path d="M12 17.2v.3" /></Base>; }
export function IconoFlecha(p: PropsIcono) { return <Base {...p}><path d="M4 12h15M13 6l6 6-6 6" /></Base>; }
export function IconoParar(p: PropsIcono) { return <Base {...p}><rect x="6" y="6" width="12" height="12" /></Base>; }
export function IconoInfo(p: PropsIcono) { return <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 7.8v.3" /></Base>; }
export function IconoReloj(p: PropsIcono) { return <Base {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></Base>; }
export function IconoDoc(p: PropsIcono) { return <Base {...p}><path d="M6 3.5h8L19 8.5v12H6z" /><path d="M13.5 3.5v5.5H19" /></Base>; }
export function IconoDescargar(p: PropsIcono) { return <Base {...p}><path d="M12 4v11M7 11l5 5 5-5" /><path d="M4.5 20h15" /></Base>; }
export function IconoImprimir(p: PropsIcono) { return <Base {...p}><path d="M7 8V3.5h10V8" /><rect x="4" y="8" width="16" height="8" /><path d="M7 13.5h10v7H7z" /></Base>; }
export function IconoPlay(p: PropsIcono) { return <Base {...p}><path d="M8 5.5l11 6.5-11 6.5z" /></Base>; }
export function IconoReiniciar(p: PropsIcono) { return <Base {...p}><path d="M19 12a7 7 0 1 1-2-4.9" /><path d="M19 3.5V8h-4.5" /></Base>; }
export function IconoMas(p: PropsIcono) { return <Base {...p}><path d="M12 5v14M5 12h14" /></Base>; }
export function IconoQuitar(p: PropsIcono) { return <Base {...p}><path d="M5 7h14M10 7V4.5h4V7M8 7l1 13h6l1-13" /></Base>; }
export function IconoMic(p: PropsIcono) { return <Base {...p}><rect x="9" y="3" width="6" height="11" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></Base>; }
export function IconoAjuste(p: PropsIcono) { return <Base {...p}><path d="M5 7h9M18 7h1M5 17h3M12 17h7" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></Base>; }

/** Icono por id del sprite (`check`, `x`, … o `i-check`); decorativo. */
export function Icono({ nombre, className }: { nombre: string; className?: string }) {
  const id = nombre.startsWith('i-') ? nombre : `i-${nombre}`;
  return (
    <svg className={clase('icono', className)} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
      <use href={`#${id}`} />
    </svg>
  );
}
