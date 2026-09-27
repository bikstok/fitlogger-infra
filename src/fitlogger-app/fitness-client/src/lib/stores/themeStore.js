import { writable } from "svelte/store";

function createThemeStore() {
  const isBrowser = typeof window !== "undefined";
  const savedTheme = isBrowser ? localStorage.getItem("theme") : null;
  const initialValue = savedTheme === "dark";

  const { subscribe, update } = writable(initialValue);

  return {
    subscribe,
    toggle: () => {
      update((isDark) => {
        const newMode = !isDark;
        if (isBrowser) {
          if (newMode) {
            document.body.classList.add("dark-mode");
            localStorage.setItem("theme", "dark");
          } else {
            document.body.classList.remove("dark-mode");
            localStorage.setItem("theme", "light");
          }
        }
        return newMode;
      });
    },
    init: () => {
      if (isBrowser && initialValue) {
        document.body.classList.add("dark-mode");
      }
    },
  };
}

export const theme = createThemeStore();
