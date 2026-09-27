export function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return "";
  const diff = new Date(endTime) - new Date(startTime);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function calculateTotalVolume(workoutExercises) {
  let totalVolume = 0;
  if (workoutExercises) {
    workoutExercises.forEach((exercise) => {
      if (exercise.sets) {
        exercise.sets.forEach((set) => {
          totalVolume += (set.weight_kg || 0) * (set.reps || 0);
        });
      }
    });
  }
  return totalVolume;
}

export function getWeekNumber(date) {
  date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
