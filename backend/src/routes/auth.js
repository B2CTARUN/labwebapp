import { Router } from "express";
import { signToken } from "../middleware/auth.js";

const router = Router();

router.post("/login", (req, res) => {
  const { email, role = "student" } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }
  const token = signToken({ sub: email, role });
  return res.json({ token });
});

export default router;
