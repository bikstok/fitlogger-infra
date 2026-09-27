<script>
  import { navigate } from "svelte-routing";
  import toastr from "toastr";
  import { loadSession } from "../../lib/stores/authStore.js";
  import { fetchPost } from "../../util/fetchUtil.js";

  let email = "abekat@gmail.com";
  let password = "abekat123";

  async function handleLogin() {
    if (!email || !password) {
      toastr.error("Both fields are required");
      return;
    }

    try {
      const result = await fetchPost("/api/login", { email, password });

      if (result.error) {
        toastr.error(result.error || "Login failed");
        return;
      }
      // Refresh auth state so protected routes render immediately
      await loadSession();
      navigate("/dashboard");
      toastr.success("Logged in!");
    } catch (err) {
      console.error(err);
      toastr.error("Network error");
    }
  }
</script>

<main>
  <h1>Login</h1>

  <form on:submit|preventDefault={handleLogin}>
    <label>
      Email:
      <input type="email" bind:value={email} placeholder="Enter email" />
    </label>

    <label>
      Password:
      <input
        type="password"
        bind:value={password}
        placeholder="Enter password"
      />
    </label>

    <button type="submit">Login</button>
  </form>
</main>

<style>
  main {
    max-width: 400px;
    margin: 3em auto;
    padding: 2em;
    border: 1px solid #ccc;
    border-radius: 1em;
    text-align: center;
  }

  input {
    width: 100%;
    margin-bottom: 1em;
    padding: 0.5em;
    font-size: 1em;
  }

  button {
    padding: 0.7em 1.5em;
    font-size: 1em;
    cursor: pointer;
  }

  button:hover {
    background-color: #646cffaa;
    color: white;
  }

  label {
    display: block;
    text-align: left;
    margin-bottom: 0.5em;
  }
</style>
