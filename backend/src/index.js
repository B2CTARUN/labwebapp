import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import { WebSocketServer } from "ws";
import labRoutes from "./routes/lab.js";
import authRoutes from "./routes/auth.js";
import { attachTerminalWs } from "./terminalWs.js";
import { authMiddleware } from "./middleware/auth.js";

dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/lab", authMiddleware, labRoutes);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/terminal" });
attachTerminalWs(wss);

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Lab backend listening on ${port}`);
});
