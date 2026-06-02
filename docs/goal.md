# ROHIT.FIT — Vision, Assessment & Roadmap

## Vision

Build an intelligent, personal gym coach that:
- **Knows you** — your goals, limitations, injuries, schedule, and history
- **Monitors you** — tracks every session, set, rep, weight, and perceived effort
- **Reasons about you** — detects plateaus, imbalances, fatigue accumulation, and progress velocity
- **Adapts your plan** — dynamically adjusts exercises, loads, and volume based on what the data says, not a generic template
- **Closes the loop** — AI prescribes → you execute → app measures → AI learns → repeat

This is not a logging app with a chatbot bolted on. The AI is the coach. The logs are its memory. The plan is its prescription.

---

## Current State (what's built)

| Feature | Status |
|---|---|
| Workout plan viewer (5 hardcoded days) | ✅ Done |
| Log session — weight/reps per set, mark done | ✅ Done |
| Save sessions to Azure Table Storage | ✅ Done |
| History — list, expand, delete sessions | ✅ Done |
| Export sessions as JSON | ✅ Done |
| Assess — session count, sets, streak, strength bars | ✅ Done |
| AI Coach button | ❌ Stubbed — does nothing |
| Dynamic plan | ❌ Plan is hardcoded JS, never changes |
| User profile / goals / limitations | ❌ Not built |
| RPE / session quality tracking | ❌ Not built |
| Volume and trend analytics | ❌ Not built |
| Plateau detection | ❌ Not built |
| Progressive overload targets | ❌ Not built |

---

## What's Missing — By Layer

### Layer 1 — Know You (User Context)
The coach has zero knowledge about you as an athlete.

- User profile: goals, injuries, limitations, experience level
- Equipment inventory (what you actually have access to)
- Availability / schedule (days per week, session length)
- Body metrics over time (weight, measurements)
- Perceived effort (RPE) per session
- Energy and recovery notes

**Needed:** `GET/PUT /api/profile` → new `userprofile` Table

---

### Layer 2 — Smarter Data Collection
The log captures weight and reps. Nothing else.

- RPE (1–10) per set or session — reveals true fatigue, not just load
- Session notes (API stores it, UI ignores it)
- Failed reps — did you hit 8 clean or grind 6 and fail?
- Rest time awareness
- Exercise substitution logging (why did you swap?)

**Needed:** RPE field on session save, notes UI in log page

---

### Layer 3 — Analysis Engine
Current stats are surface-level counts. A coach needs trends.

- Volume per muscle group per week (sets × reps, 4-week rolling)
- Strength curve per exercise — velocity of progress, not just first vs. latest
- Plateau detection — weight/reps stalled for N sessions on same exercise
- Push/pull/legs volume balance — imbalances cause injuries
- Progressive overload success rate — % of sessions that beat last week
- Estimated 1RM per key lift
- Deload signal — fatigue accumulating faster than recovery

**Needed:** `GET /api/analytics` — pre-computed trends and flags

---

### Layer 4 — AI Coach Engine
The `runAssessment` button shows a disabled message. Nothing calls an LLM.

- `/api/assess` endpoint — assembles context, calls Claude, streams response
- Context assembly: profile + last 8 weeks of sessions + analytics trends
- Structured system prompt: coach persona, your goals, your limitations
- Plateau-specific reasoning: why you're stuck, what to change, with specificity
- Deload detection and prescription
- Periodization advice: 4–6 week mesocycle planning (build → peak → deload)
- Streaming to frontend (typewriter UI already built and waiting)

**Needed:** `POST /api/assess` with SSE streaming, Anthropic API key

---

### Layer 5 — Dynamic Plan Management
The plan is a hardcoded JS object in index.html. The AI cannot read or write it.

- Plan stored in database, versioned, not hardcoded
- Per-exercise progressive overload targets (coach writes "aim for 42.5 lb next session")
- AI-generated plan adjustments committed back to storage
- Mesocycle structure — explicit build / peak / deload phases
- Exercise substitution library for injuries or missing equipment
- Plan history — what was prescribed vs. what was executed

**Needed:** `GET/PUT /api/plan`, `POST /api/plan/generate` → new `workoutplans` Table

---

## Roadmap

### Phase 1 — Complete the Data (Foundation)
*Goal: give the coach something meaningful to work with*

- [ ] User profile endpoint (`/api/profile`) + profile UI screen
- [ ] RPE field on session log (1–10 slider, saved with session)
- [ ] Surface notes field in log and history
- [ ] Session breakdown by muscle group on Assess page

### Phase 2 — Analytics Layer
*Goal: turn raw logs into coach-readable signals*

- [ ] `/api/analytics` — volume trends, strength curves, plateau flags
- [ ] Assess page redesign: weekly volume chart, trend lines, imbalance warnings
- [ ] Plateau detection: flag any exercise with no progression in 3+ sessions
- [ ] Push/pull/legs weekly volume balance display

### Phase 3 — AI Coach (the unlock)
*Goal: the actual intelligence*

- [ ] `/api/assess` — Claude integration with full context assembly
  - System prompt: role definition, your goals, your limitations
  - Context: profile + last 8 weeks of sessions + analytics output
  - Streaming SSE response to frontend
- [ ] Plateau-specific coaching mode with concrete prescription
- [ ] Deload detection and recommendation
- [ ] Monthly review mode: what worked, what didn't, what changes

### Phase 4 — Dynamic Plan
*Goal: close the feedback loop*

- [ ] Move plan from hardcoded JS → `workoutplans` Table
- [ ] `/api/plan` — read and update current plan
- [ ] AI writes specific per-exercise targets after each assessment
- [ ] Plan versioning — track what was prescribed vs. executed
- [ ] Mesocycle planner — AI generates a 4–6 week program block

### Phase 5 — Polish
*Goal: feels like a real product*

- [ ] PWA manifest + service worker (offline plan access on phone)
- [ ] Rest timer between sets with haptic pulse
- [ ] Push notifications for scheduled sessions
- [ ] Body weight / measurement tracking with trend graph
- [ ] Dark/light theme toggle

---

## The Feedback Loop (end state)

```
┌─────────────────────────────────────────────────────┐
│                    YOU                              │
│  Profile: goals, limitations, schedule              │
└────────────────────┬────────────────────────────────┘
                     │ executes
                     ▼
┌─────────────────────────────────────────────────────┐
│                DYNAMIC PLAN                         │
│  AI-prescribed exercises, loads, targets per week   │
└────────────────────┬────────────────────────────────┘
                     │ logged as
                     ▼
┌─────────────────────────────────────────────────────┐
│                SESSION LOGS                         │
│  Weight, reps, RPE, notes per set                   │
└────────────────────┬────────────────────────────────┘
                     │ analyzed into
                     ▼
┌─────────────────────────────────────────────────────┐
│             ANALYTICS ENGINE                        │
│  Volume trends, plateau flags, fatigue signals      │
└────────────────────┬────────────────────────────────┘
                     │ fed into
                     ▼
┌─────────────────────────────────────────────────────┐
│               CLAUDE (AI COACH)                     │
│  Reasons over your data, prescribes adjustments     │
└────────────────────┬────────────────────────────────┘
                     │ updates
                     ▼
              DYNAMIC PLAN  (loop repeats)
```

Phase 3 is the unlock. Everything before it is feeding data in. Everything after it is acting on AI output.
