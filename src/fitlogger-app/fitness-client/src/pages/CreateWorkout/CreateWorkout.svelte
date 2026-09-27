<script>
  import { onMount, onDestroy } from "svelte";
  import { user } from "../../lib/stores/authStore.js";
  import { navigate } from "svelte-routing";
  import toastr from "toastr";
  import { fetchGet, fetchPost } from "../../util/fetchUtil.js";
  import { timer, formatTime } from "../../lib/stores/timerStore.js";

  let title = $state("New Workout");
  let startTime = $state("");
  let endTime = $state("");
  let description = $state("");

  let availableExercises = $state([]);
  let selectedExercises = $state([]);
  let selectedExerciseId = $state("");

  onDestroy(() => {
    timer.stop();
  });

  onMount(async () => {
    const now = new Date();
    // Adjust for timezone to show correct local time in datetime-local input
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    startTime = localIso;

    try {
      const result = await fetchGet("/api/exercises");
      availableExercises = result.data || [];
    } catch (e) {
      console.error(e);
      toastr.error("Failed to load exercises");
    }

    // Check if we are starting a routine
    const urlParams = new URLSearchParams(window.location.search);
    const routineId = urlParams.get("routineId");

    if (routineId) {
      try {
        const result = await fetchGet(`/api/routines/detail/${routineId}`);

        if (!result.error && result.data) {
          const routineData = result.data;
          title = routineData.name; // Pre-fill title with routine name

          // Map routine exercises to workout exercises format
          selectedExercises = routineData.routine_exercises.map(
            (routineExercise) => ({
              exercise_id: routineExercise.exercise_id,
              name: routineExercise.exercises.name,
              sets: routineExercise.routine_sets.map((routineSet) => ({
                weight_kg: routineSet.target_weight_kg,
                reps: routineSet.target_reps,
                completed: false,
              })),
            })
          );
        }
      } catch (e) {
        toastr.error("Failed to load routine template");
      }
    }
  });

  function addExercise() {
    if (!selectedExerciseId) return;
    const exercise = availableExercises.find(
      (ex) => ex.id == selectedExerciseId
    );
    if (exercise) {
      selectedExercises = [
        ...selectedExercises,
        {
          exercise_id: exercise.id,
          name: exercise.name,
          sets: [{ weight_kg: 0, reps: 0, completed: false }],
        },
      ];
      selectedExerciseId = "";
    }
  }

  function addSet(exerciseIndex) {
    const exercises = [...selectedExercises];
    const targetExercise = exercises[exerciseIndex];
    // Copy previous set values for convenience
    const lastSet = targetExercise.sets[targetExercise.sets.length - 1];
    const newSet = lastSet
      ? { ...lastSet, completed: false }
      : { weight_kg: 0, reps: 0, completed: false };

    targetExercise.sets.push(newSet);
    selectedExercises = exercises;
  }

  function removeSet(exerciseIndex, setIndex) {
    const exercises = [...selectedExercises];
    exercises[exerciseIndex].sets = exercises[exerciseIndex].sets.filter(
      (_, index) => index !== setIndex
    );
    selectedExercises = exercises;
  }

  function removeExercise(index) {
    selectedExercises = selectedExercises.filter(
      (_, currentIndex) => currentIndex !== index
    );
  }

  function updateSet(exerciseIndex, setIndex, field, value) {
    const exercises = [...selectedExercises];
    exercises[exerciseIndex].sets[setIndex][field] = Number(value);
    selectedExercises = exercises;
  }

  function toggleSetTimer(exerciseIndex, setIndex, checked) {
    const exercises = [...selectedExercises];
    exercises[exerciseIndex].sets[setIndex].completed = checked;
    selectedExercises = exercises;

    if (checked) timer.start();
  }

  async function saveWorkout() {
    if (!$user) {
      toastr.error("You must be logged in");
      return;
    }
    if (!title) {
      toastr.warning("Please enter a title");
      return;
    }

    const payload = {
      user_id: $user.id,
      title,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime
        ? new Date(endTime).toISOString()
        : new Date().toISOString(),
      description,
      exercises: selectedExercises,
    };

    try {
      const result = await fetchPost("/api/workouts", payload);

      if (!result.error) {
        toastr.success("Workout saved!");
        navigate("/workouts");
      } else {
        toastr.error(result.error || "Failed to save");
      }
    } catch (e) {
      toastr.error("Network error");
    }
  }
</script>

<div class="page">
  <h1>Log Workout</h1>

  <div class="form-section">
    <div class="form-group">
      <label for="title">Title</label>
      <input
        id="title"
        type="text"
        bind:value={title}
        placeholder="e.g. Push Day"
      />
    </div>

    <div class="row">
      <div class="form-group">
        <label for="start">Start Time</label>
        <input id="start" type="datetime-local" bind:value={startTime} />
      </div>
      <div class="form-group">
        <label for="end">End Time</label>
        <input id="end" type="datetime-local" bind:value={endTime} />
      </div>
    </div>
  </div>

  <hr />

  <div class="add-exercise-bar">
    <select bind:value={selectedExerciseId}>
      <option value="">Select Exercise...</option>
      {#each availableExercises as exercise}
        <option value={exercise.id}>{exercise.name}</option>
      {/each}
    </select>
    <button
      class="btn-primary"
      onclick={addExercise}
      disabled={!selectedExerciseId}>Add Exercise</button
    >
  </div>

  <div class="exercises-list">
    {#each selectedExercises as exercise, exerciseIndex}
      <div class="exercise-card">
        <div class="card-header">
          <h3>{exercise.name}</h3>
          <button class="btn-icon" onclick={() => removeExercise(exerciseIndex)}
            >&times;</button
          >
        </div>

        <div class="sets-header">
          <span></span>
          <span>Set</span>
          <span>kg</span>
          <span>Reps</span>
          <span></span>
        </div>

        {#each exercise.sets as set, setIndex}
          <div class="set-row">
            <input
              type="checkbox"
              checked={set.completed}
              onchange={(e) =>
                toggleSetTimer(exerciseIndex, setIndex, e.target.checked)}
            />
            <span class="set-num">{setIndex + 1}</span>
            <input
              type="number"
              value={set.weight_kg}
              oninput={(e) =>
                updateSet(exerciseIndex, setIndex, "weight_kg", e.target.value)}
            />
            <input
              type="number"
              value={set.reps}
              oninput={(e) =>
                updateSet(exerciseIndex, setIndex, "reps", e.target.value)}
            />
            <button
              class="btn-icon remove-set"
              onclick={() => removeSet(exerciseIndex, setIndex)}>&times;</button
            >
          </div>
        {/each}

        <button class="btn-secondary" onclick={() => addSet(exerciseIndex)}
          >+ Add Set</button
        >
      </div>
    {/each}
  </div>

  <div class="actions">
    <button class="btn-save" onclick={saveWorkout}>Save Workout</button>
  </div>

  {#if $timer.active}
    <div class="timer-bar">
      <div class="timer-display">
        <span class="time">{formatTime($timer.seconds)}</span>
        <span class="label">Rest Timer</span>
      </div>
      <div class="timer-controls">
        <button class="btn-timer" onclick={() => timer.adjust(-15)}>-15s</button
        >
        <button class="btn-timer" onclick={() => timer.adjust(15)}>+15s</button>
        <button class="btn-timer stop" onclick={timer.stop}>Stop</button>
      </div>
      <div class="timer-settings">
        <label
          >Default (s): <input
            type="number"
            value={$timer.defaultSeconds}
            oninput={(e) => timer.setDefault(Number(e.target.value))}
            class="default-input"
          /></label
        >
      </div>
    </div>
  {/if}
</div>

<style>
  .page {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }
  .form-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .row {
    display: flex;
    gap: 1rem;
  }
  .form-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  input,
  select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
  hr {
    border: 0;
    border-top: 1px solid #eee;
    margin: 1.5rem 0;
  }

  .add-exercise-bar {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .add-exercise-bar select {
    flex: 1;
  }

  .exercise-card {
    background: #fff;
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  .card-header h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #333;
  }

  .sets-header,
  .set-row {
    display: grid;
    grid-template-columns: 30px 40px 1fr 1fr 40px;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .sets-header {
    font-size: 0.85rem;
    color: #666;
    font-weight: 600;
    text-align: center;
  }
  .set-num {
    text-align: center;
    color: #888;
  }

  .btn-primary {
    background: #4f46e5;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  .btn-primary:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  .btn-secondary {
    background: #eef2ff;
    color: #4f46e5;
    border: none;
    padding: 0.4rem 0.8rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }
  .btn-save {
    background: #10b981;
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 6px;
    font-size: 1.1rem;
    cursor: pointer;
    width: 100%;
  }
  .btn-icon {
    background: none;
    border: none;
    font-size: 1.2rem;
    color: #999;
    cursor: pointer;
  }
  .btn-icon:hover {
    color: #ef4444;
  }

  .actions {
    margin-top: 2rem;
  }

  .timer-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #1f2937;
    color: white;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
    z-index: 100;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .timer-display {
    display: flex;
    flex-direction: column;
  }
  .timer-display .time {
    font-size: 1.5rem;
    font-weight: bold;
    font-family: monospace;
  }
  .timer-display .label {
    font-size: 0.8rem;
    color: #9ca3af;
  }
  .timer-controls {
    display: flex;
    gap: 0.5rem;
  }
  .btn-timer {
    background: #374151;
    color: white;
    border: 1px solid #4b5563;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  .btn-timer:hover {
    background: #4b5563;
  }
  .btn-timer.stop {
    background: #ef4444;
    border-color: #dc2626;
  }
  .default-input {
    width: 60px;
    padding: 0.25rem;
    background: #374151;
    border: 1px solid #4b5563;
    color: white;
    border-radius: 4px;
    text-align: center;
  }
</style>
