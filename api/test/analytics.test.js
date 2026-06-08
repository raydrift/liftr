const test   = require("node:test");
const assert = require("node:assert/strict");

const {
  detectPlateaus,
  computeWeeklyVolume,
  computeVolumeBalance,
  epley1RM,
  getISOWeek
} = require("../src/analytics/index");

// ─── Epley 1RM ────────────────────────────────────────────────────────────────

test("epley 1RM: 100lb × 10 reps → ~133", () => {
  assert.equal(epley1RM(100, 10), 133);
});

test("epley 1RM: single rep returns same weight", () => {
  assert.equal(epley1RM(80, 1), Math.round(80 * (1 + 1 / 30)));
});

// ─── ISO week ─────────────────────────────────────────────────────────────────

test("getISOWeek returns expected format", () => {
  const week = getISOWeek("2026-06-01T10:00:00.000Z");
  assert.match(week, /^\d{4}-W\d{2}$/);
});

// ─── Plateau detection ────────────────────────────────────────────────────────

function makeHistory(weights) {
  // Create fake exercise history for "DB Flat Bench Press"
  return {
    "DB Flat Bench Press": weights.map((w, i) => ({
      weight: w, reps: 8,
      date: `2026-0${Math.floor(i / 4) + 1}-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
      sessionId: `s${i}`
    }))
  };
}

test("detectPlateaus: flags exercise stuck for 4 sessions", () => {
  const history = makeHistory([35, 37.5, 40, 40, 40, 40, 40]);
  const plateaus = detectPlateaus(history);
  assert.equal(plateaus.length, 1);
  assert.equal(plateaus[0].exercise, "DB Flat Bench Press");
  assert.equal(plateaus[0].stuckAt, 40);
  assert.ok(plateaus[0].sessionsStuck >= 4);
});

test("detectPlateaus: no flag when progressing", () => {
  const history = makeHistory([35, 37.5, 40, 42.5, 45, 47.5]);
  const plateaus = detectPlateaus(history);
  assert.equal(plateaus.length, 0);
});

test("detectPlateaus: no flag with fewer than 4 sessions", () => {
  const history = makeHistory([40, 40, 40]);
  const plateaus = detectPlateaus(history);
  assert.equal(plateaus.length, 0);
});

// ─── Weekly volume ────────────────────────────────────────────────────────────

test("computeWeeklyVolume: returns 8 weeks", () => {
  const result = computeWeeklyVolume([], {}, new Date("2026-06-08"));
  assert.equal(result.length, 8);
});

test("computeWeeklyVolume: sums sets correctly by type", () => {
  const now = new Date("2026-06-08T12:00:00.000Z"); // Monday
  // Use Tue/Wed of same ISO week — June 7 is Sunday (previous week in ISO 8601)
  const sessions = [
    { id: "s1", date: "2026-06-09T10:00:00.000Z", dayType: "PUSH", rpe: 7 }, // Tuesday
    { id: "s2", date: "2026-06-10T10:00:00.000Z", dayType: "PULL", rpe: 6 }  // Wednesday
  ];
  const sessionSets = { s1: 20, s2: 18 };
  const result = computeWeeklyVolume(sessions, sessionSets, now);
  const thisWeek = result[result.length - 1];
  assert.equal(thisWeek.push, 20);
  assert.equal(thisWeek.pull, 18);
  assert.equal(thisWeek.total, 38);
});

// ─── Volume balance ───────────────────────────────────────────────────────────

test("computeVolumeBalance: percentages sum to 100", () => {
  const now = new Date("2026-06-08");
  const sessions = [
    { id: "s1", date: "2026-06-01T10:00:00.000Z", dayType: "PUSH", rpe: 7 },
    { id: "s2", date: "2026-06-02T10:00:00.000Z", dayType: "PULL", rpe: 6 },
    { id: "s3", date: "2026-06-03T10:00:00.000Z", dayType: "LEGS", rpe: 8 }
  ];
  const sessionSets = { s1: 20, s2: 20, s3: 20 };
  const balance = computeVolumeBalance(sessions, sessionSets, now);
  assert.equal(balance.push + balance.pull + balance.legs, 100);
});

test("computeVolumeBalance: empty sessions returns all zeros", () => {
  const balance = computeVolumeBalance([], {}, new Date());
  assert.equal(balance.push, 0);
  assert.equal(balance.pull, 0);
  assert.equal(balance.legs, 0);
});
