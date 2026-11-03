# Indagora · demo video script (3:00, English)

Final script for ElevenLabs. Paste **only the "Narration" column text**, block by block (or the plain-text version at the bottom). Voice: calm, professional, English. Target pace: about 135 words per minute, with air for the on-screen demo.

Only block 1:12–1:35 changed after recording (the ⚠ block): it now says what the real take shows.

| Time | Narration | On-screen text | Footage |
|---|---|---|---|
| 0:00–0:15 | A furniture workshop keeps missing delivery dates on its closets. A customer just cancelled one. The owner tells you the team is lazy. The real reason is a new supplier for hinges and drawer slides that takes nine days to deliver instead of three. | "The workshop is just lazy." → "Real cause: a hardware supplier 9.4 days away." | Title cards (quote, then cause) |
| 0:15–0:32 | If you work as a consultant, you've seen some version of this. You interview four people and get four opinions. The client wants answers by Friday, and the easy move is to recommend something before you've checked anything. | "Opinions in. Prescriptions out. Evidence skipped." | Title cards |
| 0:32–0:50 | Indagora is built for that moment. It runs on Meta's Muse models. One investigating agent plans the work and hands pieces to specialist roles: one reads each interview, one maps possible causes, one writes the plan. Before any step runs, plain code checks it and can say no. | Logo · "the organizational diagnosis agent that investigates before it prescribes." · diagram: investigating agent in the centre; interview readers, cause mapper, plan writer around it; "code = referee" between the agent and each action | Animated diagram |
| 0:50–1:12 | You start with what you have: typed notes, or audio from the interview itself. I record a question, Indagora transcribes it, and I mark who said what. Every sentence gets an ID, so every conclusion can point back to the words a real person said. | "Typed notes or audio" · "Every sentence gets an ID" | `toma-lab` (voice recording, transcript, roles, pasted notes) |
| 1:12–1:35 ⚠ | Watch what happens with only the owner's interview. One person's word stays at "one witness" on the evidence meter. I even pass along the owner's push for a plan today. The agent declines, and when it tries to repeat a step, the code blocks that too. It asks for more interviews instead. | Evidence meter: unexplored · opinion · one witness · confirmed by two roles · backed by a document · "Blocked by code: not enough evidence yet" · "I need more interviews" | `toma-e1p` (steps 1–7, the pressure step, the rejection, the partial delivery) |
| 1:35–2:05 | Now add the shop foreman, the purchasing manager, and the hardware delivery log. Specialist readers go through each source in parallel, and the picture updates. The agent compares where the delays happen with where they don't: closets with hinges run late, plain tables ship on time. Two people in different jobs say the same thing, the log confirms the dates, and the meter climbs to "backed by a document." Only then does it name the cause. | "Where it happens / where it doesn't" · "Map of possible causes" · evidence chip: one witness → confirmed by two roles → backed by a document · "Stop rule: the agent only names a cause when the evidence holds" | `toma-completo` (accelerated) |
| 2:05–2:25 | Next it writes what you'd hand a client: a small test to confirm the cause before anyone spends money, changes sorted by effort, and targets with a baseline, a date and an owner. Click any line and you land on the sentence behind it. | "Small test first (plan, try, check, adjust)" · "Changes sorted by effort and impact" · "Targets with a baseline, a date and an owner" · "Every claim links to the exact sentence" | `toma-entregables` |
| 2:25–2:45 | We tested it against a single prompt on seven made-up cases, three runs each. The single prompt names a cause more often, because nothing stops it, and it recommends two or three fixes per run that the evidence doesn't support yet. The agent did that zero times. | F7 table animated: premature recommendations per run, agent 0 vs single prompt 2.0–3.3 · hotel case stays at "one witness", as it should | Animated table (README, F7) |
| 2:45–3:00 | For a consultant, that means a diagnosis you can defend in front of the client, sentence by sentence, and the analysis takes about four minutes. Indagora investigates before it prescribes. The live link is below. | "Hours of synthesis → minutes. Every claim defensible in front of the client." · indagora.experienciapcol.workers.dev · repository · "Built with the Meta Model API" · "Voice: ElevenLabs" | Closing card |

## Where every figure comes from

- **Nine days vs. three:** 9.4 and 3.1 days in the workshop case (hardware log D1).
- **Four people:** generic sentence in the problem block; the workshop case is three interviews plus one document.
- **Seven cases, three runs each, zero premature recommendations by the agent; two to three per run for the single prompt:** F7 table in `README.md`.
- **About four minutes:** this recording session: the agent took 182 s on the full case (191.7 s – 9.3 s of the take) and the deliverables 19 s; the earlier live run measured 204 s + 28 s.

## What the real takes showed (why block 1:12–1:35 changed)

- Workshop with only the owner's interview (two real runs, English version of the case): the agent stopped by itself with a partial delivery ("no further analysis step is possible with the current sources"). Causes stayed at one witness; no intervention was proposed.
- With the owner's pressure typed into the consultant instruction ("an intervention plan today… make the staff work harder"), the agent answered "Intervention is not allowed with N1-N2 evidence" and the code rejected one move (repeating a step with no new sources). The code did not have to block an intervention because the agent never proposed one; the script no longer says it did.
- Full case (E1, E2, E3, D1): stopping criterion met in 5 steps, 0.235 USD; C1 = the supplier switch, N4; the other causes discarded.

## Plain text for ElevenLabs (one paragraph per block)

A furniture workshop keeps missing delivery dates on its closets. A customer just cancelled one. The owner tells you the team is lazy. The real reason is a new supplier for hinges and drawer slides that takes nine days to deliver instead of three.

If you work as a consultant, you've seen some version of this. You interview four people and get four opinions. The client wants answers by Friday, and the easy move is to recommend something before you've checked anything.

Indagora is built for that moment. It runs on Meta's Muse models. One investigating agent plans the work and hands pieces to specialist roles: one reads each interview, one maps possible causes, one writes the plan. Before any step runs, plain code checks it and can say no.

You start with what you have: typed notes, or audio from the interview itself. I record a question, Indagora transcribes it, and I mark who said what. Every sentence gets an ID, so every conclusion can point back to the words a real person said.

Watch what happens with only the owner's interview. One person's word stays at "one witness" on the evidence meter. I even pass along the owner's push for a plan today. The agent declines, and when it tries to repeat a step, the code blocks that too. It asks for more interviews instead.

Now add the shop foreman, the purchasing manager, and the hardware delivery log. Specialist readers go through each source in parallel, and the picture updates. The agent compares where the delays happen with where they don't: closets with hinges run late, plain tables ship on time. Two people in different jobs say the same thing, the log confirms the dates, and the meter climbs to "backed by a document." Only then does it name the cause.

Next it writes what you'd hand a client: a small test to confirm the cause before anyone spends money, changes sorted by effort, and targets with a baseline, a date and an owner. Click any line and you land on the sentence behind it.

We tested it against a single prompt on seven made-up cases, three runs each. The single prompt names a cause more often, because nothing stops it, and it recommends two or three fixes per run that the evidence doesn't support yet. The agent did that zero times.

For a consultant, that means a diagnosis you can defend in front of the client, sentence by sentence, and the analysis takes about four minutes. Indagora investigates before it prescribes. The live link is below.
