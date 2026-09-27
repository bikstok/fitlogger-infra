import supabase from "./supabaseUtil.js";
import csv from "csv-parser";
import { Readable } from "stream";

function parseHevyDate(dateString) {
  if (!dateString) return null;
  const monthMap = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
  try {
    const cleanedString = dateString.replace(/,/g, ''); 
    const dateParts = cleanedString.split(' ');
    if (dateParts.length < 4) return null;
    const day = dateParts[0].padStart(2, '0');
    const month = monthMap[dateParts[1]];
    const year = dateParts[2];
    const time = dateParts[3];
    if (!month) return null;
    return `${year}-${month}-${day} ${time}:00`;
  } catch (error) { return null; }
}

export async function importWorkoutsFromCsv(userId, fileBuffer) {
  // 1. Build Dynamic Exercise Map (Name -> ID) from DB
  const { data: exercises, error: fetchExercisesError } = await supabase
    .from("exercises")
    .select("id, name");
  
  if (fetchExercisesError) throw fetchExercisesError;
  
  const exerciseMap = {};
  exercises.forEach(exercise => {
      exerciseMap[exercise.name] = exercise.id;
  });

  // 2. Parse CSV
  const workoutsMap = new Map();
  const stream = Readable.from(fileBuffer.toString());

  await new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on('data', (row) => {
        const rawStart = row.start_time;
        if (!rawStart) return;
        const formattedStart = parseHevyDate(rawStart);
        const formattedEnd = parseHevyDate(row.end_time);
        if (!formattedStart) return;

        if (!workoutsMap.has(formattedStart)) {
          workoutsMap.set(formattedStart, {
            user_id: userId,
            title: row.title,
            start_time: formattedStart,
            end_time: formattedEnd,
            description: row.description || "",
            exercisesMap: new Map()
          });
        }

        const workout = workoutsMap.get(formattedStart);
        const exerciseName = row.exercise_title;
        const exerciseId = exerciseMap[exerciseName];

        if (!exerciseId) return; // Skip unknown exercises

        if (!workout.exercisesMap.has(exerciseId)) {
          workout.exercisesMap.set(exerciseId, {
            exercise_id: exerciseId,
            notes: row.exercise_notes || "",
            sets: []
          });
        }

        const exercise = workout.exercisesMap.get(exerciseId);
        const cleanFloat = (val) => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            return parseFloat(String(val).replace(',', '.')) || 0;
        };

        exercise.sets.push({
          set_index: parseInt(row.set_index) || 0,
          set_type: row.set_type || 'normal',
          weight_kg: cleanFloat(row.weight_kg),
          reps: cleanFloat(row.reps)
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // 3. Insert Data
  const workoutsPayload = Array.from(workoutsMap.values()).map(workout => ({
      ...workout,
      exercises: Array.from(workout.exercisesMap.values())
  }));

  let successCount = 0;

  for (const workoutPayload of workoutsPayload) {
      const { data: createdWorkout, error: workoutInsertError } = await supabase
          .from("workouts")
          .insert([{ user_id: userId, title: workoutPayload.title, start_time: workoutPayload.start_time, end_time: workoutPayload.end_time, description: workoutPayload.description }])
          .select().single();
      
      if (workoutInsertError) continue;

      for (const exercisePayload of workoutPayload.exercises) {
          const { data: createdWorkoutExercise, error: exerciseInsertError } = await supabase.from("workout_exercises").insert([{ workout_id: createdWorkout.id, exercise_id: exercisePayload.exercise_id, notes: exercisePayload.notes }]).select().single();
          if (exerciseInsertError) continue;
          const setsPayload = exercisePayload.sets.map((set, index) => ({ workout_exercise_id: createdWorkoutExercise.id, set_index: index, set_type: set.set_type, weight_kg: set.weight_kg, reps: set.reps }));
          await supabase.from("sets").insert(setsPayload);
      }
      successCount++;
  }

  return successCount;
}
