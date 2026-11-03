// English strings for the "How it works" flow. Same shape as TEXTOS_FLUJO_ES (checked by type).
import type { TextosFlujo } from './textos';

export const TEXTOS_FLUJO_EN: TextosFlujo = {
  pestana: 'How it works',
  enlace: 'First time? See how it works',
  titulo: 'How Indagora works',
  intro:
    'From interviews to a plan you can defend in front of the client, sentence by sentence. Here is what it looks like with the fictional case of a furniture workshop that delivers late.',

  contraste: {
    etiqueta: 'The workshop case in one line',
    dijo: 'What the owner said',
    mostro: 'What the evidence showed',
    causa: 'A new hardware supplier that takes 9.4 days instead of 3.1. Two people in different jobs say it, and the warehouse log confirms it.',
  },

  promesas: [
    'Every conclusion points to the sentence behind it: the model points to identifiers and the code rebuilds the quote.',
    'It does not recommend too early: 0 premature interventions across the agent’s 21 evaluation runs.',
    'It uses published methods, with their author and year, and a rule in the code decides which one applies.',
  ],

  carriles: {
    etiqueta: 'Who does each part',
    consultor: 'You',
    modelo: 'Model (Muse)',
    codigo: 'Code',
  },

  estacionesEtiqueta: 'The flow, step by step',
  estaciones: [
    {
      carriles: ['consultor'],
      corto: 'Listen',
      titulo: 'You listen to several people',
      texto: 'Paste notes or transcripts, or record the interview audio, and mark who is speaking. Every sentence gets an identifier.',
      metodo: 'Interviews with several roles, plus documents',
    },
    {
      carriles: ['modelo'],
      corto: 'Read',
      titulo: 'Specialist model roles read each source',
      texto: 'They read the sources in parallel and propose claims by pointing to sentences. The code rebuilds the quote and rejects whatever does not hold: an interviewer’s question, an anchor that is not there, or a figure the quote does not contain.',
      metodo: 'The model points; it never writes the quote',
    },
    {
      carriles: ['codigo'],
      corto: 'Measure',
      titulo: 'The code measures the evidence',
      texto: 'The code computes the level from who said it, how many sources and roles agree, and whether you confirmed it. What one person says tops out at N2; two different roles that agree, plus your click, reach N3; a documentary record with the data reaches N4.',
      metodo: 'Source triangulation (Denzin, 1978)',
    },
    {
      carriles: ['modelo', 'codigo'],
      corto: 'Investigate',
      titulo: 'The agent investigates with a method',
      texto: 'It states the deviation, separates where the problem happens from where it does not, lays out the possible causes and tests them against every row. The code approves or rejects each step before it runs, and the agent declares a principal cause only when its evidence reaches N3 or N4.',
      metodo: 'Kepner and Tregoe (1965) · Weisbord (1976) if chronic · Ishikawa',
    },
    {
      carriles: ['modelo', 'codigo'],
      corto: 'Deliver',
      titulo: 'Deliverables you take to the client',
      texto: 'The code decides which cause admits an intervention and computes priorities; the model writes. Every line leads to the sentence behind it.',
      metodo: 'If no cause reaches N3, you get a verification plan and the list of what is missing',
    },
  ],

  artefactos: {
    fuentes: 'Sources in the case',
    documento: 'document',
    entrevista: 'interview',
    oracion: 'One sentence with its identifier',
    citaReconstruida: 'Quote rebuilt by the code',
    rechazo: 'Another proposal from the model, rejected: it pointed to a question from the consultant.',
    niveles: [
      { nivel: 1, nombre: 'opinion', quien: 'The owner: “the workshop is lazy”' },
      { nivel: 2, nombre: 'one witness', quien: 'The workshop lead: “nine or ten days”' },
      { nivel: 3, nombre: 'confirmed by two roles', quien: 'Purchasing says the same, and you confirm it' },
      { nivel: 4, nombre: 'backed by a document', quien: 'The log: “9.4 days of waiting”' },
    ],
    es: 'Is',
    noEs: 'Is not',
    esTexto: 'Closets, dressers and kitchens: they carry hardware',
    noEsTexto: 'Tables and benches: no hardware, delivered on time',
    bloqueo: 'Intervention blocked by the code: with N0 to N2 only verification actions are allowed.',
    causa: 'Principal cause: the hardware supplier switch (N4)',
    entregables: [
      { nombre: 'Verification plan', metodo: 'PDSA cycle (Deming)' },
      { nombre: 'Intervention plan by effort and impact', metodo: 'four actions (Kim and Mauborgne) and change checklists (Lewin, Kotter, ADKAR)' },
      { nombre: 'Indicator sheets with baseline, target, deadline and owner', metodo: 'SMART criteria (Doran, 1981)' },
      { nombre: 'Concentration of causes, only from documented figures', metodo: 'Pareto (Juran)' },
      { nombre: 'Guide for the next interview', metodo: 'critical incident (Flanagan, 1954)' },
      { nombre: 'Feedback report', metodo: 'Block (1981)' },
    ],
  },

  // The case is in Spanish; these are faithful translations of the sentences shown.
  traduccion: {
    flojo: 'Well, the workshop is lazy, plain and simple.',
    plazoJefe: 'Right now it arrives nine or ten days after it is ordered.',
    plazoCompras: 'Brevánez takes between eight and twelve days, because they ship it from their warehouse in another state.',
    registro: 'Brevánez’s average for orders 111 to 125 is 9.4 days of waiting.',
    mesas: 'The dining tables and the benches go out on their date.',
  },
  roles: {
    Dueña: 'Owner',
    'Jefe de taller': 'Workshop lead',
    'Encargada de compras': 'Purchasing manager',
    'Encargada de compras y almacén': 'Purchasing and warehouse manager',
    'Registro de recepciones de herraje': 'Hardware receipts log',
  },
  notaTraduccion: 'The case is in Spanish; sentences are shown translated, with the identifier of the original.',

  cta: {
    boton: 'See this case in the agent',
    nota: 'In the demo it replays a recorded run of this fictional case, made earlier with the real model: no cost.',
  },
  pie: 'Fictional case, company and people.',
};
