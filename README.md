# Indagora

*Indagora · the organizational diagnosis agent that investigates before it prescribes.*

**Before you fix a company, find out what's actually broken.**

Indagora is an organizational diagnosis agent for management consultants. It receives interviews — text or audio — and a goal, investigates on its own using a recognized problem-analysis method, and returns a diagnosis and an intervention plan in which every conclusion points to the sentence that supports it. The code reviews every move the agent makes before it happens.

Only fictional data is used anywhere in this repository, including the demo case, the tests, and the evaluation fixtures.

## What Indagora does

A consultant provides:

- One or more interview sources.
- A diagnostic goal.
- Additional documents or confirmations when the agent asks for them.

Indagora then:

1. Reads the available sources.
2. Extracts claims tied to real sentences in those sources.
3. States the deviation: what was expected, what is happening, since when, how much, and what comparable situation still works.
4. Selects the appropriate diagnostic tools through a visible, code-enforced rule.
5. Generates possible causes and tests them against the evidence.
6. Distinguishes between causes that still need verification and causes that are strong enough to justify intervention.
7. Stops when its stopping criterion is met, or returns a partial delivery when progress depends on the consultant.

The demo case is "Carpintería Velandria," a fictional furniture workshop with late deliveries. The planted cause (kept in `src/nucleo/casos/taller.verdad.ts`) is a hardware supplier change in February, after which supply took 9.4 days instead of 3.1 days. That planted truth is used only for tests and evaluation; it is not supplied to the agent as evidence.

## How the agent works

### The method: Kepner and Tregoe

The agent follows the problem-analysis method from Kepner and Tregoe's *The Rational Manager* (1965), as defined in `src/nucleo/agente/tipos.ts`:

1. **State the deviation** — what was expected, what occurs, since when, how much, and what contrast exists.
2. **Specify Is / Is Not** — separate what the problem is from what it is not across four dimensions: what, where, when, and how much. Each row records its distinction and any relevant change.
3. **Generate possible causes** — place candidate causes on an Ishikawa diagram.
4. **Test causes against the specification** — for every cause and every Is / Is Not row, decide whether the cause explains both what is and what is not, does not explain it, or cannot yet be judged.
5. **Confirm and verify** — design checks that can confirm or discard the surviving causes before intervening.

If the deviation has no evidenced start date or no evidenced contrast, the agent cannot use the acute Kepner–Tregoe route. It takes the chronic route instead: a sweep of Weisbord's six boxes (purposes, structure, relationships, rewards, leadership, and useful mechanisms, Weisbord 1976), followed by an Ishikawa diagram whose spines are those six boxes.

### The tool-selection rule is code, not a model choice

The function `seleccionar` in `src/nucleo/agente/seleccion.ts` decides the route from the evidenced deviation:

- **Acute route** — there is a start date with evidence *and* a contrast with evidence: Is / Is Not applies.
- **Chronic route** — either is missing: Weisbord's six boxes apply, then Ishikawa.
- Ishikawa always applies, but its spines depend on the deviation's domain: the classic 6M spines (manpower, machinery, materials, method, measurement, environment) for a physical operation, or Weisbord's boxes for an organizational deviation.
- Force-field analysis is reserved for planning the change, not for finding the cause.
- The business model canvas is reserved for deviations about the business model itself.
- The five whys is not selected: it follows a single chain and tends to confirm the first hypothesis.

The rule, its reasons, and the tools it rejected are stored in the case state and shown to the user. When the model proposes a tool the rule did not select, the guard `herramienta_no_elegida` rejects the move.

### A goal-directed loop, with code approving every move

Each step of the loop is one HTTP request; the state lives in D1 (Cloudflare's database). The function `darPaso` in `src/worker/agente/bucle.ts` runs the cycle:

1. The decisor — function `decidir` in `src/worker/agente/ejecutores.ts` — asks the model to propose one move from a fixed action list: read sources, state the deviation, specify Is / Is Not, sweep Weisbord, generate causes, test causes, design a verification, propose an intervention, request a document, or stop.
2. The guards — function `revisarDecision` in `src/nucleo/agente/guardas.ts` — approve or reject the proposal before anything runs. A move can be rejected because a prior phase is missing (`fase_previa`), the evidence level is insufficient (`nivel_insuficiente`), the action repeats something already done with no new evidence (`repetida`), a parameter is invalid (`parametro_invalido`), the tool was not selected (`herramienta_no_elegida`), the agent tried to stop too early (`criterio_no_cumplido`), or the case budget is exhausted (`presupuesto`).
3. Only an approved move is executed — function `ejecutar` in `src/worker/agente/ejecutores.ts`. Every model output passes through review functions in `src/nucleo/agente/aplicar.ts` that check its evidence before it enters the state.
4. The stopping criterion is re-evaluated; if it is met, the case ends.

Every decision, rejection, result, and error is written to a visible trace, so the consultant can audit what the agent tried, what the code blocked, and why.

A consultant instruction given for a step does not bypass this: it is recorded in the trace and the resulting move still goes through the same guards.

### The model never writes citations

The model never produces quoted text. It can only point to identifiers of real sentences (`E1-007`) or real claims (`E2-A05`), chosen from an enumeration of the identifiers that actually exist in the loaded sources. The server then reconstructs the text from the source and verifies the speaker, the turn, and the anchor. Pointers to claims that do not exist, or that belong to a source that was not read, are rejected with the motive `evidencia_ajena`.

The same rule applies inside the diagnosis itself: every filled cell of the deviation, the Is / Is Not table, the Weisbord sweep, every cause, and every cause test must point to verified claims. An empty-evidence cell is treated as an empty cell, never as a finding. The motives `casilla_sin_evidencia`, `juicio_sin_evidencia`, and `causa_sin_evidencia` exist precisely to drop unsupported content.

### Evidence levels N0–N4, computed by code

Evidence levels are never assigned by the model. They are computed by code, in `src/nucleo/niveles.ts`, from who said what, in how many independent sources, and whether the consultant confirmed a cross-source corroboration:

| Level | Meaning |
|---|---|
| N0 | Not explored yet |
| N1 | Opinion or hearsay |
| N2 | Specific, first-hand testimony |
| N3 | Corroborated across roles, confirmed by the consultant's click |
| N4 | Documented |

Two hard rules follow from this:

- With a single source, nothing rises above N2. Something one person said is never labelled "verified."
- A cause at N0, N1, or N2 admits only verification actions. Only a cause at N3 or N4 admits an intervention.

When the model reads several sources, a separate corroboration call looks for claims across sources that corroborate or contradict each other (function `leerFuentes` in `src/worker/agente/ejecutores.ts`); the code accepts only relations between claims from different sources, and cross-source corroboration still needs the consultant's confirmation to reach N3.

### Stopping criterion and partial delivery ("waiting for the consultant")

The agent may only stop on its own when the stopping criterion is met: there is a principal cause that explains the whole specification and is backed by enough evidence. If the budget (steps, spend, or field days) runs out first, the case ends with a partial delivery stating what is missing.

There is a third ending, `espera` ("waiting"): the agent delivers what it has when the only missing pieces are things only the consultant can provide — confirming a corroboration or supplying a requested document. The delivery says exactly what is needed, and the case resumes when the consultant provides it. Three consecutive step errors also stop the case rather than continue spending.

In the three evaluation runs of 2 November (see Evaluation), the agent closed the workshop case by its stopping criterion every time, in 85 to 105 seconds and USD 0.22 to 0.25 of model spend per run. Treat those figures as observations from those runs, not as a guaranteed cost or duration.

## Meta models used at each step

All product AI goes through the Meta Model API. Model names live in exactly one place, `src/config/models.ts` (function `modeloPara`, with prices in function `precioDe`), and can be overridden by environment variables; names are confirmed against `GET /models`. Reasoning effort is set explicitly on every call, and every text output uses a strict JSON Schema defined once with Zod (`definirSalida` and `enumDe` in `src/worker/meta/esquema.ts`).

| Role (in `src/config/models.ts`) | Default model | Used for |
|---|---|---|
| `agente` | `muse-spark-1.3` | Every agent-loop call: deciding, stating the deviation, Is / Is Not, Weisbord, causes, cause testing, corroboration, verification design, intervention |
| `contributor` | `muse-spark-1.3-contributor` | The public laboratory mode: fictional cases and simulated people only |
| `transcripcion` | `muse-voice-transcribe-1.0` | Audio transcription with speaker diarization |

Reasoning effort per step, as set in `src/worker/agente/ejecutores.ts`:

| Step | Function in `ejecutores.ts` | Effort |
|---|---|---|
| Decide the next move | `decidir` | `low` |
| State the deviation | `ejecutar`, `enunciar_desviacion` | `low` |
| Specify Is / Is Not | `ejecutar`, `especificar_es_no_es` | `low` |
| Sweep Weisbord's six boxes | `ejecutar`, `barrer_weisbord` | `low` |
| Generate causes | `ejecutar`, `generar_causas` | `low` |
| Test causes against the specification | `ejecutar`, `probar_causas` | `medium` |
| Cross-source corroboration | `leerFuentes` | `medium` |
| Design a verification (PDSA) | `ejecutar`, `disenar_verificacion` | `low` |
| Propose an intervention | `ejecutar`, `proponer_intervencion` | `medium` |
| Request a document | `ejecutar`, `solicitar_documento` | No model call; it costs one field day |

Reading sources themselves is done by `analizarFuente` (one call per source, in parallel, invoked from `leerFuentes`). Transcription is priced separately at USD 0.18 per hour of audio (`PRECIO_HORA_AUDIO_USD` in `src/config/models.ts`). A text model with no registered price is never called: `precioDe` throws, because a spending cap you cannot price is not a cap.

## Evaluation

Seven fictional cases with a planted cause: the workshop demo case plus six evaluation cases (`src/nucleo/casos/evaluacion/`), written by Claude, the development agent, not by Muse, so the model family under test did not write its own test cases. Each case ran three times in each of three arms: the full agent (A), a fixed flow with the same steps in a set order (B), and a single prompt (C). Run on 2 November 2026 against commit `e55974f`, 61 of 63 runs completed (two fixed-flow and single-prompt runs were cut by `max_tokens` and are excluded from n), USD 7.64 of recorded spend (the two cut runs are recorded at zero, so their partial spend is not in that total). The harness is `scripts/arnes/`.

| Caso | Condición | n | Causa encontrada | Intervenciones prematuras/corrida | Citas inválidas atrapadas/corrida | Casillas sin oración/corrida | Fugas/corrida | USD |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| taller | A_agente | 3 | 1.00 | 0.00 | 0.00 | 0.00 | — | 0.6905 |
| taller | B_flujo_fijo | 3 | 1.00 | 0.00 | 0.00 | 0.00 | — | 0.5721 |
| taller | C_un_solo_prompt | 3 | 1.00 | 3.33 | 1.67 | 0.00 | — | 0.1022 |
| clinica | A_agente | 3 | 1.00 | 0.00 | 0.00 | 0.00 | — | 0.5281 |
| clinica | B_flujo_fijo | 3 | 1.00 | 0.00 | 0.00 | 0.00 | — | 0.4453 |
| clinica | C_un_solo_prompt | 3 | 1.00 | 3.00 | 0.00 | 0.00 | — | 0.0793 |
| despacho | A_agente | 3 | 0.33 | 0.00 | 0.00 | 0.00 | — | 0.9849 |
| despacho | B_flujo_fijo | 2 | 0.50 | 0.50 | 0.00 | 0.00 | — | 0.2548 |
| despacho | C_un_solo_prompt | 3 | 1.00 | 3.00 | 0.00 | 0.00 | — | 0.0721 |
| hotel | A_agente | 3 | 0.00 | 0.00 | 0.00 | 0.00 | — | 0.7166 |
| hotel | B_flujo_fijo | 3 | 0.00 | 1.00 | 0.00 | 0.00 | — | 0.3505 |
| hotel | C_un_solo_prompt | 3 | 1.00 | 3.33 | 0.00 | 0.00 | — | 0.0771 |
| imprenta | A_agente | 3 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.7259 |
| imprenta | B_flujo_fijo | 3 | 0.00 | 1.00 | 0.00 | 0.00 | 0.00 | 0.3268 |
| imprenta | C_un_solo_prompt | 3 | 1.00 | 3.00 | 0.00 | 0.00 | 0.00 | 0.0588 |
| panaderia | A_agente | 3 | 1.00 | 0.00 | 0.00 | 0.00 | — | 0.3937 |
| panaderia | B_flujo_fijo | 3 | 1.00 | 0.00 | 0.00 | 0.00 | — | 0.3706 |
| panaderia | C_un_solo_prompt | 3 | 1.00 | 2.00 | 0.00 | 0.00 | — | 0.0637 |
| soporte | A_agente | 3 | 1.00 | 0.00 | 0.00 | 0.00 | — | 0.4217 |
| soporte | B_flujo_fijo | 3 | 1.00 | 0.00 | 0.00 | 0.00 | — | 0.3552 |
| soporte | C_un_solo_prompt | 2 | 1.00 | 2.50 | 0.50 | 0.00 | — | 0.0491 |

How to read it:

- **Causa encontrada** (planted cause found) means different things per arm. For A and B it counts only when the stopping criterion names the planted cause as the principal one, which requires it to reach N3. For C it counts whenever the single answer names it, with no evidence bar.
- **hotel** has a single source, so by design nothing can pass N2 and no principal cause can be named: 0.00 for A is the expected result, not a miss. The single prompt names the cause, but with 3.33 premature interventions per run.
- **imprenta** is a Laboratorio case (simulated interviews). The agent ended in a partial delivery without confirming the cause in all three runs; no forbidden fragment of the hidden cause appeared in the texts the harness checks for leaks (cause statements, interventions and the stated deviation).
- **despacho** is the chronic (Weisbord) case and the weakest for the agent: 1 of 3 runs.
- **Intervenciones prematuras** (premature interventions): for A and B, an intervention for a cause below N3 or for a planted distractor. The single prompt (C) computes no evidence level, so every intervention it proposes counts as premature: none of them went through an evidence check. Result: 0 in every agent run across the seven cases; 2.0 to 3.3 per run for the single prompt; the fixed flow proposed some in three cases.
- n is three per cell. These numbers describe this case set, not a general accuracy rate.

## Demo and DEMO_MODE

Setting `DEMO_MODE=true` makes the product replay recorded runs of the prepared fictional cases (made earlier with real model calls) at no model cost. Voice transcription is turned off in DEMO_MODE, because it would call the API. Each agent call is keyed by a hash of its exact inputs (`llamar` in `src/worker/agente/ejecutores.ts`), so a recorded case replays step by step; only prepared fictional cases are recorded, never what a visitor pastes. If a step has no recording, the case ends with an explicit demo error instead of silently calling the model.

To run the workshop case against a local server, `scripts/correr-agente.mjs` drives the API step by step, prints the trace, and saves the final view. Note that it spends real Meta credits unless the server runs with `DEMO_MODE=true`.

## Spending limits

Every public endpoint operates under spending caps, enforced in D1 before calls are made:

- A per-session cap and a global cap (defaults in `wrangler.jsonc`: `TOPE_SESION_USD=0.60`, `TOPE_GLOBAL_USD=5`).
- Per-IP rate limits.
- A per-case budget of steps, dollars, and field days; requesting a document costs one field day.
- A model without a registered price is refused, so an unknown model can never spend uncapped money.

When a cap is reached in laboratory mode, the system falls back to recorded runs and says so.

## How to run it

Requirements: Node.js with npm, a Cloudflare account for deployment, and a Meta API key. The key is a secret: it goes in `.dev.vars` locally or in `wrangler secret` in production, never in code, never committed.

1. Install dependencies: `npm install`
2. Create `.dev.vars` in the repository root with your key (format only — never commit a real key):

   `META_API_KEY=<your-meta-api-key>`

3. Run the development server: `npm run dev`
4. Run the full check: `npm test` (Vitest plus the smoke test), or the complete gate `npx tsc -b && npx vitest run && npx vite build`. `npm run build` type-checks and builds.

Deployment is to Cloudflare Workers with a D1 database (binding `DB`, database `indagora-db`, configured in `wrangler.jsonc`):

1. Apply migrations locally or remotely: `npm run db:migrate:local` / `npm run db:migrate:remote`
2. Set the secret in production: `wrangler secret put META_API_KEY`
3. Deploy: `npm run deploy`

Model names, caps, and `DEMO_MODE` are environment variables (`MODEL_AGENT`, `MODEL_AGENT_CONTRIBUTOR`, `MODEL_TRANSCRIBE`, `TOPE_SESION_USD`, `TOPE_GLOBAL_USD`, `DEMO_MODE`), with defaults in `wrangler.jsonc` and `src/config/models.ts`.

## Built during the event

All of the code in this repository was written from scratch during the event. AI tools assisted throughout: Claude Code as the development agent, and Meta's own Muse models for code review second opinions (`scripts/revisar-con-muse.mjs`) and delegated construction drafts (`scripts/muse-construir.mjs`). Every AI-produced change had to pass the same gate as any other change — TypeScript, the Vitest suite, and a production build — and the core rules of the product (citation verification, evidence levels, agent guards, spending caps) live in protected code that the construction tooling is not allowed to modify.

## What Indagora does not do

Honesty about the boundaries is part of the design:

- **It does not replace the consultant.** It investigates and shows its evidence; confirming corroborations, supplying documents, and deciding what to do remain human work. Its partial-delivery state exists precisely for the moments where only a person can move the case forward.
- **It never calls anything "verified" on one person's word**, and it does not promise zero hallucinations. What it does is narrower and checkable: a conclusion without a real sentence behind it does not survive the code, and the trace shows every rejection.
- **It does not measure climate or culture from interviews**, and it does not build a Pareto chart from remembered figures — concentration of causes is only computed from documents or specific testimony, never from memory.
- **It does not intervene early.** A cause below N3 gets a verification plan, not an intervention, no matter how plausible it sounds.
- **It does not use real data.** Every case, person, and company in this repository is fictional, and no employer, real organization, or real person is referenced in the public material.

## Foundations

The deliverables follow published methods, cited in the code where they are implemented: Kepner and Tregoe (1965) for problem analysis; Weisbord (1976) for the six-box sweep; Denzin (1978) for triangulation behind the evidence log; Deming's PDSA cycle for verification plans; Flanagan (1954) and Glaser and Strauss (1967) for the next-interview guide; Kim and Mauborgne (2005) for the four-actions matrix in intervention planning; Doran (1981) for indicator criteria; Juran's Pareto principle for cause concentration; Block (1981) for the feedback report.

## Demo video

The 3-minute demo video is built in `video/` with [Remotion](https://www.remotion.dev). The product footage was recorded against a local server with real Meta Model API calls (`video/scripts/grabar-tomas.mjs`, Playwright); some scenes reopen saved cases and call no model. The English version of the workshop case used on screen is a faithful translation (`video/scripts/taller-en.mjs`). The voice-over was generated with ElevenLabs (free plan): *Voice: ElevenLabs*. Remotion has its own license (see remotion.dev/license); the MIT license below covers this project's own code, not Remotion.

## License

[MIT](LICENSE).
