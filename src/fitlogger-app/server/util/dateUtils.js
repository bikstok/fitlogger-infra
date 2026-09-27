import { getWeekNumber } from "./workoutUtils.js";

export function getStartDateForRange(range) {
  const currentDate = new Date();
  
  if (range === "1week") {
    const oneWeekAgo = new Date(currentDate);
    const daysInWeek = 7;
    const daysToSubtract = daysInWeek - 1; // Look back 6 days + today = 7 days
    oneWeekAgo.setDate(oneWeekAgo.getDate() - daysToSubtract);
    oneWeekAgo.setHours(0, 0, 0, 0);
    return oneWeekAgo;
  }
  
  if (range === "1year") {
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const oneYearAgo = new Date(currentMonthStart);
    const monthsInYear = 12;
    const monthsToSubtract = monthsInYear - 1; // Look back 11 months + current month = 12 months
    oneYearAgo.setMonth(oneYearAgo.getMonth() - monthsToSubtract);
    return oneYearAgo;
  }

  // Weekly buckets (1m, 3m, 6m)
  let numberOfWeeksToDisplay = 12; // Default 3m
  if (range === "1month") numberOfWeeksToDisplay = 5;
  if (range === "6month") numberOfWeeksToDisplay = 26;

  const currentMonday = new Date(currentDate);
  const currentDayOfWeek = currentMonday.getDay() || 7; // 1 (Mon) to 7 (Sun)
  const daysSinceMonday = currentDayOfWeek - 1;
  
  // Snap to the most recent Monday
  currentMonday.setDate(currentMonday.getDate() - daysSinceMonday);
  currentMonday.setHours(0, 0, 0, 0);

  const startDate = new Date(currentMonday);
  const weeksToSubtract = numberOfWeeksToDisplay - 1;
  const daysPerWeek = 7;
  startDate.setDate(startDate.getDate() - (weeksToSubtract * daysPerWeek));
  return startDate;
}

export function generateTimeBuckets(range) {
  const currentDate = new Date();
  const buckets = [];

  if (range === "1week") {
    // Daily buckets for last 7 days
    const daysToLookBack = 6;
    for (let daysAgo = daysToLookBack; daysAgo >= 0; daysAgo--) {
      const bucketStartDate = new Date(currentDate);
      bucketStartDate.setDate(bucketStartDate.getDate() - daysAgo);
      bucketStartDate.setHours(0, 0, 0, 0);
      
      const bucketEndDate = new Date(bucketStartDate);
      bucketEndDate.setDate(bucketEndDate.getDate() + 1);
      
      const dayLabel = bucketStartDate.toLocaleDateString('en-US', { weekday: 'short' });
      buckets.push({ start: bucketStartDate, end: bucketEndDate, label: dayLabel, hours: 0 });
    }
  } else if (range === "1year") {
    // Monthly buckets for last 12 months
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthsToLookBack = 11;
    for (let monthsAgo = monthsToLookBack; monthsAgo >= 0; monthsAgo--) {
      const bucketStartDate = new Date(currentMonthStart);
      bucketStartDate.setMonth(bucketStartDate.getMonth() - monthsAgo);
      
      const bucketEndDate = new Date(bucketStartDate);
      bucketEndDate.setMonth(bucketEndDate.getMonth() + 1);
      
      const monthLabel = bucketStartDate.toLocaleDateString('en-US', { month: 'short' });
      buckets.push({ start: bucketStartDate, end: bucketEndDate, label: monthLabel, hours: 0 });
    }
  } else {
    // Weekly buckets (1m, 3m, 6m)
    let numberOfWeeksToDisplay = 12; // Default 3m
    if (range === "1month") numberOfWeeksToDisplay = 5;
    if (range === "6month") numberOfWeeksToDisplay = 26;

    const currentMonday = new Date(currentDate);
    const currentDayOfWeek = currentMonday.getDay() || 7;
    const daysSinceMonday = currentDayOfWeek - 1;
    
    currentMonday.setDate(currentMonday.getDate() - daysSinceMonday);
    currentMonday.setHours(0, 0, 0, 0);

    const weeksToLookBack = numberOfWeeksToDisplay - 1;
    const daysPerWeek = 7;

    for (let weeksAgo = weeksToLookBack; weeksAgo >= 0; weeksAgo--) {
      const bucketStartDate = new Date(currentMonday);
      bucketStartDate.setDate(bucketStartDate.getDate() - (weeksAgo * daysPerWeek));
      
      const bucketEndDate = new Date(bucketStartDate);
      bucketEndDate.setDate(bucketEndDate.getDate() + daysPerWeek);
      
      const weekLabel = `Week ${getWeekNumber(bucketStartDate)}`;
      buckets.push({ start: bucketStartDate, end: bucketEndDate, label: weekLabel, hours: 0 });
    }
  }
  return buckets;
}
