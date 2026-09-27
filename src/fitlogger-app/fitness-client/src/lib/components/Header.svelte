<script>
  import { Link, navigate } from "svelte-routing";
  import { user, clearUser } from "../stores/authStore.js";
  import { theme } from "../stores/themeStore.js";
  import { fetchPost } from "../../util/fetchUtil.js";
  import toastr from "toastr";
  import fitnessLogo from "/fitness_favicon.png";
  import darkModeIcon from "../../assets/dark_mode.png";
  import lightModeIcon from "../../assets/light_mode.png";

  export let activeUsers = 0;

  async function handleLogout() {
    try {
      const result = await fetchPost("/api/logout", {});

      if (!result.error) {
        toastr.success("Logged out successfully");
        clearUser();
        navigate("/");
      } else {
        toastr.error("Logout failed");
      }
    } catch (err) {
      toastr.error("Network error");
    }
  }
</script>

<header>
  <button
    class="theme-toggle"
    on:click={theme.toggle}
    title="Toggle Dark and Light Mode"
  >
    {#if $theme}
      <img src={lightModeIcon} class="icon" alt="Light Mode Logo" />
    {:else}
      <img src={darkModeIcon} class="icon" alt="Dark Mode Logo" />
    {/if}
  </button>
  <div class="active-users">
    <span class="dot">●</span>
    {activeUsers} FitLogger Users Online
  </div>
  <div class="nav-container">
    <div class="nav-left">
      <a href="/" class="logo-link">
        <img src={fitnessLogo} class="logo" alt="Fitness Logo" />
      </a>
      <nav>
        {#if $user !== undefined && $user !== null}
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/exercises">Exercises</Link>
          <Link to="/workouts">Workouts</Link>
          <Link to="/my-routines">Routines</Link>
          <Link to="/profile">Profile</Link>
        {:else}
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        {/if}
      </nav>
    </div>
    <div class="logout-button">
      {#if $user !== undefined && $user !== null}
        <button on:click={handleLogout}>Logout</button>
      {/if}
    </div>
  </div>
</header>

<style>
  header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1000px;
    margin: 0 auto;
    padding: 0.3em 1em;
  }

  .nav-left {
    display: flex;
    align-items: center;
    gap: 1.5em;
  }

  .logo {
    height: 2.5em;
    transition: filter 0.3s;
  }

  .logo:hover {
    filter: drop-shadow(0 0 0.8em #646cffaa);
  }

  .icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  nav {
    display: flex;
    gap: 0.8em;
  }

  /* Note: :global is needed for Link components from svelte-routing as they render <a> tags */
  nav :global(a) {
    text-decoration: none;
    color: #646cff;
    font-weight: 500;
    font-size: 0.95rem;
    padding: 0.3em 0.5em;
    transition: color 0.2s;
  }

  nav :global(a:hover) {
    color: #ff3e00;
    text-decoration: underline;
  }

  .theme-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    color: #333;
    position: absolute;
    left: 2rem;
    top: 50%;
    transform: translateY(-50%);
  }

  .active-users {
    position: absolute;
    right: 2rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.9rem;
    font-weight: 600;
    color: #10b981;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .dot {
    font-size: 0.8rem;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }

  /* Dark Mode Overrides for Header */
  :global(body.dark-mode) header {
    background-color: #1f2937;
    border-bottom: 1px solid #374151;
  }
  :global(body.dark-mode) .theme-toggle {
    color: #fbbf24;
  }
</style>
