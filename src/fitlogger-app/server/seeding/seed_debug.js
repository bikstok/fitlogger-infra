import fs from "fs";
import csv from "csv-parser";
import fetch from "node-fetch";

const FILE_PATH = "./hevy_workouts.csv";
const API_URL = "http://localhost:8080/api/workouts";
const USER_ID = 8;

// Full Exercise Map
const exerciseMap = {
  "Shoulder Press (Dumbbell)": 1,
  "Lat Pulldown (Cable)": 2,
  "Bench Press (Smith Machine)": 3,
  "Bench Press (Barbell)": 4,
  "Bench Press (Dumbbell)": 5,
  "Seated Cable Row - V Grip (Cable)": 6,
  "Rear Delt Reverse Fly (Machine)": 7,
  "Lateral Raise (Cable)": 8,
  "Skullcrusher (Barbell)": 9,
  "EZ Bar Biceps Curl": 10,
  "Seated Incline Curl (Dumbbell)": 11,
  "Lying Leg Curl (Machine)": 12,
  "Leg Press Horizontal (Machine)": 13,
  "Leg Extension (Machine)": 14,
  "Back Extension (Machine)": 15,
  "Crunch (Machine)": 16,
  "Calf Press (Machine)": 17,
  "Incline Bench Press (Smith Machine)": 18,
  "Chest Fly (Machine)": 19,
  "Lat Pulldown - Close Grip (Cable)": 20,
  "Hip Abduction (Machine)": 21,
  "Hip Adduction (Machine)": 22,
  "Iso-Lateral High Row (Machine)": 23,
  "Iso-Lateral Chest Press (Machine)": 24,
  "Single Arm Triceps Pushdown (Cable)": 25,
  "Iso-Lateral Low Row": 26,
  "Behind the Back Curl (Cable)": 27,
  "Hip Thrust (Barbell)": 28,
  "Hack Squat (Machine)": 29,
  "Cable Crunch": 30,
  "Pull Up (Assisted)": 31,
  "Bulgarian Split Squat": 32,
  "Seated Leg Curl (Machine)": 33,
  "Back Extension (Weighted Hyperextension)": 34,
  "Seated Shoulder Press (Machine)": 35,
  "Bicep Curl (Machine)": 36,
  "Single Arm Lateral Raise (Cable)": 37,
  "Leg Press (Machine)": 38,
  "Chest Press (Machine)": 39,
  "Back Extension Plank": 40,
  "Single Arm Curl (Cable)": 42,
  "Skullcrusher (Dumbbell)": 43,
  "Cable Fly Crossovers": 44,
  "Bent Over Row (Barbell)": 45,
  "Seated Row (Machine)": 46,
  "Triceps Extension (Cable)": 47,
  "Face Pull": 48,
  "Single Leg Standing Calf Raise (Dumbbell)": 49,
  "Lat Pulldown (Machine)": 50,
  "Incline Bench Press (Dumbbell)": 51,
  "Seated Cable Row - Bar Wide Grip": 52,
  "Standing Calf Raise (Machine)": 53,
  "Iso-Lateral Row (Machine)": 54,
  "Preacher Curl (Barbell)": 55,
  "Lateral Raise (Dumbbell)": 56,
  "Bicep Curl (Cable)": 57,
  "Standing Calf Raise (Smith)": 58,
};

async function processAndSeed() {
  const workoutsMap = new Map();

  // Auto-detect Delimiter
  let fileContent = fs.readFileSync(FILE_PATH, {
    encoding: "utf-8",
    start: 0,
    end: 500,
  });
  const separator = fileContent.includes(";") ? ";" : ",";
  console.log(`Detected separator: "${separator}"`);

  fs.createReadStream(FILE_PATH)
    .pipe(
      csv({
        separator: separator,
        mapHeaders: ({ header }) => header.trim(),
      })
    )
    .on("data", (row) => {
      const startTime = row.start_time;
      if (!startTime) return;

      if (!workoutsMap.has(startTime)) {
        workoutsMap.set(startTime, {
          user_id: USER_ID,
          title: row.title,
          start_time: row.start_time,
          end_time: row.end_time,
          description:
            row.description && row.description !== "nan" ? row.description : "",
          exercisesMap: new Map(),
        });
      }

      const workout = workoutsMap.get(startTime);
      const exerciseName = row.exercise_title;
      const exerciseId = exerciseMap[exerciseName];

      if (!exerciseId) return;

      if (!workout.exercisesMap.has(exerciseId)) {
        workout.exercisesMap.set(exerciseId, {
          exercise_id: exerciseId,
          notes:
            row.exercise_notes && row.exercise_notes !== "nan"
              ? row.exercise_notes
              : "",
          sets: [],
        });
      }

      const exercise = workout.exercisesMap.get(exerciseId);

      const cleanFloat = (val) => {
        if (!val) return 0;
        if (typeof val === "number") return val;
        return parseFloat(val.replace(",", ".")) || 0;
      };

      exercise.sets.push({
        set_index: parseInt(row.set_index) || 0,
        set_type: row.set_type || "normal",
        weight_kg: cleanFloat(row.weight_kg),
        reps: cleanFloat(row.reps),
      });
    })
    .on("end", async () => {
      const workoutsPayload = Array.from(workoutsMap.values()).map((w) => ({
        ...w,
        exercises: Array.from(w.exercisesMap.values()),
      }));

      console.log(
        `Found ${workoutsPayload.length} workouts. Attempting upload...`
      );

      let success = 0;
      let fail = 0;

      for (const workout of workoutsPayload) {
        delete workout.exercisesMap;
        try {
          const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(workout),
          });
          if (res.ok) {
            process.stdout.write(".");
            success++;
          } else {
            // --- DEBUG SECTION ---
            const errorText = await res.text();
            console.error(
              `\n\n[CRITICAL ERROR] Failed to upload workout "${workout.title}"`
            );
            console.error(`Status Code: ${res.status}`);
            console.error(`Server Response: ${errorText}`); // Prints the exact error from server
            console.error(`Payload Sent: ${JSON.stringify(workout, null, 2)}`); // Prints what we tried to send
            fail++;

            // STOP after 1 failure so you can read the error
            process.exit(1);
          }
        } catch (e) {
          console.error(`\n[NETWORK ERROR]: ${e.message}`);
          fail++;
          process.exit(1);
        }
      }
      console.log(`\n\nDone! Success: ${success}, Failed: ${fail}`);
    });
}

processAndSeed();
