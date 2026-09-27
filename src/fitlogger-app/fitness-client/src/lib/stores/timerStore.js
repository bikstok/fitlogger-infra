import { writable } from "svelte/store";
import toastr from "toastr";

function playBuzzer() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.5);

  osc.start();

  setTimeout(() => {
    osc.stop();
    ctx.close();
  }, 500);
}

/**
 * Formats seconds into a MM:SS string.
 * @param {number} sec - The total seconds.
 * @returns {string} The formatted time string.
 */
export function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function createTimerStore() {
  const { subscribe, update } = writable({
    active: false,
    seconds: 0,
    defaultSeconds: 180,
  });

  let interval;

  const start = () => {
    if (interval) clearInterval(interval);

    update((store) => {
      store.active = true;
      store.seconds = store.defaultSeconds;

      interval = setInterval(() => {
        update((s) => {
          s.seconds--;
          if (s.seconds <= 0) {
            clearInterval(interval);
            s.seconds = 0;
            playBuzzer();
            toastr.info("Rest time is over!");
          }
          return s;
        });
      }, 1000);

      return store;
    });
  };

  const stop = () => {
    if (interval) clearInterval(interval);
    update((store) => ({ ...store, active: false }));
  };

  const adjust = (amount) => {
    update((store) => ({
      ...store,
      seconds: Math.max(0, store.seconds + amount),
    }));
  };

  const setDefault = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return;
    update((store) => ({ ...store, defaultSeconds: seconds }));
  };

  return { subscribe, start, stop, adjust, setDefault };
}

export const timer = createTimerStore();
