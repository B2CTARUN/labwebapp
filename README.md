# Cloud Virtual Lab

## System Architecture (High-Level)

**Core flow**
1. A student logs in and receives a JWT with their user ID (`sub`).
2. The frontend calls the Lab API to start a lab container for that user.
3. The backend uses Docker to create a resource-limited, non-root container per user.
4. The terminal UI opens a WebSocket connection to the backend, which attaches to a `bash` exec session inside that container.
5. The backend enforces session timeouts and can stop/reset containers on demand.

**Key services**
- **Frontend (React + xterm.js):** Login flow, lab dashboard, terminal UI.
- **Backend (Express + WebSocket):** REST APIs for lab lifecycle + WebSocket terminal bridge.
- **Docker Engine:** Runs isolated Linux containers with CPU/memory limits and reduced Linux capabilities.

**Security controls**
- Non-root user inside containers (`User: 1000:1000`).
- Drop Linux capabilities (`CapDrop: ALL`) and only add minimal caps.
- `no-new-privileges` enabled.
- CPU shares, memory limit, PID limits.
- Network isolation via a dedicated bridge network (configurable).

## Folder Structure

```
labwebapp/
  backend/
    src/
      index.js
      dockerService.js
      terminalWs.js
      routes/lab.js
      middleware/auth.js
  frontend/
    src/
      pages/App.jsx
      components/TerminalPanel.jsx
      main.jsx
      styles.css
```

## Implementation Phases

### Phase 1 — Backend Lab Container Service
- `dockerService.js` provides container lifecycle: start, stop, reset, status.
- Containers are created on-demand with resource limits and non-root user.
- Idle session cleanup helper included for scheduled cleanup.

### Phase 2 — WebSocket Terminal Handler
- `terminalWs.js` creates an exec session in the running container.
- WebSocket messages pipe to `stdin`; container output pipes back to the browser.
- Session timeouts are enforced to close idle sessions.

### Phase 3 — React Terminal UI
- `TerminalPanel.jsx` uses xterm.js to render a live terminal.
- WebSocket connection attaches to the backend terminal endpoint.
- Dashboard includes lab controls, status, and instructions panel.

## Backend API Overview

| Method | Endpoint       | Description           |
|--------|----------------|-----------------------|
| POST   | /lab/start     | Start lab container   |
| POST   | /lab/stop      | Stop lab container    |
| POST   | /lab/reset     | Reset lab container   |
| GET    | /lab/status    | Get lab status        |
| POST   | /auth/login    | Create JWT token      |

## Security Best Practices

- Run Docker with a dedicated user and use rootless Docker where possible.
- Place lab containers on a dedicated Docker network with no host access.
- Add AppArmor/SELinux profiles for additional isolation.
- Restrict image set to trusted, signed images.
- Enforce rate limiting and audit logs for admin actions.

## Deployment Steps (MVP)

1. **Provision VM (AWS EC2 or equivalent)**
   - Install Docker and enable the daemon.
2. **Backend**
   - `cd backend`
   - `npm install`
   - Set environment variables in `.env` (see below).
   - `npm start`
3. **Frontend**
   - `cd frontend`
   - `npm install`
   - `npm run dev` (or `npm run build` then serve statics)

### Example Environment Variables

```
PORT=4000
JWT_SECRET=replace-me
LAB_IMAGE=ubuntu:22.04
LAB_CPU_SHARES=256
LAB_MEMORY_BYTES=536870912
LAB_SESSION_TIMEOUT_MS=3600000
CORS_ORIGIN=http://localhost:5173
```

## Admin Features (Roadmap)
- Lab catalog CRUD and template management.
- Session monitoring and force-stop controls.
- Usage metrics and cost reporting.
