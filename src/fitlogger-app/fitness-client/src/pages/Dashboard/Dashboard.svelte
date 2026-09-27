<script>
    import { onMount, tick } from 'svelte';
    import { user } from '../../lib/stores/authStore.js';
    import Chart from 'chart.js/auto';
    import toastr from 'toastr';
    import { fetchGet } from '../../util/fetchUtil.js';

    let barChartCanvas;
    let pieChartCanvas;
    let frequencyChartCanvas;
    let weekdayChartCanvas;
    let barChart;
    let pieChart;
    let frequencyChart;
    let weekdayChart;
    let loading = $state(true);
    let timeRange = $state("1m");
    let heatmapData = $state({});

    const rangeOptions = [
        { value: "1week", label: "1W" },
        { value: "1month", label: "1M" },
        { value: "3month", label: "3M" },
        { value: "6month", label: "6M" },
        { value: "1year", label: "1Y" }
    ];

    async function updateStats() {
        if (!$user) return;
        const [durationRes, muscleRes, freqRes, weekdayRes] = await Promise.all([
            fetchGet(`/api/stats/weekly-duration/${$user.id}?range=${timeRange}`),
            fetchGet(`/api/stats/muscle-distribution/${$user.id}?range=${timeRange}`),
            fetchGet(`/api/stats/workout-frequency/${$user.id}?range=${timeRange}`),
            fetchGet(`/api/stats/weekday-frequency/${$user.id}?range=${timeRange}`)
        ]);
        
        if (!durationRes.error && barChart) {
            barChart.data.labels = durationRes.data.map(stat => stat.label);
            barChart.data.datasets[0].data = durationRes.data.map(stat => stat.hours);
            barChart.update();
        }
        if (!muscleRes.error && pieChart) {
            pieChart.data.labels = muscleRes.data.labels;
            pieChart.data.datasets[0].data = muscleRes.data.values;
            pieChart.update();
        }
        if (!freqRes.error && frequencyChart) {
            frequencyChart.data.labels = freqRes.data.map(stat => stat.label);
            frequencyChart.data.datasets[0].data = freqRes.data.map(stat => stat.count);
            frequencyChart.update();
        }
        if (!weekdayRes.error && weekdayChart) {
            weekdayChart.data.datasets[0].data = weekdayRes.data.values;
            weekdayChart.update();
        }
    }

    onMount(async () => {
        if (!$user) return;

        try {
            const [durationRes, muscleRes, freqRes, heatmapRes, weekdayRes] = await Promise.all([
                fetchGet(`/api/stats/weekly-duration/${$user.id}?range=${timeRange}`),
                fetchGet(`/api/stats/muscle-distribution/${$user.id}?range=${timeRange}`),
                fetchGet(`/api/stats/workout-frequency/${$user.id}?range=${timeRange}`),
                fetchGet(`/api/stats/heatmap/${$user.id}`),
                fetchGet(`/api/stats/weekday-frequency/${$user.id}?range=${timeRange}`)
            ]);

            if (!durationRes.error && !muscleRes.error && !freqRes.error && !heatmapRes.error && !weekdayRes.error) {
                loading = false;
                heatmapData = heatmapRes.data;
                await tick();
                renderBarChart(durationRes.data);
                renderPieChart(muscleRes.data);
                renderFrequencyChart(freqRes.data);
                renderWeekdayChart(weekdayRes.data);
            } else {
                toastr.error("Failed to load stats");
                loading = false;
            }
        } catch (e) {
            console.error(e);
            toastr.error("Network error");
            loading = false;
        }
    });

    function renderBarChart(data) {
        if (!barChartCanvas) return;
        
        const ctx = barChartCanvas.getContext('2d');
        barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(stat => stat.label),
                datasets: [{
                    label: 'Hours Worked Out',
                    data: data.map(stat => stat.hours),
                    backgroundColor: '#4f46e5',
                    borderRadius: 4,
                    hoverBackgroundColor: '#4338ca'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Workout Duration'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours'
                        }
                    }
                }
            }
        });
    }

    function renderPieChart(data) {
        if (!pieChartCanvas) return;

        const ctx = pieChartCanvas.getContext('2d');
        pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
                        '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#14b8a6'
                    ],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Muscle Group Distribution'
                    }
                }
            }
        });
    }

    function renderFrequencyChart(data) {
        if (!frequencyChartCanvas) return;
        const ctx = frequencyChartCanvas.getContext('2d');
        frequencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(stat => stat.label),
                datasets: [{
                    label: 'Workouts',
                    data: data.map(stat => stat.count),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Workout Frequency' }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    function renderWeekdayChart(data) {
        if (!weekdayChartCanvas) return;
        const ctx = weekdayChartCanvas.getContext('2d');
        weekdayChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Workouts',
                    data: data.values,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Weekday Pattern' }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    function getCalendarData() {
        const today = new Date();
        const data = [];
        // Start from 52 weeks ago (approx 1 year)
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 365);
        
        // Align to previous Sunday for clean grid
        while(startDate.getDay() !== 0) {
            startDate.setDate(startDate.getDate() - 1);
        }

        const currentDate = new Date(startDate);
        while (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const count = heatmapData[dateStr] || 0;
            data.push({ dateStr, count });
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return data;
    }
</script>

<main>
	{#if $user === undefined}
		<p>Checking session…</p>
	{:else if $user === null}
		<h1>Not logged in</h1>
		<p>
			<a href="/login">Go to Login</a>
		</p>
	{:else}
	
	{/if}
</main>

<div class="page">
    <h1>Dashboard</h1>
    
    <div class="stats-container">
        {#if loading}
            <p>Loading statistics...</p>
        {:else}
            <div class="charts-grid">
                <div class="chart-wrapper">
                    <div class="chart-header">
                        <div class="range-controls">
                            {#each rangeOptions as option}
                                <button 
                                    class="range-btn" 
                                    class:active={timeRange === option.value}
                                    onclick={() => { timeRange = option.value; updateStats(); }}
                                >
                                    {option.label}
                                </button>
                            {/each}
                        </div>
                    </div>
                    <canvas bind:this={barChartCanvas}></canvas>
                </div>
                <div class="chart-wrapper">
                    <canvas bind:this={pieChartCanvas}></canvas>
                </div>
                <div class="chart-wrapper">
                    <canvas bind:this={frequencyChartCanvas}></canvas>
                </div>
                <div class="chart-wrapper">
                    <canvas bind:this={weekdayChartCanvas}></canvas>
                </div>
                <div class="chart-wrapper full-width">
                    <h3>Consistency (Last Year)</h3>
                    <div class="heatmap-container">
                        <div class="heatmap-grid">
                            {#each getCalendarData() as day}
                                <div class="day-cell level-{Math.min(day.count, 4)}" 
                                     title={`${day.dateStr}: ${day.count} workouts`}></div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .page { max-width: 1000px; margin: 0 auto; padding: 1rem; }
    .stats-container { background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    
    .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
    }
    .chart-wrapper { position: relative; height: 400px; width: 100%; display: flex; flex-direction: column; }
    .chart-wrapper.full-width { grid-column: 1 / -1; height: auto; }

    .chart-header {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 10px;
        z-index: 10;
    }

    .range-controls {
        display: flex;
        background: #f3f4f6;
        padding: 4px;
        border-radius: 8px;
        gap: 2px;
    }

    .range-btn {
        background: none;
        border: none;
        padding: 4px 12px;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.2s;
    }

    .range-btn:hover { color: #374151; }
    .range-btn.active { background: white; color: #4f46e5; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    
    /* Heatmap Styles */
    .heatmap-container { overflow-x: auto; padding-bottom: 10px; }
    .heatmap-grid {
        display: grid;
        grid-template-rows: repeat(7, 12px);
        grid-auto-flow: column;
        gap: 3px;
        width: max-content;
    }
    .day-cell { width: 12px; height: 12px; border-radius: 2px; background-color: #ebedf0; }
    .day-cell.level-1 { background-color: #9be9a8; }
    .day-cell.level-2 { background-color: #40c463; }
    .day-cell.level-3 { background-color: #30a14e; }
    .day-cell.level-4 { background-color: #216e39; }

    :global(body.dark-mode) .range-controls { background: #374151; }
    :global(body.dark-mode) .range-btn { color: #9ca3af; }
    :global(body.dark-mode) .range-btn.active { background: #4b5563; color: #fff; }
    
    :global(body.dark-mode) .day-cell { background-color: #2d333b; }
    :global(body.dark-mode) .day-cell.level-1 { background-color: #0e4429; }
    :global(body.dark-mode) .day-cell.level-2 { background-color: #006d32; }
    :global(body.dark-mode) .day-cell.level-3 { background-color: #26a641; }
    :global(body.dark-mode) .day-cell.level-4 { background-color: #39d353; }
</style>
