<script>
  import { onMount } from "svelte";
  import { user } from "../../lib/stores/authStore.js";
  import { navigate } from "svelte-routing";
  import toastr from "toastr";
  import { fetchGet, fetchPost } from "../../util/fetchUtil.js";

  let name = $state("New Routine");
  let description = $state("");

  let availableExercises = $state([]);
  let selectedExercises = $state([]);
  let selectedExerciseId = $state("");

  onMount(async () => {
    try {
      const result = await fetchGet("/api/exercises");
      availableExercises = result.data || [];
    } catch (e) {
      console.error(e);
      toastr.error("Failed to load exercises");
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
          sets: [{ weight_kg: 0, reps: 0 }],
        },
      ];
      selectedExerciseId = "";
    }
  }

  function addSet(exerciseIndex) {
    const exercises = [...selectedExercises];
    const targetExercise = exercises[exerciseIndex];
    const lastSet = targetExercise.sets[targetExercise.sets.length - 1];
    const newSet = lastSet ? { ...lastSet } : { weight_kg: 0, reps: 0 };

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

  async function saveRoutine() {
    if (!$user) {
      toastr.error("You must be logged in");
      return;
    }
    if (!name) {
      toastr.warning("Please enter a routine name");
      return;
    }

    const payload = {
      user_id: $user.id,
      name,
      description,
      exercises: selectedExercises,
    };

    try {
      const result = await fetchPost("/api/routines", payload);

      if (!result.error) {
        toastr.success("Routine created successfully!");
        navigate("/my-routines");
      } else {
        toastr.error(result.error || "Failed to save routine");
      }
    } catch (e) {
      toastr.error("Network error");
    }
  }
</script>

<div class="page">
  <h1>Create Routine</h1>

  <div class="form-section">
    <div class="form-group">
      <label for="name">Routine Name</label>
      <input
        id="name"
        type="text"
        bind:value={name}
        placeholder="e.g. Upper Body A"
      />
    </div>
    <div class="form-group">
      <label for="description">Description (Optional)</label>
      <input
        id="description"
        type="text"
        bind:value={description}
        placeholder="Focus on chest and back..."
      />
    </div>
  </div>

  <hr />

  <div class="add-exercise-bar">
    <select bind:value={selectedExerciseId}>
      <option value="">Select Exercise...</option>
      {#each availableExercises as ex}
        <option value={ex.id}>{ex.name}</option>
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
          <span>Set</span>
          <span>Target kg</span>
          <span>Target Reps</span>
          <span></span>
        </div>

        {#each exercise.sets as set, setIndex}
          <div class="set-row">
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
    <button class="btn-save" onclick={saveRoutine}>Save Routine</button>
  </div>
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
    grid-template-columns: 40px 1fr 1fr 40px;
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
</style>
