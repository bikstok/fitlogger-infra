import { Router } from "express";

const router = Router();

router.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.send({ data: "Logged out" });
  });
});

export default router;
