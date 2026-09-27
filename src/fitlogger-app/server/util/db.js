import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || "fitlogger-app-postgresql",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "fitlogger",
  user: process.env.DB_USER || "fitlogger",
  password: process.env.DB_PASSWORD || "fitlogger_secure_pass_2026",
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function initDb() {
  console.log("Initializing PostgreSQL database schema...");
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        equipment VARCHAR(100),
        primary_muscle_group VARCHAR(100),
        secondary_muscle_group VARCHAR(100),
        image_url TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id SERIAL PRIMARY KEY,
        workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sets (
        id SERIAL PRIMARY KEY,
        workout_exercise_id INTEGER REFERENCES workout_exercises(id) ON DELETE CASCADE,
        set_index INTEGER NOT NULL,
        set_type VARCHAR(50) DEFAULT 'normal',
        weight_kg NUMERIC(6,2) DEFAULT 0,
        reps INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS routines (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS routine_exercises (
        id SERIAL PRIMARY KEY,
        routine_id INTEGER REFERENCES routines(id) ON DELETE CASCADE,
        exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
        order_index INTEGER DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS routine_sets (
        id SERIAL PRIMARY KEY,
        routine_exercise_id INTEGER REFERENCES routine_exercises(id) ON DELETE CASCADE,
        set_index INTEGER NOT NULL,
        set_type VARCHAR(50) DEFAULT 'normal',
        target_reps INTEGER DEFAULT 0,
        target_weight_kg NUMERIC(6,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial exercises if table is empty
    const res = await client.query("SELECT COUNT(*) FROM exercises");
    if (parseInt(res.rows[0].count) === 0) {
      console.log("Seeding default exercises into PostgreSQL...");
      const exercisesPath = path.resolve(import.meta.dirname, "../seeding/exercises.json");
      if (fs.existsSync(exercisesPath)) {
        const exercisesData = JSON.parse(fs.readFileSync(exercisesPath, "utf-8"));
        for (const ex of exercisesData) {
          await client.query(
            `INSERT INTO exercises (name, equipment, primary_muscle_group, secondary_muscle_group, image_url)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              ex.name,
              ex.equipment || "Bodyweight",
              ex.primary_muscle_group || ex.primaryMuscleGroup || "General",
              ex.secondary_muscle_group || ex.secondaryMuscleGroup || null,
              ex.image_url || ex.imageUrl || null,
            ]
          );
        }
        console.log(`Seeded ${exercisesData.length} exercises successfully.`);
      }
    }
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Database initialization error:", err);
  } finally {
    client.release();
  }
}
