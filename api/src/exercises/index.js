'use strict';

const { EXERCISE_LIBRARY, searchExercises } = require('./library');

module.exports = async function exercisesHandler(context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, body: '', headers: { 'Access-Control-Allow-Methods': 'GET, OPTIONS' } };
    return;
  }

  if (req.method !== 'GET') {
    context.res = { status: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    return;
  }

  const { muscle, modality, category, equipment, difficulty, tag } = req.query || {};

  let exercises;
  const hasFilters = muscle || modality || category || equipment || difficulty || tag;

  if (hasFilters) {
    exercises = searchExercises({
      muscle,
      modality,
      category,
      equipment: equipment ? equipment.split(',') : undefined,
      difficulty,
      tag
    });
  } else {
    exercises = Object.values(EXERCISE_LIBRARY);
  }

  context.res = {
    status: 200,
    body: JSON.stringify({ exercises, count: exercises.length }),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600'
    }
  };
};
