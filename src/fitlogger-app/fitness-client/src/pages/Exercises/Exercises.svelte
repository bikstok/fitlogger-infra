<script>
  import { tick } from "svelte";
  import { fetchGet } from "../../util/fetchUtil.js";
  import { user } from "../../lib/stores/authStore.js";
  import Chart from "chart.js/auto";
  import toastr from "toastr";

  let exercises = $state([]);
  let error = $state(null);
  let loading = $state(true);
  let searchQuery = $state("");
  let selectedMuscleGroup = $state("");
  let selectedEquipment = $state("");

  let selectedExercise = $state(null);
  let chartCanvas;
  let chartInstance;
  let timeRange = $state("3m");

  const rangeOptions = [
    { value: "1w", label: "1W" },
    { value: "1m", label: "1M" },
    { value: "3m", label: "3M" },
    { value: "6m", label: "6M" },
    { value: "1y", label: "1Y" },
  ];

  $effect(() => {
    async function fetchExercises() {
      try {
        // Fetching from the backend API
        const result = await fetchGet("/api/exercises");

        if (result.error) {
          throw new Error(result.error || "Failed to fetch exercises");
        }

        exercises = result.data;
      } catch (err) {
        error = err.message;
      } finally {
        loading = false;
      }
    }

    fetchExercises();
  });

  let muscleGroups = $derived(
    [...new Set(exercises.map((e) => e.primary_muscle_group))].sort()
  );

  let equipmentList = $derived(
    [...new Set(exercises.map((e) => e.equipment))].sort()
  );

  let filteredExercises = $derived(
    exercises.filter((exercise) => {
      const matchesSearch = exercise.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesGroup =
        selectedMuscleGroup === "" ||
        exercise.primary_muscle_group === selectedMuscleGroup;
      const matchesEquipment =
        selectedEquipment === "" || exercise.equipment === selectedEquipment;
      return matchesSearch && matchesGroup && matchesEquipment;
    })
  );

  async function openExerciseStats(exercise) {
    if (!$user) {
      toastr.info("Please login to view your progress");
      return;
    }
    selectedExercise = exercise;
    timeRange = "3m";
    await tick();
    loadChartData(exercise.id);
  }

  function closeStats() {
    selectedExercise = null;
    if (chartInstance) chartInstance.destroy();
  }

  async function loadChartData(exerciseId) {
    try {
      const res = await fetchGet(
        `/api/stats/exercise-progression/${$user.id}/${exerciseId}?range=${timeRange}`
      );
      if (res.error) throw new Error(res.error);
      renderChart(res.data);
    } catch (e) {
      toastr.error("Failed to load progression data");
    }
  }

  function renderChart(data) {
    if (!chartCanvas) return;
    if (chartInstance) chartInstance.destroy();

    const rangeLabel =
      rangeOptions.find((r) => r.value === timeRange)?.label || "3M";

    const ctx = chartCanvas.getContext("2d");
    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Max Weight (kg)",
            data: data.values,
            borderColor: "#4f46e5",
            backgroundColor: "rgba(79, 70, 229, 0.1)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Max Weight Progression (${rangeLabel})`,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Weight (kg)" },
          },
        },
      },
    });
  }
</script>

<div class="page">
  <h1>Exercises</h1>

  <div class="search-container">
    <input
      type="text"
      placeholder="Search exercises..."
      bind:value={searchQuery}
    />
    <select bind:value={selectedMuscleGroup}>
      <option value="">All Muscle Groups</option>
      {#each muscleGroups as group}
        <option value={group}>{group}</option>
      {/each}
    </select>
    <select bind:value={selectedEquipment}>
      <option value="">All Equipment</option>
      {#each equipmentList as item}
        <option value={item}>{item}</option>
      {/each}
    </select>
  </div>

  {#if loading}
    <p class="loading">Loading exercises...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if filteredExercises.length === 0}
    <p>No exercises found.</p>
  {:else}
    <div class="grid">
      {#each filteredExercises as exercise (exercise.id)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="card" onclick={() => openExerciseStats(exercise)}>
          {#if exercise.image_url}
            <video controls muted loop autoplay playsinline>
              <source
                src={`/exercise_videos/${exercise.image_url}`}
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          {:else}
            <div class="placeholder">No Video</div>
          {/if}
          <div class="details">
            <h2>{exercise.name}</h2>
            <p><strong>Equipment:</strong> {exercise.equipment}</p>
            <p><strong>Primary:</strong> {exercise.primary_muscle_group}</p>
            {#if exercise.secondary_muscle_group}
              <p>
                <strong>Secondary:</strong>
                {exercise.secondary_muscle_group}
              </p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if selectedExercise}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-backdrop" onclick={closeStats}>
      <div class="modal-content" onclick={(e) => e.stopPropagation()}>
        <button class="close-btn" onclick={closeStats}>&times;</button>
        <h2>{selectedExercise.name} Progress</h2>
        <div class="range-controls">
          {#each rangeOptions as option}
            <button
              class="range-btn"
              class:active={timeRange === option.value}
              onclick={() => {
                timeRange = option.value;
                loadChartData(selectedExercise.id);
              }}
            >
              {option.label}
            </button>
          {/each}
        </div>
        <div class="chart-container">
          <canvas bind:this={chartCanvas}></canvas>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    text-align: center;
    margin-bottom: 2rem;
  }

  .search-container {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  input,
  select {
    padding: 0.8rem;
    width: 100%;
    max-width: 400px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .card {
    border: 1px solid #eee;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s;
    background: white;
    cursor: pointer;
  }

  .card:hover {
    transform: translateY(-2px);
  }

  video,
  .placeholder {
    width: 100%;
    height: 200px;
    object-fit: cover;
  }

  .placeholder {
    background-color: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
  }

  .details {
    padding: 1rem;
  }

  h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.2rem;
    color: #666;
  }

  p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
    color: #555;
  }

  .error {
    color: red;
    text-align: center;
  }

  .loading {
    text-align: center;
    color: #666;
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
    max-width: 700px;
    padding: 1.5rem;
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

  .chart-container {
    position: relative;
    height: 350px;
    width: 100%;
    margin-top: 1rem;
  }

  :global(body.dark-mode) .modal-content {
    background-color: #1f2937;
    color: white;
  }

  .range-controls {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .range-btn {
    background: #f3f4f6;
    border: none;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    color: #666;
    transition: all 0.2s;
  }
  .range-btn:hover {
    background: #e5e7eb;
  }
  .range-btn.active {
    background: #4f46e5;
    color: white;
  }
  :global(body.dark-mode) .range-btn {
    background: #374151;
    color: #9ca3af;
  }
  :global(body.dark-mode) .range-btn.active {
    background: #6366f1;
    color: white;
  }
</style>
