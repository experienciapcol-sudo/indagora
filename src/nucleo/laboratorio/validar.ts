// Validación en código del caso crudo. Asigna ids estables; nunca confía en el modelo.
import type { CasoCrudo, CasoLaboratorio, Hecho, ParametrosLaboratorio, VerdadLaboratorio } from './tipos';
import { contieneTermino, normalizarTexto } from './normalizar';

export type ResultadoValidacion =
  | { caso: CasoLaboratorio; verdad: VerdadLaboratorio; avisos: string[] }
  | { errores: string[] };

export function validarCaso(crudo: CasoCrudo, p: ParametrosLaboratorio): ResultadoValidacion {
  const errores: string[] = [];
  if (!crudo.empresa?.nombre?.trim() || !crudo.empresa?.descripcion?.trim()) errores.push('La empresa necesita nombre y descripción.');
  if (!crudo.objetivo?.trim()) errores.push('Falta el objetivo.');
  if (crudo.personas.length < 2 || crudo.personas.length > 5) errores.push('Debe haber entre 2 y 5 personas.');
  if (crudo.documentos.length > 2) errores.push('Debe haber entre 0 y 2 documentos.');

  const rolesVistos = new Set<string>();
  for (const persona of crudo.personas) {
    const r = normalizarTexto(persona.rol);
    if (!r || rolesVistos.has(r)) errores.push(`Rol vacío o repetido: "${persona.rol}".`);
    rolesVistos.add(r);
  }
  const titulosVistos = new Set<string>();
  for (const doc of crudo.documentos) {
    const t = normalizarTexto(doc.titulo);
    if (!t || titulosVistos.has(t)) errores.push(`Documento vacío o repetido: "${doc.titulo}".`);
    titulosVistos.add(t);
  }

  const idPersona = new Map(crudo.personas.map((x, i) => [normalizarTexto(x.rol), `P${i + 1}`]));
  const idDocumento = new Map(crudo.documentos.map((x, i) => [normalizarTexto(x.titulo), `D${i + 1}`]));
  const idPorDueno = (dueno: string): string | null =>
    idPersona.get(normalizarTexto(dueno)) ?? idDocumento.get(normalizarTexto(dueno)) ?? null;

  const marcadores = crudo.causa?.marcadores ?? [];
  if ((crudo.causa?.marcadores?.length ?? 0) < 3) errores.push('La causa necesita al menos 3 marcadores.');
  if (!crudo.causa?.enunciado?.trim() || !crudo.causa?.mecanismo?.trim()) errores.push('La causa necesita enunciado y mecanismo.');

  const duenosCausaCrudos = crudo.causa?.duenos ?? [];
  const duenosCausa: string[] = [];
  for (const d of duenosCausaCrudos) {
    const id = idPorDueno(d);
    if (!id) errores.push(`Dueño de la causa desconocido: "${d}".`);
    else if (!duenosCausa.includes(id)) duenosCausa.push(id);
  }

  const idDistractor = new Map(crudo.distractores.map((x, i) => [normalizarTexto(x.enunciado), `X${i + 1}`]));
  if (crudo.distractores.length < p.distractores) {
    errores.push(`Se pidieron ${p.distractores} distractores y llegaron ${crudo.distractores.length}.`);
  }

  // Descartar hechos "nunca" antes de asignar ids.
  const avisos: string[] = [];
  const hechosUtiles = crudo.hechos.filter((h) => {
    if (h.revelacion === 'nunca') { avisos.push(`Hecho descartado por revelación "nunca": "${h.texto.slice(0, 60)}".`); return false; }
    return true;
  });

  const hechos: Hecho[] = [];
  hechosUtiles.forEach((h, i) => {
    const dueno = idPorDueno(h.dueno);
    if (!dueno) errores.push(`Hecho con dueño desconocido: "${h.dueno}".`);
    if (!h.texto.trim()) errores.push('Hay un hecho sin texto.');
    if (h.terminos.length < 2 || h.terminos.length > 5) errores.push(`El hecho "${h.texto.slice(0, 40)}" necesita de 2 a 5 términos.`);
    let distractor: string | null = null;
    if (h.distractor !== null && h.distractor.trim() !== '') {
      distractor = idDistractor.get(normalizarTexto(h.distractor)) ?? null;
      if (!distractor) errores.push(`Hecho con distractor desconocido: "${h.distractor}".`);
    }
    if (h.tipo === 'causa' && distractor) errores.push('Un hecho no puede ser a la vez de causa y de distractor.');
    if (h.tipo === 'distractor' && !distractor) errores.push('Todo hecho de distractor debe señalar su distractor.');
    if (h.tipo === 'causa' && dueno && !duenosCausa.includes(dueno)) {
      errores.push(`Hecho de causa en un dueño no designado: "${h.texto.slice(0, 40)}".`);
    }
    hechos.push({ id: `H${String(i + 1).padStart(2, '0')}`, tipo: h.tipo, texto: h.texto, dueno: dueno ?? '', revelacion: h.revelacion, distractor, terminos: [...h.terminos] });
  });

  const hechosCausa = hechos.filter((h) => h.tipo === 'causa');
  if (hechosCausa.length < 2) errores.push('La causa necesita al menos 2 hechos.');

  // Ningún hecho ajeno a los dueños de la causa puede contener marcadores ni términos de causa.
  const terminosCausa = hechosCausa.flatMap((h) => h.terminos);
  for (const h of hechos) {
    if (h.tipo === 'causa') continue;
    const norm = normalizarTexto(h.texto);
    for (const m of marcadores) if (contieneTermino(norm, m)) errores.push(`Un hecho que no es de causa contiene un marcador de la causa: "${h.id}".`);
    if (!duenosCausa.includes(h.dueno)) {
      for (const t of terminosCausa) if (contieneTermino(norm, t)) errores.push(`Un hecho de otro dueño contiene un término de la causa: "${h.id}".`);
    }
  }

  // Términos sin solape entre causa y distractor.
  const terminosDistractor = hechos.filter((h) => h.tipo === 'distractor').flatMap((h) => h.terminos.map(normalizarTexto));
  for (const t of terminosCausa) {
    const tn = normalizarTexto(t.replace(/^=/, ''));
    if (terminosDistractor.some((d) => d === tn || d.includes(tn) || tn.includes(d))) {
      errores.push(`Término compartido entre causa y distractor: "${t}".`);
    }
  }

  // Cada distractor necesita al menos un hecho.
  for (const [enunciado, id] of idDistractor) {
    if (!hechos.some((h) => h.distractor === id)) errores.push(`Distractor sin hechos: "${enunciado}".`);
  }

  // Documento clave.
  const docsConCausa = new Set(hechosCausa.map((h) => h.dueno).filter((d) => d.startsWith('D')));
  const clave = crudo.documentos.findIndex((d) => d.esClave);
  if (p.documentoClave) {
    if (crudo.documentos.filter((d) => d.esClave).length !== 1) errores.push('Con documento clave debe haber exactamente un documento marcado como clave.');
    else if (!docsConCausa.has(`D${clave + 1}`)) errores.push('El documento clave no contiene ningún hecho de causa.');
  } else if (docsConCausa.size > 0) {
    errores.push('Sin documento clave, ningún documento puede contener hechos de causa.');
  }

  // Cada persona abre la conversación con un hecho "siempre".
  crudo.personas.forEach((persona, i) => {
    if (!hechos.some((h) => h.dueno === `P${i + 1}` && h.revelacion === 'siempre')) {
      errores.push(`La persona "${persona.rol}" no tiene ningún hecho de apertura.`);
    }
  });

  // Objetivo y descripción: solo el síntoma, nunca la respuesta.
  const textosPublicos = `${normalizarTexto(crudo.objetivo)} ${normalizarTexto(crudo.empresa.descripcion)}`;
  for (const m of marcadores) if (contieneTermino(textosPublicos, m)) errores.push('El objetivo o la descripción contienen un marcador de la causa.');
  for (const d of crudo.distractores) if (textosPublicos.includes(normalizarTexto(d.enunciado))) errores.push('El objetivo o la descripción contienen un distractor.');

  if (errores.length) return { errores: [...new Set(errores)] };

  const caso: CasoLaboratorio = {
    id: crudo.id,
    origen: crudo.origen ?? 'descripcion',
    parametros: p,
    empresa: crudo.empresa,
    objetivo: crudo.objetivo,
    personas: crudo.personas.map((x, i) => ({ id: `P${i + 1}`, rol: x.rol, presentacion: x.presentacion })),
    documentos: crudo.documentos.map((x, i) => ({ id: `D${i + 1}`, titulo: x.titulo, esClave: x.esClave, disponible: false })),
  };
  const verdad: VerdadLaboratorio = {
    causa: { enunciado: crudo.causa.enunciado, mecanismo: crudo.causa.mecanismo, marcadores: [...marcadores] },
    hechos,
    distractores: crudo.distractores.map((x, i) => ({ id: `X${i + 1}`, enunciado: x.enunciado, porQueEngana: x.porQueEngana })),
    duenosCausa,
    documentoClave: p.documentoClave && clave >= 0 ? `D${clave + 1}` : null,
  };
  return { caso, verdad, avisos };
}
