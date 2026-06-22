'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  EXERCISE_LIBRARY,
  getExerciseById,
  getExerciseByName,
  searchExercises,
  getExercisesForMuscle,
  getCompoundFirst,
  getLibrarySummaryForPrompt
} = require('../src/exercises/library');

test('library has exercises', () => {
  const ids = Object.keys(EXERCISE_LIBRARY);
  assert.ok(ids.length >= 50, `Expected >= 50 exercises, got ${ids.length}`);
});

test('every exercise has required fields', () => {
  const required = ['id', 'name', 'category', 'modality', 'primaryMuscles', 'secondaryMuscles', 'equipment', 'difficulty', 'defaultSets', 'defaultReps', 'defaultRestSec', 'cues', 'tags'];
  for (const [id, ex] of Object.entries(EXERCISE_LIBRARY)) {
    for (const field of required) {
      assert.ok(ex[field] !== undefined, `${id} missing field: ${field}`);
    }
    assert.equal(ex.id, id, `${id}: id field must match key`);
  }
});

test('backward compat — existing session exercise names resolve', () => {
  const existing = [
    'DB Flat Bench Press', 'DB Incline Press', 'Lateral Raises',
    'DB Romanian Deadlift', 'DB Walking Lunges', 'Standing Calf Raises',
    'Weighted Pull-ups', 'DB Row (one arm)', 'EZ Bar Curl',
    'DB Goblet Squat'
  ];
  for (const name of existing) {
    const ex = getExerciseByName(name);
    assert.ok(ex, `getExerciseByName failed for: "${name}"`);
  }
});

test('getExerciseById returns correct exercise', () => {
  const ex = getExerciseById('db-flat-bench-press');
  assert.equal(ex.name, 'DB Flat Bench Press');
  assert.equal(ex.category, 'compound');
});

test('getExerciseById returns null for unknown id', () => {
  assert.equal(getExerciseById('not-a-real-exercise'), null);
});

test('getExerciseByName is case-insensitive', () => {
  const ex = getExerciseByName('db flat bench press');
  assert.ok(ex);
  assert.equal(ex.id, 'db-flat-bench-press');
});

test('searchExercises by muscle', () => {
  const results = searchExercises({ muscle: 'chest' });
  assert.ok(results.length > 0);
  results.forEach(ex => {
    const allMuscles = [...ex.primaryMuscles, ...ex.secondaryMuscles];
    assert.ok(allMuscles.some(m => m.includes('chest')), `${ex.id} does not target chest`);
  });
});

test('searchExercises by modality', () => {
  const yoga = searchExercises({ modality: 'yoga' });
  assert.ok(yoga.length > 0);
  yoga.forEach(ex => assert.equal(ex.modality, 'yoga'));
});

test('searchExercises by tag', () => {
  const warmupExs = searchExercises({ tag: 'warmup' });
  assert.ok(warmupExs.length > 0);
});

test('searchExercises returns all when no filters', () => {
  const all = searchExercises({});
  assert.equal(all.length, Object.keys(EXERCISE_LIBRARY).length);
});

test('getExercisesForMuscle returns exercises for hamstrings', () => {
  const results = getExercisesForMuscle('hamstrings');
  assert.ok(results.length > 0);
});

test('getCompoundFirst orders compound before isolation', () => {
  const mixed = [
    getExerciseById('lateral-raises'),   // isolation
    getExerciseById('db-flat-bench-press'), // compound
    getExerciseById('db-tricep-kickback'), // isolation
    getExerciseById('db-shoulder-press')   // compound
  ].filter(Boolean);

  const ordered = getCompoundFirst(mixed);
  const categories = ordered.map(e => e.category);
  const firstIsolationIdx = categories.indexOf('isolation');
  const lastCompoundIdx = categories.lastIndexOf('compound');
  assert.ok(lastCompoundIdx < firstIsolationIdx || firstIsolationIdx === -1,
    'All compounds should come before isolation exercises');
});

test('getLibrarySummaryForPrompt returns non-empty object', () => {
  const summary = getLibrarySummaryForPrompt();
  assert.ok(typeof summary === 'object');
  assert.ok(Object.keys(summary).length > 0);
  assert.ok(Array.isArray(summary['chest']));
});

test('functional exercises exist', () => {
  const functional = searchExercises({ modality: 'conditioning' });
  assert.ok(functional.length > 0, 'Should have conditioning exercises');
  const kettlebell = getExerciseById('kettlebell-swing');
  assert.ok(kettlebell, 'Kettlebell swing should be in library');
  assert.equal(kettlebell.modality, 'conditioning');
});
