import jwt from "jsonwebtoken";
import { getContainer } from "./dockerService.js";

const SESSION_TIMEOUT_MS = Number(process.env.LAB_SESSION_TIMEOUT_MS || 60 * 60 * 1000);
const TOKEN_SECRET = process.env.JWT_SECRET || "dev-secret-change";
const idleTimers = new Map();

function scheduleClose(userId, ws) {
  if (idleTimers.has(userId)) {
    clearTimeout(idleTimers.get(userId));
  }
  const timeout = setTimeout(() => {
    ws.close(1000, "Session timeout");
  }, SESSION_TIMEOUT_MS);
  idleTimers.set(userId, timeout);
}

export function attachTerminalWs(wss) {
  wss.on("connection", async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(1008, "Missing token");
      return;
    }

    let userId;
    try {
      const payload = jwt.verify(token, TOKEN_SECRET);
      userId = payload.sub;
    } catch (error) {
      ws.close(1008, "Invalid token");
      return;
    }

    const container = await getContainer(userId);
    if (!container) {
      ws.close(1011, "Lab not started");
      return;
    }

    scheduleClose(userId, ws);
    const exec = await container.exec({
      Cmd: ["/bin/bash"],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });

    const stream = await exec.start({ hijack: true, stdin: true });

    ws.on("message", (data) => {
      scheduleClose(userId, ws);
      stream.write(data);
    });

    stream.on("data", (chunk) => {
      ws.send(chunk);
    });

    ws.on("close", () => {
      stream.end();
      if (idleTimers.has(userId)) {
        clearTimeout(idleTimers.get(userId));
        idleTimers.delete(userId);
      }
    });
  });
}
