import { Router } from "express";
import supabase from "../util/supabaseUtil.js";
import { requireAuthentication } from "../util/authUtil.js";

const router = Router();

router.get("/api/exercises", async (req, res) => {
  try {
    const { data, error } = await supabase.from("exercises").select("*");

    if (error) {
      console.error(error);
      return res.status(500).send({ error: "Could not fetch exercises" });
    }

    res.status(200).send({ data: data });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

router.post("/api/exercises", requireAuthentication, async (req, res) => {
  const {
    name,
    equipment,
    primary_muscle_group,
    secondary_muscle_group,
    image_url,
  } = req.body;

  if (!name || !equipment || !primary_muscle_group) {
    return res.status(400).send({
      error: "Name, equipment, and primary muscle group are required",
    });
  }

  try {
    const { data, error } = await supabase
      .from("exercises")
      .insert([
        {
          name,
          equipment,
          primary_muscle_group,
          secondary_muscle_group,
          image_url,
        },
      ])
      .select();

    if (error) {
      console.error(error);
      return res.status(500).send({ error: "Could not create exercise" });
    }

    res.status(201).send({ data: data });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
