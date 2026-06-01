# Frontend Design

## Purpose

The Liftr frontend is a mobile-first workout tracking interface designed for use during gym sessions. The primary job of the UI is to make workout logging fast, thumb-friendly, and visually clear while still giving the user a plan, history, and progress assessment.

The current implementation is a single static file:

```text
frontend/index.html
```

It contains all markup, styling, and JavaScript in one document. There is no frontend build step, framework, bundler, or package manager.

## Product Experience

The app is organized around four primary tabs:

- Plan: browse the prescribed Push/Pull/Legs training plan.
- Log: select a training day and record weight/reps/sets.
- History: review previously saved sessions and delete records.
- History export: download saved sessions as JSON for backup.
- Assess: view aggregate training stats and run a coach-style assessment.

The frontend is intentionally optimized for a phone screen:

- Bottom fixed navigation.
- Large tap targets.
- Stepper controls for weight and reps.
- Hold-to-repeat increment/decrement controls.
- Sticky save button above the nav.
- Accordion exercise cards.
- Auto-open next exercise when the current exercise is complete.
- Haptic feedback where supported by the device.

## Visual System

The current UI uses a dark, high-contrast visual style with workout-category accent colors:

- Push: orange/red.
- Pull: blue.
- Legs: green.
- Progress/gold accent: yellow.

Design details:

- CSS custom properties define color tokens, radius, and tap target size.
- Background has a subtle noise texture.
- Animated blurred color orbs create movement.
- Cards use low-opacity glass surfaces and borders.
- The nav is a frosted glass pill fixed to the bottom.
- Cards animate in with staggered transitions.
- Splash screen shows a logo pulse and loading bar.

Typography:

- `Unbounded` for display titles and stat numbers.
- `Space Grotesk` for primary UI text.
- `Space Mono` for metadata, labels, and numeric detail.

External dependency:

- Google Fonts are loaded from `fonts.googleapis.com`.

## State Model

The frontend uses in-memory JavaScript state:

```js
let activePlanKey = "push1";
let selectedDay = null;
let setData = {};
let sessions = [];
let statsData = null;
```

Main state responsibilities:

- `activePlanKey`: selected plan day in the Plan tab.
- `selectedDay`: selected workout day in the Log tab.
- `setData`: temporary unsaved set data by day/exercise/set.
- `sessions`: session list fetched from the API.
- `statsData`: aggregate stats fetched from the API.

No client-side persistence is currently used for in-progress workout logs. If the page reloads before saving, the current log state is lost.

## Workout Plan Data

The workout plan is hardcoded in the `PLANS` constant in `frontend/index.html`.

Plan keys:

- `push1`
- `pull1`
- `legs`
- `push2`
- `pull2`

Each plan contains:

- Human-readable name.
- Subtitle.
- Type: `PUSH`, `PULL`, or `LEGS`.
- Color category.
- Exercise list.

Each exercise contains:

- Exercise name.
- Target sets/reps.
- Starting weight.
- Unit.
- Number of sets.
- Coaching tip.

This design keeps the app simple, but changing the workout plan requires editing frontend source code.

## API Integration

The frontend API config is currently:

```js
const API_BASE = window.ENV_API_BASE || "https://liftr-func.azurewebsites.net/api";
const API_KEY  = window.ENV_API_KEY  || "";
```

API helper functions:

- `apiGet(path)`
- `apiPost(path, body)`
- `apiDelete(path)`

Every API request sends:

```http
X-API-Key: <API_KEY>
```

Important limitation: because this is a static frontend, any API key exposed to browser code is public to anyone who can load the app. This is acceptable only as light single-user friction, not as strong authentication.

## User Flows

### Plan Flow

1. User opens the Plan tab.
2. `renderPlan()` renders day chips.
3. User taps a day chip.
4. `renderPlanContent(key)` renders exercise cards.
5. User expands cards to see starting weight, sets/reps, rest, and progression targets.

### Log Flow

1. User opens the Log tab.
2. User selects a workout day.
3. `buildLogForm(key)` renders exercise accordions and set rows.
4. `ensureSetData(key)` initializes set state from plan defaults.
5. User adjusts weight and reps with steppers.
6. User marks sets complete with check buttons.
7. User taps Save Session.
8. `saveSession()` sends session payload to `POST /api/sessions`.
9. On success, temporary log state for that day is cleared.

Current behavior:

- `saveSession()` saves only sets that are marked complete and have `reps > 0`.
- This prevents default starting weights from creating zero-rep history records.
- The backend also validates saved sets and rejects non-positive reps.

### History Flow

1. User opens History.
2. `loadHistory()` calls `GET /api/sessions`.
3. Sessions are rendered newest first.
4. User can expand a session to see exercise sets.
5. User can delete a session.
6. `deleteSession(id)` calls `DELETE /api/session/{id}`.

The History tab also includes an Export button that downloads the currently loaded sessions as a JSON file. This gives V1 a simple backup path without adding another Azure service.

### Assess Flow

1. User opens Assess.
2. `loadStats()` calls `GET /api/stats`.
3. Stat tiles animate counts for sessions, sets, active days, and streak.
4. Strength progress bars render for configured key exercises.
5. User can run AI assessment.

Current issue:

- `runAssessment()` attempts to call Anthropic directly from the browser.
- This is not production-safe because model API keys cannot be protected in browser code.
- Recommended fix: move assessment to a backend Function endpoint such as `POST /api/assessment`.

## Rendering Approach

The frontend heavily uses template strings and `innerHTML`.

Benefits:

- Simple implementation.
- No framework dependency.
- Fast to iterate.

Risks:

- Stored XSS if persisted values are rendered without escaping.
- Harder to test than componentized UI.
- Large single file can become difficult to maintain.

Recommendation:

- Keep the no-build static approach for now.
- Add a small `escapeHtml(value)` helper before rendering persisted strings from the API.
- Consider splitting CSS and JS into separate static files once the app grows.

## Accessibility And Mobile Considerations

Current strengths:

- Large buttons and controls.
- Strong visual grouping.
- Mobile viewport configured.
- Bottom navigation is easy to reach.
- Accordion layout reduces scrolling density.

Areas to improve:

- Replace emoji-only controls where needed with accessible labels.
- Ensure all buttons have useful `aria-label` values.
- Avoid disabling zoom unless there is a strong product reason.
- Add reduced-motion support with `prefers-reduced-motion`.
- Ensure contrast remains sufficient on all accent colors.

## Recommended Frontend Evolution

Near-term:

1. Fix zero-rep set persistence.
2. Add safe HTML escaping.
3. Move AI assessment calls server-side.
4. Add local draft persistence for in-progress workouts.
5. Add clear loading and error states for all API-backed views.

Medium-term:

1. Split `index.html` into `index.html`, `styles.css`, and `app.js`.
2. Add a lightweight test harness for pure JS functions.
3. Add configurable API base/key injection strategy for deployment.
4. Add PWA support for home-screen launch and offline shell caching.

Long-term:

1. Move workout plan data to backend storage or a versioned JSON file.
2. Add user authentication if the app is ever exposed beyond private use.
3. Add charts for volume, exercise progression, and consistency.
