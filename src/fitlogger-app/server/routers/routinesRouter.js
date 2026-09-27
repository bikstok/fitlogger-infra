import { Router } from "express";
import supabase from "../util/supabaseUtil.js";
import { requireAuthentication } from "../util/authUtil.js";

const router = Router();

router.get("/api/routines/:userId", requireAuthentication, async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from("routines")
      .select(
        `
        *,
        routine_exercises (
          *,
          exercises (*),
          routine_sets (*)
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.send({ data });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.get(
  "/api/routines/detail/:id",
  requireAuthentication,
  async (req, res) => {
    const { id } = req.params;
    try {
      const { data, error } = await supabase
        .from("routines")
        .select(
          `
        *,
        routine_exercises (
          *,
          exercises (*),
          routine_sets (*)
        )
      `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      res.send({ data });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  }
);

router.post("/api/routines", requireAuthentication, async (req, res) => {
  const { user_id, name, description, exercises } = req.body;

  if (!user_id || !name) {
    return res.status(400).send({
      error: "Missing required fields: user_id, name",
    });
  }

  try {
    // 1. Create Routine
    const { data: routine, error: routineError } = await supabase
      .from("routines")
      .insert([
        {
          user_id,
          name,
          description,
        },
      ])
      .select()
      .single();

    if (routineError) throw routineError;
    const routineId = routine.id;

    // 2. Loop Exercises
    if (exercises && exercises.length > 0) {
      for (const [index, exercise] of exercises.entries()) {
        // A. Insert Routine_Exercise Link
        const { data: routineExercise, error: reError } = await supabase
          .from("routine_exercises")
          .insert([
            {
              routine_id: routineId,
              exercise_id: exercise.exercise_id,
              order_index: index,
              notes: exercise.notes || "",
            },
          ])
          .select()
          .single();

        if (reError) throw reError;

        // B. Insert Template Sets
        if (exercise.sets && exercise.sets.length > 0) {
          const setsPayload = exercise.sets.map((set, setIndex) => ({
            routine_exercise_id: routineExercise.id,
            set_index: setIndex,
            set_type: set.set_type || "normal",
            target_reps: set.reps || 0,
            target_weight_kg: set.weight_kg || 0,
          }));

          const { error: setsError } = await supabase
            .from("routine_sets")
            .insert(setsPayload);
          if (setsError) throw setsError;
        }
      }
    }

    res
      .status(201)
      .send({ message: "Routine created successfully", routine_id: routineId });
  } catch (error) {
    console.error("Error creating routine:", error);
    res.status(500).send({ error: error.message || "Internal Server Error" });
  }
});

router.delete("/api/routines/:id", requireAuthentication, async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from("routines").delete().eq("id", id);

    if (error) throw error;
    res.status(200).send({ message: "Routine deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

export default router;
