<script>
  import { navigate } from "svelte-routing";
  import toastr from "toastr";
  import { fetchPost } from "../../util/fetchUtil.js";

  let username = "";
  let email = "";
  let password = "";

  async function handleRegister() {
    if (!username || !email || !password) {
      toastr.error("All fields are required");
      return;
    }

    try {
      const result = await fetchPost("/api/register", {
        username,
        email,
        registerPassword: password,
      });

      if (result.error) {
        toastr.error(result.error || "Registration failed");
        return;
      }

      toastr.success("User registered successfully!");
      formReset();

      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      console.error(err);
      toastr.error("Network error");
    }
  }

  function formReset() {
    username = "";
    email = "";
    password = "";
  }
</script>

<main>
  <h1>Register</h1>

  <!-- UI stays the same -->
  <form on:submit|preventDefault={handleRegister}>
    <label>
      Username:
      <input type="text" bind:value={username} placeholder="Enter username" />
    </label>

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

    <button type="submit">Register</button>
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
