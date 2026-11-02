// F7 case (fictitious, in English): a support team whose refund tickets slowed down in March.
// Acute route. Planted cause: a March rule that every refund over fifty dollars needs one
// manager's approval, and she reviews the queue twice a week.
import type { CasoEvaluacion } from '../../../../scripts/arnes/tipos';
import type { FuenteEntrada } from '../../tipos';

const E1: FuenteEntrada = {
  id: 'E1',
  tipo: 'entrevista',
  rol: 'Head of operations',
  modalidad: 'transcripcion',
  titulo: 'Interview with the head of operations',
  entrevistador: 'Interviewer',
  texto: [
    'Interviewer: Thanks for your time. What is going on with customer support?',
    'Head of operations: Honestly, the support team just got lazy after we went remote.',
    'Interviewer: When did you start to notice it?',
    'Head of operations: Customers started complaining about slow refunds in March.',
    'Interviewer: What changed around that time?',
    'Head of operations: We hired four new agents in February and they are still learning.',
    'Head of operations: We also moved everyone to remote work back in January.',
    'Interviewer: Any change in how refunds are handled?',
    'Head of operations: Finance added some approval step, but that only takes a minute.',
  ].join('\n'),
};

const E2: FuenteEntrada = {
  id: 'E2',
  tipo: 'entrevista',
  rol: 'Support lead',
  modalidad: 'transcripcion',
  titulo: 'Interview with the support lead',
  entrevistador: 'Interviewer',
  texto: [
    'Interviewer: How does a refund ticket move through the team?',
    "Support lead: Since March every refund over fifty dollars needs a manager's approval before we can close it.",
    'Support lead: Only one finance manager can approve them, and she reviews the queue on Tuesdays and Fridays.',
    'Support lead: A refund ticket now waits about six days for that approval.',
    'Interviewer: What about other tickets?',
    'Support lead: Shipping and product questions still get solved the same day.',
    'Support lead: The new agents handle mostly shipping questions, and their numbers look fine.',
  ].join('\n'),
};

const E3: FuenteEntrada = {
  id: 'E3',
  tipo: 'entrevista',
  rol: 'Finance manager',
  modalidad: 'transcripcion',
  titulo: 'Interview with the finance manager',
  entrevistador: 'Interviewer',
  texto: [
    'Interviewer: What is your part in refunds?',
    'Finance manager: I approve refunds twice a week, when I have a free afternoon.',
    'Finance manager: The rule came from an audit finding last year about duplicate refunds.',
    'Finance manager: By Friday I usually have around ninety refunds waiting for me.',
  ].join('\n'),
};

const D1: FuenteEntrada = {
  id: 'D1',
  tipo: 'documento',
  rol: 'Ticket resolution report',
  modalidad: 'transcripcion',
  titulo: 'Median resolution time by ticket type, January to April',
  entrevistador: null,
  texto: [
    'Ticket resolution report, January to April.',
    'Refund tickets had a median resolution time of 1.2 days in January and 1.1 days in February.',
    'Refund tickets had a median resolution time of 5.8 days in March and 6.3 days in April.',
    'Shipping tickets had a median resolution time between 0.6 and 0.7 days in every month.',
    'The refund approval rule took effect on March 3.',
  ].join('\n'),
};

export const CASO_SOPORTE: CasoEvaluacion = {
  id: 'soporte',
  titulo: 'Halvern Home Supplies: slow refunds',
  objetivo: 'Understand why customers wait longer for their refunds since a few months ago.',
  fuentes: [E1, E2, E3, D1],
  patrones: {
    causa: /approv|aprob|autoriz|finance manager|gerente de finanzas/i,
    distractores: /lazy|flojo|remot|new agents|new hires|nuev[oa]s? (agentes|emplead)|contrataci/i,
  },
  verdad: {
    causa:
      'Since March 3 every refund over fifty dollars needs approval from a single finance manager who reviews the queue twice a week, so refund tickets wait about six days: their median resolution time went from 1.1 to 1.2 days to 5.8 to 6.3 days. Shipping tickets, handled by the same team including the new agents, still close the same day, which rules out the team, the new hires and remote work.',
    oracionesClave: [
      { fuente: 'E1', fragmento: 'the support team just got lazy', tipo: 'opinion', primeraMano: false, nivelEsperado: 1, papel: 'Initial hypothesis: a judgment about people, with no facts.' },
      { fuente: 'E1', fragmento: 'Customers started complaining about slow refunds in March', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Start date.' },
      { fuente: 'E2', fragmento: "every refund over fifty dollars needs a manager's approval", tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'The change.' },
      { fuente: 'E2', fragmento: 'she reviews the queue on Tuesdays and Fridays', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'The bottleneck.' },
      { fuente: 'E2', fragmento: 'waits about six days for that approval', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Magnitude, backed by the report.' },
      { fuente: 'E2', fragmento: 'Shipping and product questions still get solved the same day', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Contrast.' },
      { fuente: 'E3', fragmento: 'I approve refunds twice a week', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 3, papel: 'The bottleneck from finance.' },
      { fuente: 'E3', fragmento: 'around ninety refunds waiting for me', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'Queue size, one source only.' },
      { fuente: 'D1', fragmento: '5.8 days in March and 6.3 days in April', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Documented magnitude.' },
      { fuente: 'D1', fragmento: 'The refund approval rule took effect on March 3', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 4, papel: 'Documented change date.' },
    ],
    distractores: [
      { fuente: 'E1', fragmento: 'We hired four new agents in February', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'The new agents mostly handle shipping, which is fine.' },
      { fuente: 'E1', fragmento: 'moved everyone to remote work back in January', tipo: 'testimonio_especifico', primeraMano: true, nivelEsperado: 2, papel: 'January change: does not explain March nor why shipping is fine.' },
    ],
    corroboraciones: [
      { a: { fuente: 'E1', fragmento: 'Customers started complaining about slow refunds in March' }, b: { fuente: 'D1', fragmento: '5.8 days in March and 6.3 days in April' }, nota: 'Start of the deviation.' },
      { a: { fuente: 'E2', fragmento: 'she reviews the queue on Tuesdays and Fridays' }, b: { fuente: 'E3', fragmento: 'I approve refunds twice a week' }, nota: 'Twice-a-week approval, from support and finance.' },
      { a: { fuente: 'E2', fragmento: "every refund over fifty dollars needs a manager's approval" }, b: { fuente: 'D1', fragmento: 'The refund approval rule took effect on March 3' }, nota: 'The rule and its date.' },
      { a: { fuente: 'E2', fragmento: 'Shipping and product questions still get solved the same day' }, b: { fuente: 'D1', fragmento: 'between 0.6 and 0.7 days in every month' }, nota: 'Documented contrast.' },
    ],
    fueraDeAlcance: [
      'Concluding that the support team is lazy.',
      'Blaming the new agents or remote work.',
      'Recommending to drop the audit control without weighing the duplicate refunds risk.',
      'Giving the cost of late refunds: no source states it.',
    ],
  },
};
