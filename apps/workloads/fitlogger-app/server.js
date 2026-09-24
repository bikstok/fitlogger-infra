const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory workout log store with initial seed data
let workouts = [
  {
    id: 1,
    exercise: 'Barbell Squat',
    sets: 4,
    reps: 8,
    weight: 100,
    unit: 'kg',
    notes: 'Warm-up with 60kg, felt solid on last set',
    date: new Date().toISOString().split('T')[0]
  },
  {
    id: 2,
    exercise: 'Bench Press',
    sets: 3,
    reps: 10,
    weight: 80,
    unit: 'kg',
    notes: 'Paused at chest, good control',
    date: new Date().toISOString().split('T')[0]
  }
];

let nextId = 3;

// Kubernetes Liveness and Readiness Probes
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.get('/readyz', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

// REST API Endpoints
app.get('/api/workouts', (req, res) => {
  res.json(workouts);
});

app.post('/api/workouts', (req, res) => {
  const { exercise, sets, reps, weight, unit = 'kg', notes = '', date } = req.body;

  if (!exercise || sets === undefined || reps === undefined) {
    return res.status(400).json({ error: 'Exercise, sets, and reps are required.' });
  }

  const newWorkout = {
    id: nextId++,
    exercise: String(exercise).trim(),
    sets: Number(sets),
    reps: Number(reps),
    weight: Number(weight) || 0,
    unit: unit === 'lbs' ? 'lbs' : 'kg',
    notes: String(notes).trim(),
    date: date || new Date().toISOString().split('T')[0]
  };

  workouts.unshift(newWorkout);
  res.status(201).json(newWorkout);
});

app.delete('/api/workouts/:id', (req, res) => {
  const id = Number(req.params.id);
  const initialLength = workouts.length;
  workouts = workouts.filter((w) => w.id !== id);

  if (workouts.length === initialLength) {
    return res.status(404).json({ error: 'Workout entry not found' });
  }

  res.status(204).end();
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[fitlogger] App listening on port ${PORT}`);
});

// Graceful shutdown for Kubernetes
const shutdown = (signal) => {
  console.log(`[fitlogger] Received ${signal}, closing server gracefully...`);
  server.close(() => {
    console.log('[fitlogger] HTTP server closed. Process terminating.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
