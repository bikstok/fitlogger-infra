import { Router } from "express";
import { hashPassword } from "../util/passwordHashUtil.js";
import supabase from "../util/supabaseUtil.js";

const router = Router();

router.post("/api/register", async (req, res) => {
  const email = req.body.email;
  const userName = req.body.username;
  const password = req.body.registerPassword;

  if (!email || !password || !userName) {
    return res
      .status(400)
      .send({ error: "A username, email and password is required" });
  }

  try {
    const hashedPassword = await hashPassword(password);

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          user_name: userName,
          password: hashedPassword,
        },
      ])
      .select();

    if (error) {
      console.error(error);
      return res.status(500).send({ error: "Could not create user" });
    }

    res.status(201).send({ data: "User created." });
  } catch (error) {
    return res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
