import Docker from "dockerode";

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock" });

const DEFAULT_IMAGE = process.env.LAB_IMAGE || "ubuntu:22.04";
const CPU_SHARES = Number(process.env.LAB_CPU_SHARES || 256);
const MEMORY_BYTES = Number(process.env.LAB_MEMORY_BYTES || 512 * 1024 * 1024);
const LAB_NETWORK = process.env.LAB_NETWORK || "bridge";

const userContainers = new Map();

export async function ensureImage() {
  const images = await docker.listImages({ filters: { reference: [DEFAULT_IMAGE] } });
  if (images.length === 0) {
    await new Promise((resolve, reject) => {
      docker.pull(DEFAULT_IMAGE, (error, stream) => {
        if (error) return reject(error);
        docker.modem.followProgress(stream, (pullError) => {
          if (pullError) return reject(pullError);
          resolve();
        });
      });
    });
  }
}

export async function startLabContainer(userId) {
  await ensureImage();
  const existing = userContainers.get(userId);
  if (existing) {
    return existing;
  }

  const container = await docker.createContainer({
    Image: DEFAULT_IMAGE,
    Cmd: ["/bin/bash"],
    Tty: true,
    OpenStdin: true,
    HostConfig: {
      AutoRemove: true,
      NetworkMode: LAB_NETWORK,
      CpuShares: CPU_SHARES,
      Memory: MEMORY_BYTES,
      PidsLimit: 256,
      ReadonlyRootfs: false,
      SecurityOpt: ["no-new-privileges:true"],
      CapDrop: ["ALL"],
      CapAdd: ["CHOWN", "SETUID", "SETGID", "DAC_OVERRIDE"],
      User: "1000:1000"
    }
  });

  await container.start();
  const info = { id: container.id, createdAt: Date.now() };
  userContainers.set(userId, info);
  return info;
}

export async function stopLabContainer(userId) {
  const entry = userContainers.get(userId);
  if (!entry) return null;
  const container = docker.getContainer(entry.id);
  try {
    await container.stop({ t: 5 });
  } catch (error) {
    // ignore if already stopped
  }
  userContainers.delete(userId);
  return entry;
}

export async function resetLabContainer(userId) {
  await stopLabContainer(userId);
  return startLabContainer(userId);
}

export function getLabStatus(userId) {
  const entry = userContainers.get(userId);
  if (!entry) return { status: "stopped" };
  return { status: "running", containerId: entry.id, createdAt: entry.createdAt };
}

export async function getContainer(userId) {
  const entry = userContainers.get(userId);
  if (!entry) return null;
  return docker.getContainer(entry.id);
}

export function cleanupIdleSessions(maxIdleMs) {
  const now = Date.now();
  const tasks = [];
  for (const [userId, entry] of userContainers.entries()) {
    if (now - entry.createdAt > maxIdleMs) {
      tasks.push(stopLabContainer(userId));
    }
  }
  return Promise.allSettled(tasks);
}
