import { pool } from "./db.js";

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.conditions = [];
    this.values = [];
    this.selectFields = "*";
    this.orderBy = "";
    this.limitVal = null;
    this.offsetVal = null;
    this.isSingle = false;
    this.action = "SELECT";
    this.insertPayload = null;
  }

  select(fields = "*") {
    this.selectFields = fields;
    return this;
  }

  insert(data) {
    this.action = "INSERT";
    this.insertPayload = Array.isArray(data) ? data : [data];
    return this;
  }

  delete() {
    this.action = "DELETE";
    return this;
  }

  eq(column, value) {
    this.values.push(value);
    this.conditions.push(`"${column}" = $${this.values.length}`);
    return this;
  }

  gte(column, value) {
    this.values.push(value);
    this.conditions.push(`"${column}" >= $${this.values.length}`);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orderBy = `ORDER BY "${column}" ${ascending ? "ASC" : "DESC"}`;
    return this;
  }

  limit(num) {
    this.limitVal = num;
    return this;
  }

  range(from, to) {
    this.offsetVal = from;
    this.limitVal = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    this.limitVal = 1;
    return this;
  }

  async execute() {
    const client = await pool.connect();
    try {
      if (this.action === "INSERT") {
        const results = [];
        for (const row of this.insertPayload) {
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
          const quotedKeys = keys.map((k) => `"${k}"`).join(", ");

          const sql = `INSERT INTO "${this.table}" (${quotedKeys}) VALUES (${placeholders}) RETURNING *;`;
          const res = await client.query(sql, values);
          results.push(res.rows[0]);
        }
        return {
          data: this.isSingle ? results[0] : results,
          error: null,
        };
      }

      if (this.action === "DELETE") {
        const whereClause = this.conditions.length ? `WHERE ${this.conditions.join(" AND ")}` : "";
        const sql = `DELETE FROM "${this.table}" ${whereClause};`;
        await client.query(sql, this.values);
        return { data: null, error: null };
      }

      // SELECT Queries
      if (this.table === "workouts" && this.selectFields.includes("workout_exercises")) {
        // Nested workouts with workout_exercises, sets, and exercises
        const whereClause = this.conditions.length ? `WHERE ${this.conditions.join(" AND ")}` : "";
        let pagination = "";
        if (this.limitVal) pagination += ` LIMIT ${this.limitVal}`;
        if (this.offsetVal) pagination += ` OFFSET ${this.offsetVal}`;

        const sql = `
          SELECT 
            w.*,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', we.id,
                    'workout_id', we.workout_id,
                    'exercise_id', we.exercise_id,
                    'notes', we.notes,
                    'exercises', (
                      SELECT json_build_object(
                        'id', e.id,
                        'name', e.name,
                        'equipment', e.equipment,
                        'primary_muscle_group', e.primary_muscle_group,
                        'secondary_muscle_group', e.secondary_muscle_group,
                        'image_url', e.image_url
                      ) FROM exercises e WHERE e.id = we.exercise_id
                    ),
                    'sets', COALESCE(
                      (
                        SELECT json_agg(
                          json_build_object(
                            'id', s.id,
                            'workout_exercise_id', s.workout_exercise_id,
                            'set_index', s.set_index,
                            'set_type', s.set_type,
                            'weight_kg', s.weight_kg,
                            'reps', s.reps
                          ) ORDER BY s.set_index ASC
                        ) FROM sets s WHERE s.workout_exercise_id = we.id
                      ), '[]'::json
                    )
                  ) ORDER BY we.id ASC
                ) FROM workout_exercises we WHERE we.workout_id = w.id
              ), '[]'::json
            ) AS workout_exercises
          FROM workouts w
          ${whereClause}
          ${this.orderBy || 'ORDER BY w.start_time DESC'}
          ${pagination};
        `;
        const res = await client.query(sql, this.values);
        return {
          data: this.isSingle ? res.rows[0] || null : res.rows,
          error: null,
        };
      }

      if (this.table === "routines" && this.selectFields.includes("routine_exercises")) {
        // Nested routines with routine_exercises, routine_sets, and exercises
        const whereClause = this.conditions.length ? `WHERE ${this.conditions.join(" AND ")}` : "";
        const sql = `
          SELECT 
            r.*,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', re.id,
                    'routine_id', re.routine_id,
                    'exercise_id', re.exercise_id,
                    'order_index', re.order_index,
                    'notes', re.notes,
                    'exercises', (
                      SELECT json_build_object(
                        'id', e.id,
                        'name', e.name,
                        'equipment', e.equipment,
                        'primary_muscle_group', e.primary_muscle_group,
                        'secondary_muscle_group', e.secondary_muscle_group,
                        'image_url', e.image_url
                      ) FROM exercises e WHERE e.id = re.exercise_id
                    ),
                    'routine_sets', COALESCE(
                      (
                        SELECT json_agg(
                          json_build_object(
                            'id', rs.id,
                            'routine_exercise_id', rs.routine_exercise_id,
                            'set_index', rs.set_index,
                            'set_type', rs.set_type,
                            'target_reps', rs.target_reps,
                            'target_weight_kg', rs.target_weight_kg
                          ) ORDER BY rs.set_index ASC
                        ) FROM routine_sets rs WHERE rs.routine_exercise_id = re.id
                      ), '[]'::json
                    )
                  ) ORDER BY re.order_index ASC
                ) FROM routine_exercises re WHERE re.routine_id = r.id
              ), '[]'::json
            ) AS routine_exercises
          FROM routines r
          ${whereClause}
          ${this.orderBy || 'ORDER BY r.created_at DESC'};
        `;
        const res = await client.query(sql, this.values);
        return {
          data: this.isSingle ? res.rows[0] || null : res.rows,
          error: null,
        };
      }

      // Stats: Muscle Distribution
      if (this.table === "workout_exercises" && this.selectFields.includes("primary_muscle_group")) {
        const userId = this.values[0];
        const startDate = this.values[1];
        const sql = `
          SELECT 
            json_build_object('primary_muscle_group', e.primary_muscle_group) AS exercises
          FROM workout_exercises we
          JOIN exercises e ON e.id = we.exercise_id
          JOIN workouts w ON w.id = we.workout_id
          WHERE w.user_id = $1 AND w.start_time >= $2;
        `;
        const res = await client.query(sql, [userId, startDate]);
        return { data: res.rows, error: null };
      }

      // Stats: Exercise Progression
      if (this.table === "workout_exercises" && this.selectFields.includes("weight_kg")) {
        const exerciseId = this.values[0];
        const userId = this.values[1];
        const startDate = this.values[2];
        const sql = `
          SELECT 
            (
              SELECT json_agg(json_build_object('weight_kg', s.weight_kg))
              FROM sets s WHERE s.workout_exercise_id = we.id
            ) AS sets,
            json_build_object('start_time', w.start_time, 'user_id', w.user_id) AS workouts
          FROM workout_exercises we
          JOIN workouts w ON w.id = we.workout_id
          WHERE we.exercise_id = $1 AND w.user_id = $2 AND w.start_time >= $3;
        `;
        const res = await client.query(sql, [exerciseId, userId, startDate]);
        return { data: res.rows, error: null };
      }

      // Generic SELECT
      let whereClause = this.conditions.length ? `WHERE ${this.conditions.join(" AND ")}` : "";
      let pagination = "";
      if (this.limitVal) pagination += ` LIMIT ${this.limitVal}`;
      if (this.offsetVal) pagination += ` OFFSET ${this.offsetVal}`;

      const sql = `SELECT * FROM "${this.table}" ${whereClause} ${this.orderBy} ${pagination};`;
      const res = await client.query(sql, this.values);
      return {
        data: this.isSingle ? res.rows[0] || null : res.rows,
        error: null,
      };
    } catch (err) {
      console.error(`Database error on ${this.table}:`, err);
      return { data: null, error: err };
    } finally {
      client.release();
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

const supabase = {
  from(table) {
    return new QueryBuilder(table);
  },
};

export default supabase;
