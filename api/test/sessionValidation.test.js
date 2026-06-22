const test = require("node:test");
const assert = require("node:assert/strict");

const { sanitizeRowKey, validateSessionPayload } = require("../src/sessions/validation");

test("accepts a valid session payload and normalizes text", () => {
  const result = validateSessionPayload({
    dayKey: "push1",
    dayName: " Push Day 1 ",
    dayType: "PUSH",
    date: "2026-06-01T12:00:00.000Z",
    exercises: [
      {
        name: " DB Flat Bench Press ",
        sets: [
          { weight: 40, reps: 8 },
          { weight: "42.5", reps: 6 }
        ]
      }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.dayName, "Push Day 1");
  assert.equal(result.value.exercises[0].name, "DB Flat Bench Press");
  assert.deepEqual(result.value.exercises[0].sets[1], { weight: 42.5, reps: 6 });
});

test("rejects zero-rep sets so default weights cannot pollute history", () => {
  const result = validateSessionPayload({
    dayKey: "push1",
    dayType: "PUSH",
    exercises: [
      {
        name: "DB Flat Bench Press",
        sets: [{ weight: 40, reps: 0 }]
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /reps must be an integer between 1 and 100/);
});

test("accepts flexible day keys (not locked to push1/pull1/legs)", () => {
  // Any slug is now valid
  const result = validateSessionPayload({
    dayKey: "arms",
    dayType: "PUSH",
    exercises: [{ name: "EZ Bar Curl", sets: [{ weight: 25, reps: 10 }] }]
  });
  assert.equal(result.ok, true);
});

test("accepts hybrid day type", () => {
  const result = validateSessionPayload({
    dayKey: "hybrid1",
    dayType: "HYBRID",
    exercises: [{ name: "Kettlebell Swing", sets: [{ weight: 24, reps: 15 }] }]
  });
  assert.equal(result.ok, true);
});

test("accepts all expanded day types", () => {
  const types = ["PUSH", "PULL", "LEGS", "UPPER", "LOWER", "FULL", "FUNCTIONAL", "MOBILITY", "CONDITIONING", "YOGA", "HYBRID", "CUSTOM"];
  for (const dayType of types) {
    const result = validateSessionPayload({
      dayKey: "test1",
      dayType,
      exercises: [{ name: "Push-Up", sets: [{ weight: 0, reps: 10 }] }]
    });
    assert.equal(result.ok, true, `dayType "${dayType}" should be valid`);
  }
});

test("rejects uppercase or invalid day key slugs", () => {
  const result = validateSessionPayload({
    dayKey: "Push1",
    dayType: "PUSH",
    exercises: [{ name: "Push-Up", sets: [{ weight: 0, reps: 10 }] }]
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /dayKey must be a lowercase alphanumeric slug/);
});

test("rejects unknown dayType", () => {
  const result = validateSessionPayload({
    dayKey: "test1",
    dayType: "ARMS",
    exercises: [{ name: "EZ Bar Curl", sets: [{ weight: 25, reps: 10 }] }]
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /dayType must be one of/);
});

test("accepts session timing fields", () => {
  const result = validateSessionPayload({
    dayKey: "push1",
    dayType: "PUSH",
    sessionStartedAt: "2026-06-01T10:00:00.000Z",
    sessionEndedAt: "2026-06-01T11:05:00.000Z",
    sessionDurationSec: 3900,
    exercises: [{ name: "DB Flat Bench Press", sets: [{ weight: 40, reps: 8 }] }]
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.sessionDurationSec, 3900);
});

test("accepts skippedExercises array", () => {
  const result = validateSessionPayload({
    dayKey: "push1",
    dayType: "PUSH",
    skippedExercises: ["DB Incline Press"],
    exercises: [{ name: "DB Flat Bench Press", sets: [{ weight: 40, reps: 8 }] }]
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.skippedExercises, ["DB Incline Press"]);
});

test("accepts per-set rpe and restActualSec", () => {
  const result = validateSessionPayload({
    dayKey: "push1",
    dayType: "PUSH",
    exercises: [{
      name: "DB Flat Bench Press",
      sets: [
        { weight: 40, reps: 8, rpe: 7, restActualSec: 95 },
        { weight: 42.5, reps: 7, rpe: 8, restActualSec: 120 }
      ]
    }]
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.exercises[0].sets[0].rpe, 7);
  assert.equal(result.value.exercises[0].sets[0].restActualSec, 95);
});

test("rejects invalid per-set rpe", () => {
  const result = validateSessionPayload({
    dayKey: "push1",
    dayType: "PUSH",
    exercises: [{
      name: "DB Flat Bench Press",
      sets: [{ weight: 40, reps: 8, rpe: 11 }]
    }]
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /rpe must be 1-10/);
});

test("sanitizes table row keys", () => {
  assert.equal(sanitizeRowKey("DB Row (one arm) / heavy?"), "db-row-one-arm-heavy");
  assert.equal(sanitizeRowKey(" /?# "), "exercise");
});
