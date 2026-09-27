<script>
  import { user } from "../../lib/stores/authStore.js";
  import { fetchDelete, fetchPostFormData } from "../../util/fetchUtil.js";
  import toastr from "toastr";

  let fileInput;
  let isImporting = false;

  async function handleImport() {
    if (!fileInput.files || fileInput.files.length === 0) {
      toastr.warning("Please select a CSV file first");
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", $user.id);

    isImporting = true;
    try {
      const result = await fetchPostFormData("/api/workouts/import", formData);

      if (!result.error) {
        toastr.success(result.message);
        fileInput.value = "";
      } else {
        toastr.error(result.error || "Import failed");
      }
    } catch (e) {
      toastr.error("Network error during import");
    } finally {
      isImporting = false;
    }
  }

  async function deleteAllWorkouts() {
    if (
      !confirm(
        "Are you sure you want to delete ALL your workouts? This action cannot be undone."
      )
    ) {
      return;
    }

    const result = await fetchDelete(`/api/workouts/all/${$user.id}`);

    if (result.error) {
      toastr.error(result.error);
    } else {
      toastr.success("All workouts deleted successfully");
    }
  }
</script>

<div class="page">
  <h1>Profile</h1>

  {#if $user}
    <div class="profile-card">
      <div class="import-section">
        <h3>Import Workouts</h3>
        <p>Upload a CSV file (Hevy/Strong format) to import your history.</p>
        <div class="file-upload-controls">
          <input type="file" accept=".csv" bind:this={fileInput} />
          <button
            class="btn-primary"
            onclick={handleImport}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import CSV"}
          </button>
        </div>
      </div>

      <div class="delete-section">
        <p>Deleting all workouts is permanent and cannot be recovered.</p>
        <button class="btn-danger" onclick={deleteAllWorkouts}
          >Delete All Workouts</button
        >
      </div>
    </div>
  {:else}
    <p>Loading profile...</p>
  {/if}
</div>

<style>
  .page {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
  }
  .profile-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    border: 1px solid #eee;
  }

  .import-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #eee;
  }
  .import-section h3 {
    margin: 0 0 0.5rem 0;
    color: #333;
  }
  .import-section p {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
  .file-upload-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }
  .btn-primary {
    background: #4f46e5;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
  }
  .btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }

  .delete-section {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #fee2e2;
  }
  .delete-section p {
    color: #7f1d1d;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }

  .btn-danger {
    background-color: #dc2626;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-danger:hover {
    background-color: #b91c1c;
  }

  :global(body.dark-mode) .profile-card {
    background: #1f2937;
    border-color: #374151;
  }
  :global(body.dark-mode) .info-group p {
    color: #f3f4f6;
  }
  :global(body.dark-mode) .info-group label {
    color: #9ca3af;
  }
  :global(body.dark-mode) .delete-section {
    border-color: #7f1d1d;
  }
  :global(body.dark-mode) .import-section {
    border-color: #374151;
  }
  :global(body.dark-mode) .import-section h3 {
    color: #f3f4f6;
  }
  :global(body.dark-mode) .import-section p {
    color: #9ca3af;
  }
</style>
