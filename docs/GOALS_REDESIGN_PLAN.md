# Goals Redesign Plan

*Drafted 2026-07-29 · Author: Fable 5 · Status: approved-pending-build*

## The problem, in the user's words

> "Goals page looks weak overall — too much spacing and no color, should be
> more compelling. Need a way to set up a system to help measure towards
> commitment of reaching goals. Right now it's just what's the goal, amount,
> priority. Maybe an option like 'how can I reach this' that gives interesting
> insights — index funds, investments, life insurance, earning more."

Diagnosis: the current page is a **filing cabinet**. Goals are stored and
displayed. Nothing about it creates pull. A goal you look at once a month is a
wish; a goal that talks back is a commitment.

## What already exists (build on, don't rebuild)

| Capability | Where |
|---|---|
| Measured surplus allocation (importance × time-pressure) | `calculateGoalProjections` |
| Account-linked goals — % of a real balance, growing at its rate | `linked_account_id` / `allocation_percent` (engine live, **no UI**) |
| Honest status — unreachable says *at risk* | `statusForGoal` |
| Manual accounts (Schwab-style) linkable as goal funding | `investment_accounts` + `/api/investments` |
| Business-aware AI with measured context | `/api/ai-chat` |
| Entity-scoped goals (business vs personal pools) | goal `entity` column |

The redesign is mostly **surfacing engine truths that today are invisible**.

---

## Design: three layers

### 1. The card — a goal you can feel

Current card: title, number, bar, four stat rows of equal grayness. New card:

```
┌──────────────────────────────────────────────────┐
│ 🏠 House Down Payment              [on track ▲]  │  ← status = color of card edge
│                                                  │
│  $18,400 ──────────────●──────── $60,000         │  ← live position, animated fill
│  ▲ linked: 80% of Schwab Brokerage · grows ~7%   │  ← funding source, visible
│                                                  │
│  $410/mo flowing in · done ≈ Mar 2029            │  ← the two numbers that matter
│  2 months ahead of schedule                      │  ← momentum, stated plainly
│                                                  │
│  [How do I reach this faster? →]                 │  ← the AI hook
└──────────────────────────────────────────────────┘
```

Rules:
- **Category color** carries the card (emerald=emergency, blue=house,
  violet=investment, amber=debt) — edge accent + progress fill, not painted
  backgrounds.
- **Density**: current page spends ~600px per goal; target ≤ 280px.
- **Momentum line** is the emotional core: "2 months ahead" / "falling behind
  since May" — computed from allocation history vs required pace.
- Status chip colors match the measured engine (`on_track`/`ahead`/`behind`/
  `at_risk`) — never green for a goal receiving $0.

### 2. Commitment system — measuring the *keeping*, not just the goal

The user asked for "a system to help measure towards commitment." Concretely:

- **Funding streak** — consecutive months the goal received ≥ its required
  allocation, from real ledger data. Shown as a small month-strip
  (■■■□■ …) on the card. Streaks are honest: a missed month shows.
- **Monthly close** — when a month completes, each goal gets a one-line
  verdict on the dashboard attention feed: "House fund got $520 of the $410
  it needed ✓". Uses the existing attention-items pipeline.
- **Check-in nudge, not guilt** — a goal whose linked account balance hasn't
  moved in 60+ days surfaces once in Review (existing freshness machinery),
  never as a red badge.

No gamification theater (no XP, no confetti-per-login). One streak, one
monthly verdict, one stale nudge.

### 3. "How do I reach this?" — the AI hook

A button on every goal card. It does **not** open a blank chat. It hands the
chat a structured goal brief:

```
goal: House Down Payment · $18,400 of $60,000 · deadline 2029-03
funding: 80% of brokerage (index, ~7%) + $410/mo measured allocation
context: measured personal surplus, business surplus, owner-pay level,
         filing status, state, investments, debts, earning types
ask: lay out the levers — faster funding, different vehicles, timeline
     trade-offs, earning-side options
```

The chat (already business-aware) then discusses *in the user's numbers*:
- **Vehicle education**: what a Roth IRA / index fund / HYSA / term-vs-whole
  life insurance *is* and when each fits this goal's timeline — education,
  with real trade-offs, in their context.
- **Lever math**: "moving owner pay from $300 to $800/mo closes this goal 14
  months sooner; here's the payroll-tax cost of that move" — the tax engine
  already computes this.
- **Timeline honesty**: "at measured surplus this deadline is not reachable;
  reachable options: +$X/mo, +N months, or reduce target to $Y."

**The advice boundary (non-negotiable):** the AI explains vehicles and models
scenarios; it never says "buy this fund/policy." System prompt gains an
explicit instruction; every insight ends with the licensed-professional line.
This keeps the feature clearly on the education side of RIA territory when
FREM has paying users.

Implementation: `/chat` accepts a handoff (sessionStorage payload, read once);
goal brief built server-side by extending the existing measured-context block.

---

## Also in scope

- **Goal-linking UI** (the engine ships without it): on the card's funding
  row — "link an account" → picker of synced + manual accounts → % slider →
  live preview of the new completion date. PUT `/api/goals` already accepts
  the fields.
- **Entity on goals**: business goals get the `BIZ` badge and draw from the
  business pool (engine already enforces this — make it visible).
- **Restore mis-cancelled goals**: a "recently cancelled" collapsible with
  one-click reactivate (status → active). User has two such casualties.

## Explicitly out of scope

- Shared/household goals, goal comments, social anything
- Automatic transfers ("round-ups") — FREM is read-only, forever
- Confetti

## Build routing (per CLAUDE.md)

| Piece | Owner |
|---|---|
| Streak/momentum computation + monthly-close attention items + goal-brief context builder | **GPT-5.6 Sol** (engine, lib/) |
| Card redesign, funding picker, chat handoff, restore UI, copy | **Fable 5** (taste-critical) |
| Page assembly, dead-code removal from old goals page, verification | **GPT-5.6 Terra** |
| Final review | **Fable 5** |

Two Sol-sized engine tasks, one substantial Fable UI pass, one Terra cleanup.
Sequencing: Sol's context builder and streaks are independent → parallel;
UI lands against frozen contracts; Terra sweeps.

## Success test (how we know it worked)

Open the goals page cold and answer, within five seconds per goal, without
clicking: *Is this on track? What's feeding it? When does it land? What would
I do about it?* If any answer requires a click, the card failed.
