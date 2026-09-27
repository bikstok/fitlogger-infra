import { Router } from "express";
import supabase from "../util/supabaseUtil.js";
import { getStartDateForRange, generateTimeBuckets} from "../util/dateUtils.js";
import { requireAuthentication } from "../util/authUtil.js";

const router = Router();

router.get(
  "/api/stats/weekly-duration/:userId",
  requireAuthentication,
  async (req, res) => {
    const { userId } = req.params;
    const { range = "3m" } = req.query;

    const stats = generateTimeBuckets(range);

    const queryStartDate = stats[0].start.toISOString();

    try {
      const { data, error } = await supabase
        .from("workouts")
        .select("start_time, end_time")
        .eq("user_id", userId)
        .gte("start_time", queryStartDate);

      if (error) throw error;

      // Fill buckets
      data.forEach((w) => {
        if (!w.start_time || !w.end_time) return;
        const wStart = new Date(w.start_time);
        const duration = (new Date(w.end_time) - wStart) / (1000 * 60 * 60);

        const bucket = stats.find((s) => wStart >= s.start && wStart < s.end);
        if (bucket) {
          bucket.hours += duration;
        }
      });

      res.send({ data: stats });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Internal server error" });
    }
  }
);

router.get(
  "/api/stats/workout-frequency/:userId",
  requireAuthentication,
  async (req, res) => {
    const { userId } = req.params;
    const { range = "3m" } = req.query;

    const buckets = generateTimeBuckets(range);
    // Initialize count for each bucket
    const stats = buckets.map((b) => ({ ...b, count: 0 }));

    const queryStartDate = stats[0].start.toISOString();

    try {
      const { data, error } = await supabase
        .from("workouts")
        .select("start_time")
        .eq("user_id", userId)
        .gte("start_time", queryStartDate);

      if (error) throw error;

      data.forEach((w) => {
        if (!w.start_time) return;
        const wStart = new Date(w.start_time);
        const bucket = stats.find((s) => wStart >= s.start && wStart < s.end);
        if (bucket) bucket.count++;
      });

      res.send({ data: stats });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Internal server error" });
    }
  }
);

router.get(
  "/api/stats/muscle-distribution/:userId",
  requireAuthentication,
  async (req, res) => {
    const { userId } = req.params;
    const { range = "3m" } = req.query;
    const startDate = getStartDateForRange(range);

    try {
      // Join workout_exercises with exercises and filter by user via workouts
      const { data, error } = await supabase
        .from("workout_exercises")
        .select(
          `
        exercises (
          primary_muscle_group
        ),
        workouts!inner (
          user_id,
          start_time
        )
      `
        )
        .eq("workouts.user_id", userId)
        .gte("workouts.start_time", startDate.toISOString());

      if (error) throw error;

      // Aggregate counts by muscle group
      const distribution = {};
      data.forEach((item) => {
        const group = item.exercises?.primary_muscle_group;
        if (group) {
          distribution[group] = (distribution[group] || 0) + 1;
        }
      });

      const labels = Object.keys(distribution);
      const values = Object.values(distribution);

      res.send({ data: { labels, values } });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Internal server error" });
    }
  }
);

router.get(
  "/api/stats/heatmap/:userId",
  requireAuthentication,
  async (req, res) => {
    const { userId } = req.params;

    // Fetch last ~1 year of data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 370);

    try {
      const { data, error } = await supabase
        .from("workouts")
        .select("start_time")
        .eq("user_id", userId)
        .gte("start_time", startDate.toISOString());

      if (error) throw error;

      const heatmap = {};
      data.forEach((w) => {
        if (!w.start_time) return;
        const date = w.start_time.split("T")[0];
        heatmap[date] = (heatmap[date] || 0) + 1;
      });

      res.send({ data: heatmap });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Internal server error" });
    }
  }
);

router.get(
  "/api/stats/weekday-frequency/:userId",
  requireAuthentication,
  async (req, res) => {
    const { userId } = req.params;
    const { range = "1m" } = req.query;
    const startDate = getStartDateForRange(range);

    try {
      const { data, error } = await supabase
        .from("workouts")
        .select("start_time")
        .eq("user_id", userId)
        .gte("start_time", startDate.toISOString());

      if (error) throw error;

      const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const counts = new Array(7).fill(0);

      data.forEach((w) => {
        if (!w.start_time) return;
        const d = new Date(w.start_time);
        const dayIndex = (d.getDay() + 6) % 7; // Shift so 0=Monday, 6=Sunday
        counts[dayIndex]++;
      });

      res.send({ data: { labels: days, values: counts } });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Internal server error" });
    }
  }
);

router.get(
  "/api/stats/exercise-progression/:userId/:exerciseId",
  requireAuthentication,
  async (req, res) => {
    const { userId, exerciseId } = req.params;
    const { range = "3m" } = req.query;
    const startDate = getStartDateForRange(range);

    try {
      const { data, error } = await supabase
        .from("workout_exercises")
        .select(
          `
        sets (weight_kg),
        workouts!inner (
          start_time,
          user_id
        )
      `
        )
        .eq("exercise_id", exerciseId)
        .eq("workouts.user_id", userId)
        .gte("workouts.start_time", startDate.toISOString());

      if (error) throw error;

      const progression = data
        .map((item) => {
          const maxWeight = item.sets.reduce(
            (max, set) => Math.max(max, set.weight_kg || 0),
            0
          );
          return { date: item.workouts.start_time, weight: maxWeight };
        })
        .filter((p) => p.weight > 0)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      res.send({
        data: {
          labels: progression.map((p) => new Date(p.date).toLocaleDateString()),
          values: progression.map((p) => p.weight),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).send({ error: "Internal server error" });
    }
  }
);

export default router;
