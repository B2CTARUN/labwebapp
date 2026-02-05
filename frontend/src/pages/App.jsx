import React, { useState } from "react";
import TerminalPanel from "../components/TerminalPanel.jsx";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function App() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("stopped");
  const [email, setEmail] = useState("student@example.com");
  const [role, setRole] = useState("student");

  const request = async (path, method = "GET", body) => {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const payload = await response.json();
      throw new Error(payload.error || "Request failed");
    }
    return response.json();
  };

  const handleLogin = async () => {
    const payload = await request("/auth/login", "POST", { email, role });
    setToken(payload.token);
  };

  const handleStart = async () => {
    const payload = await request("/lab/start", "POST");
    setStatus(payload.status);
  };

  const handleStop = async () => {
    await request("/lab/stop", "POST");
    setStatus("stopped");
  };

  const handleReset = async () => {
    const payload = await request("/lab/reset", "POST");
    setStatus(payload.status);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Cloud Virtual Lab</h1>
        <p>Launch an isolated Linux container and practice DevOps tasks directly in your browser.</p>
        <div className="card" style={{ marginTop: "16px", background: "#1e293b" }}>
          <p style={{ margin: 0 }}>Session status: {status}</p>
        </div>
      </aside>
      <main className="main">
        <div className="card">
          <h2>Login</h2>
          <div className="controls" style={{ flexWrap: "wrap" }}>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@example.com"
              style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #cbd5f5" }}
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              style={{ padding: "8px", borderRadius: "8px", border: "1px solid #cbd5f5" }}
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={handleLogin}>Generate Token</button>
          </div>
        </div>
        <div className="card">
          <h2>Lab Controls</h2>
          <div className="controls">
            <button onClick={handleStart} disabled={!token}>Start Lab</button>
            <button className="secondary" onClick={handleStop} disabled={!token}>Stop Lab</button>
            <button className="danger" onClick={handleReset} disabled={!token}>Reset Lab</button>
          </div>
        </div>
        <div className="card">
          <h2>Terminal</h2>
          <TerminalPanel token={token} status={status} />
        </div>
        <div className="card">
          <h2>Instructions</h2>
          <ol>
            <li>Generate a JWT token using the login form.</li>
            <li>Start the lab container.</li>
            <li>Run <code>whoami</code> or <code>ls</code> to explore.</li>
            <li>Complete the lab checklist and stop/reset when done.</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
