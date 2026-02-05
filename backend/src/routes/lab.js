import { Router } from "express";
import {
  startLabContainer,
  stopLabContainer,
  resetLabContainer,
  getLabStatus
} from "../dockerService.js";

const router = Router();

router.post("/start", async (req, res) => {
  const { sub: userId } = req.user;
  try {
    const result = await startLabContainer(userId);
    res.json({ status: "running", containerId: result.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/stop", async (req, res) => {
  const { sub: userId } = req.user;
  try {
    await stopLabContainer(userId);
    res.json({ status: "stopped" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/reset", async (req, res) => {
  const { sub: userId } = req.user;
  try {
    const result = await resetLabContainer(userId);
    res.json({ status: "running", containerId: result.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/status", (req, res) => {
  const { sub: userId } = req.user;
  res.json(getLabStatus(userId));
});

export default router;
