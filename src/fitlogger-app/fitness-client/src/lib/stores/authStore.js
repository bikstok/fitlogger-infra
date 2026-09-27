import { writable } from "svelte/store";
import { fetchGet } from "../../util/fetchUtil.js";

export const user = writable(undefined);

export async function loadSession() {
  try {
    const data = await fetchGet("/api/session");

    if (!data.error && data.user) {
      user.set(data.user);
      return data.user;
    }

    user.set(null);
    return null;
  } catch (err) {
    console.error("Error loading session:", err);
    user.set(null);
    return null;
  }
}

export function clearUser() {
  user.set(null);
}
