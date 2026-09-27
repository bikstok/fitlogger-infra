<script>
  import { onMount } from "svelte";
  import { user } from "../../lib/stores/authStore.js";
  import { Link, navigate } from "svelte-routing";
  import toastr from "toastr";
  import { fetchGet, fetchDelete } from "../../util/fetchUtil.js";

  let routines = $state([]);
  let loading = $state(true);

  onMount(async () => {
    if (!$user) return;
    try {
      const result = await fetchGet(`/api/routines/${$user.id}`);
      if (!result.error) {
        routines = result.data;
      } else {
        toastr.error(result.error);
      }
    } catch (e) {
      toastr.error("Failed to load routines");
    } finally {
      loading = false;
    }
  });

  function startRoutine(routineId) {
    navigate(`/create-workout?routineId=${routineId}`);
  }

  async function deleteRoutine(id) {
    if (!confirm("Are you sure you want to delete this routine?")) return;

    try {
      const result = await fetchDelete(`/api/routines/${id}`);

      if (!result.error) {
        routines = routines.filter((r) => r.id !== id);
        toastr.success("Routine deleted");
      } else {
        toastr.error(result.error || "Failed to delete routine");
      }
    } catch (e) {
      toastr.error("Network error");
    }
  }
</script>

<div class="page">
  <div class="header">
    <h1>My Routines</h1>
    <Link to="/create-routine" class="btn-primary">Create New Routine</Link>
  </div>

  {#if loading}
    <p>Loading...</p>
  {:else if routines.length === 0}
    <p>No routines found. Create one to get started!</p>
  {:else}
    <div class="grid">
      {#each routines as routine}
        <div class="card">
          <div class="card-header">
            <h2>{routine.name}</h2>
            <button
              class="btn-delete"
              onclick={() => deleteRoutine(routine.id)}
              title="Delete Routine">&times;</button
            >
          </div>
          {#if routine.description}
            <p class="desc">{routine.description}</p>
          {/if}
          <div class="exercises-preview">
            {#each routine.routine_exercises as re}
              <span class="tag">{re.exercises.name}</span>
            {/each}
          </div>
          <button class="btn-start" onclick={() => startRoutine(routine.id)}
            >Start Workout</button
          >
        </div>
      {/each}
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
  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  .card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #eee;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  h2 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }
  .desc {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
  .exercises-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
  .tag {
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    color: #555;
  }
  .btn-primary {
    background: #4f46e5;
    color: white;
    padding: 0.6rem 1.2rem;
    border-radius: 6px;
    text-decoration: none;
    font-weight: 500;
  }
  .btn-start {
    width: 100%;
    background: #10b981;
    color: white;
    border: none;
    padding: 0.8rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 1rem;
  }
  .btn-start:hover {
    background: #059669;
  }
  .btn-delete {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #999;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  .btn-delete:hover {
    color: #ef4444;
  }
</style>
