<script>
  import { Router, Route } from "svelte-routing";
  import { onMount } from "svelte";
  import { user, loadSession } from "./lib/stores/authStore.js";
  import { theme } from "./lib/stores/themeStore.js";
  import Register from "./pages/Register/Register.svelte";
  import Login from "./pages/Login/Login.svelte";
  import Dashboard from "./pages/Dashboard/Dashboard.svelte";
  import Exercises from "./pages/Exercises/Exercises.svelte";
  import Workouts from "./pages/Workouts/Workouts.svelte";
  import CreateRoutine from "./pages/CreateRoutine/CreateRoutine.svelte";
  import CreateWorkout from "./pages/CreateWorkout/CreateWorkout.svelte";
  import MyRoutines from "./pages/MyRoutines/MyRoutines.svelte";
  import Profile from "./pages/Profile/Profile.svelte";
  import PrivateRoute from "./lib/PrivateRoute.svelte";
  import Header from "./lib/components/Header.svelte";
  import toastr from "toastr";
  import io from "socket.io-client";

  let activeUsers = $state(0);

  const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:8080";

  onMount(() => {
    loadSession();
    theme.init();

    const socket = io(BASE_URL, {
      withCredentials: true,
    });

    socket.on("user_count", (count) => {
      activeUsers = count;
    });

    socket.on("workout_created", (data) => {
      if ($user?.id === data.user_id) return;
      toastr.info(`${data.username} just finished a workout: ${data.title}`);
    });

    return () => {
      socket.disconnect();
    };
  });
</script>

<Router>
  <Header {activeUsers} />

  <main>
    <PrivateRoute path="/dashboard" exact>
      <Dashboard />
    </PrivateRoute>
    <PrivateRoute path="/exercises">
      <Exercises />
    </PrivateRoute>
    <PrivateRoute path="/workouts">
      <Workouts />
    </PrivateRoute>
    <PrivateRoute path="/create-routine">
      <CreateRoutine />
    </PrivateRoute>
    <PrivateRoute path="/create-workout">
      <CreateWorkout />
    </PrivateRoute>
    <PrivateRoute path="/my-routines">
      <MyRoutines />
    </PrivateRoute>
    <PrivateRoute path="/profile">
      <Profile />
    </PrivateRoute>
    <Route path="/login"><Login /></Route>
    <Route path="/register"><Register /></Route>
    <Route path="/" exact>
      <h1>Welcome to the FitLogger</h1>
      <p>Track your fitness activities with ease!</p>
    </Route>
  </main>
</Router>

<style>
  main {
    margin-top: 4.5em; /* leave less space for thinner header */
    max-width: 900px;
    margin-left: auto;
    margin-right: auto;
    padding: 2em;
  }

  /* Global Light Mode Styles (Default) */
  :global(body) {
    background-color: #f3f4f6;
    color: #1f2937;
    margin: 0;
  }

  /* Global Dark Mode Styles */
  :global(body.dark-mode) {
    background-color: #121212;
    color: #e0e0e0;
  }
  :global(body.dark-mode) .card,
  :global(body.dark-mode) .workout-card,
  :global(body.dark-mode) .exercise-card,
  :global(body.dark-mode) .modal-content,
  :global(body.dark-mode) .stats-container {
    background-color: #1f2937;
    border-color: #374151;
    color: #e0e0e0;
  }
  :global(body.dark-mode) h1,
  :global(body.dark-mode) h2,
  :global(body.dark-mode) h3 {
    color: #f3f4f6;
  }
  :global(body.dark-mode) input,
  :global(body.dark-mode) select {
    background-color: #374151;
    border-color: #4b5563;
    color: white;
  }
</style>
