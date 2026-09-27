import { Router } from "express";
import { comparePasswords } from "../util/passwordHashUtil.js";
import supabase from "../util/supabaseUtil.js";
import { Resend } from "resend";
import { emitUserLogin } from "../util/socketUtil.js";

const resend = new Resend(process.env.RESEND_EMAIL_API_KEY);

const router = Router();

router.post("/api/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) {
      console.error(error);
      return res.status(500).send({ error: "Database error" });
    }

    const user = users[0];
    if (!user) {
      return res.status(401).send({ error: "User not found" });
    }

    const isValidPassword = await comparePasswords(password, user.password);
    if (!isValidPassword) {
      return res.status(401).send({ error: "Wrong password" });
    }

    req.session.userId = user.id;

    try {
      const result = await resend.emails.send({
        from: "FitLogger Team <no-reply@fitlogger.dk>",
        to: user.email,
        subject: "New Login Detected",
        html: `<p>Hello ${user.user_name}, if you did not just login to FitLogger then please change your password</p>
           <p>Login detected from IP: <strong>${ip}</strong></p>`,
      });
      console.log("Email sent:", result);
    } catch (err) {
      console.error("Failed to send login notification email:", err);
    }

    emitUserLogin(req.io, user.user_name);

    res.status(200).send({
      data: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error" });
  }
});

export default router;
