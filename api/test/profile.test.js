const test   = require("node:test");
const assert = require("node:assert/strict");

const { validateProfile } = require("../src/profile/index");

test("accepts a valid profile payload", () => {
  const errors = validateProfile({
    goals:             "Build strength and fix hamstring weakness",
    experience:        "Intermediate",
    limitations:       "Weak hamstrings",
    daysPerWeek:       4,
    sessionLengthMins: 60
  });
  assert.deepEqual(errors, []);
});

test("accepts profile with empty optional strings", () => {
  const errors = validateProfile({
    goals:             "",
    experience:        "Beginner",
    limitations:       "",
    daysPerWeek:       3,
    sessionLengthMins: 45
  });
  assert.deepEqual(errors, []);
});

test("rejects unknown experience value", () => {
  const errors = validateProfile({
    goals:             "Get fit",
    experience:        "Expert",
    limitations:       "",
    daysPerWeek:       4,
    sessionLengthMins: 60
  });
  assert.ok(errors.some(e => /experience/.test(e)));
});

test("rejects daysPerWeek = 0", () => {
  const errors = validateProfile({
    goals:             "Get fit",
    experience:        "Beginner",
    limitations:       "",
    daysPerWeek:       0,
    sessionLengthMins: 60
  });
  assert.ok(errors.some(e => /daysPerWeek/.test(e)));
});

test("rejects daysPerWeek > 7", () => {
  const errors = validateProfile({
    goals:             "Get fit",
    experience:        "Intermediate",
    limitations:       "",
    daysPerWeek:       8,
    sessionLengthMins: 60
  });
  assert.ok(errors.some(e => /daysPerWeek/.test(e)));
});

test("rejects goals longer than 500 characters", () => {
  const errors = validateProfile({
    goals:             "A".repeat(501),
    experience:        "Advanced",
    limitations:       "",
    daysPerWeek:       5,
    sessionLengthMins: 60
  });
  assert.ok(errors.some(e => /goals/.test(e)));
});

test("rejects sessionLengthMins below 15", () => {
  const errors = validateProfile({
    goals:             "Get fit",
    experience:        "Beginner",
    limitations:       "",
    daysPerWeek:       3,
    sessionLengthMins: 10
  });
  assert.ok(errors.some(e => /sessionLengthMins/.test(e)));
});

test("rejects non-object body", () => {
  const errors = validateProfile(null);
  assert.ok(errors.length > 0);
});
