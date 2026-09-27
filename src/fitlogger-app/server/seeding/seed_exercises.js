import fs from "fs";
import fetch from "node-fetch"; // OR use axios if you prefer: import axios from 'axios';

// 1. Read the JSON file
const exercisesData = JSON.parse(fs.readFileSync("./exercises.json", "utf-8"));

// 2. Configuration - CHANGE THIS if your server is on a different port
const API_URL = "http://localhost:8080/api/exercises";

async function seedDatabase() {
  console.log(`Starting seed of ${exercisesData.length} exercises...`);

  let successCount = 0;
  let errorCount = 0;

  for (const exercise of exercisesData) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exercise),
      });

      if (response.ok) {
        // Optional: Print a dot for progress
        process.stdout.write(".");
        successCount++;
      } else {
        const errorData = await response.json();
        console.error(`\nFailed to add ${exercise.name}:`, errorData);
        errorCount++;
      }
    } catch (err) {
      console.error(
        `\nError connecting to API for ${exercise.name}:`,
        err.message
      );
      errorCount++;
    }
  }

  console.log(`\n\n--- Seed Complete ---`);
  console.log(`Successfully added: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
}

seedDatabase();
