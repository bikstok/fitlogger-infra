<script>
  import { user } from "../../lib/stores/authStore.js";
  import toastr from "toastr";
  import { Link } from "svelte-routing";
  import { fetchGet, fetchDelete } from "../../util/fetchUtil.js";
  let workouts = $state([]);
  let error = $state(null);
  let loading = $state(true);
  let selectedWorkout = $state(null);

  // Pagination state
  let offset = $state(0);
  let hasMore = $state(true);
  let isFetching = $state(false);

  async function fetchWorkouts() {
    if (!$user || isFetching || !hasMore) return;

    isFetching = true;
    try {
      const result = await fetchGet(
        `/api/workouts/${$user.id}?limit=10&offset=${offset}`
      );
      if (result.error) throw new Error(result.error);
      const newWorkouts = result.data;

      if (newWorkouts.length < 10) {
        hasMore = false;
      }

      workouts = [...workouts, ...newWorkouts];
      offset += 10;
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
      isFetching = false;
    }
  }

  $effect(() => {
    // Initial load
    if ($user && workouts.length === 0 && !isFetching) {
      fetchWorkouts();
    }
  });

  function handleScroll() {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 200
    ) {
      fetchWorkouts();
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function openWorkout(workout) {
    selectedWorkout = workout;
  }

  function closeWorkout() {
    selectedWorkout = null;
  }

  async function deleteWorkout(id) {
    try {
      const result = await fetchDelete(`/api/workouts/${id}`);
      if (result.error) throw new Error(result.error);

      workouts = workouts.filter((w) => w.id !== id);
      closeWorkout();
      toastr.success("Workout deleted successfully");
    } catch (error) {
      toastr.error(
        error.message || "An error occurred while deleting the workout."
      );
    }
  }
</script>

{#snippet exerciseList(exercises)}
  {#each exercises as item}
    <div class="exercise-item">
      <div class="exercise-info">
        {#if item.exercises.image_url}
          <video
            class="thumb"
            muted
            loop
            playsinline
            onmouseenter={(e) => e.target.play()}
            onmouseleave={(e) => e.target.pause()}
          >
            <source
              src={`/exercise_videos/${item.exercises.image_url}`}
              type="video/mp4"
            />
          </video>
        {/if}
        <h3>{item.exercises.name}</h3>
      </div>
      <div class="sets-container">
        {#each item.sets as set}
          <div class="set-badge">
            {set.weight_kg}kg x {set.reps}
          </div>
        {/each}
      </div>
    </div>
  {/each}
{/snippet}

<svelte:window onscroll={handleScroll} />

<div class="page">
  <div class="header">
    <h1>Past Workouts</h1>
  </div>

  {#if loading}
    <p class="loading">Loading workouts...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if workouts.length === 0}
    <p>No workouts recorded yet.</p>
  {:else}
    <div class="workouts-list">
      {#each workouts as workout (workout.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="workout-card" onclick={() => openWorkout(workout)}>
          <div class="workout-header">
            <div>
              <h2>{workout.title}</h2>
              <span class="date">{formatDate(workout.start_time)}</span>
            </div>
            <div class="workout-stats">
              <div class="stat">
                <span class="stat-label">Duration</span>
                <span class="stat-value">{workout.duration}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Volume</span>
                <span class="stat-value"
                  >{workout.total_volume.toLocaleString()} kg</span
                >
              </div>
            </div>
          </div>

          <div class="exercises-list">
            {@render exerciseList(workout.workout_exercises.slice(0, 3))}
          </div>

          {#if workout.workout_exercises.length > 3}
            <div class="see-more">
              See {workout.workout_exercises.length - 3} more exercises...
            </div>
          {/if}
        </div>
      {/each}
    </div>
    {#if isFetching}
      <p class="loading">Loading more...</p>
    {/if}
  {/if}

  {#if selectedWorkout}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={closeWorkout}>
      <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <button class="close-btn" onclick={closeWorkout}>&times;</button>
        <div class="modal-header">
          <h2>{selectedWorkout.title}</h2>
          <div class="modal-meta">
            <span>{formatDate(selectedWorkout.start_time)}</span>
            <span>•</span>
            <span>{selectedWorkout.duration}</span>
            <span>•</span>
            <span>{selectedWorkout.total_volume.toLocaleString()} kg</span>
          </div>
        </div>
        <div class="modal-body">
          {@render exerciseList(selectedWorkout.workout_exercises)}
          <div class="modal-actions">
            <button
              class="delete-btn"
              onclick={() => deleteWorkout(selectedWorkout.id)}
            >
              Delete Workout
            </button>
          </div>
        </div>
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

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 1rem;
  }

  :global(.log-btn) {
    background-color: #4f46e5;
    color: white;
    padding: 0.6rem 1.2rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
  }

  :global(.log-btn.secondary) {
    background-color: #eef2ff;
    color: #4f46e5;
  }

  .loading,
  .error {
    text-align: center;
    color: #666;
  }
  .error {
    color: red;
  }

  .workout-card {
    background: white;
    border: 1px solid #eee;
    border-radius: 8px;
    margin-bottom: 2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .workout-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  .workout-header {
    background: #f9f9f9;
    padding: 1rem;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .workout-header h2 {
    margin: 0;
    font-size: 1.25rem;
    color: #333;
  }
  .date {
    color: #666;
    font-size: 0.9rem;
  }

  .workout-stats {
    display: flex;
    gap: 1rem;
    text-align: right;
  }

  .stat {
    display: flex;
    flex-direction: column;
  }
  .stat-label {
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
  }
  .stat-value {
    font-weight: 600;
    color: #4f46e5;
    font-size: 0.95rem;
  }

  .exercise-item {
    padding: 1rem;
    border-bottom: 1px solid #f0f0f0;
  }
  .exercise-item:last-child {
    border-bottom: none;
  }

  .exercise-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  .exercise-info h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #333;
  }

  .thumb {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    object-fit: cover;
    background: #eee;
  }

  .sets-container {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-left: 3.5rem;
  }
  .set-badge {
    background: #eef2ff;
    color: #4f46e5;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .see-more {
    padding: 0.8rem;
    text-align: center;
    background: #fcfcfc;
    color: #666;
    font-size: 0.9rem;
    font-weight: 500;
    border-top: 1px solid #eee;
  }

  /* Modal Styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #666;
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #eee;
  }
  .modal-header h2 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }
  .modal-meta {
    color: #666;
    font-size: 0.9rem;
    display: flex;
    gap: 0.5rem;
  }
  .modal-body {
    padding: 0;
  }

  .modal-actions {
    padding: 1rem;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid #eee;
  }

  .delete-btn {
    background-color: #fee2e2;
    color: #dc2626;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .delete-btn:hover {
    background-color: #fecaca;
  }
</style>
