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

test("rejects unknown workout days", () => {
  const result = validateSessionPayload({
    dayKey: "arms",
    dayType: "PUSH",
    exercises: [
      {
        name: "Curl",
        sets: [{ weight: 25, reps: 10 }]
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /dayKey must be one of/);
});

test("sanitizes table row keys", () => {
  assert.equal(sanitizeRowKey("DB Row (one arm) / heavy?"), "db-row-one-arm-heavy");
  assert.equal(sanitizeRowKey(" /?# "), "exercise");
});
