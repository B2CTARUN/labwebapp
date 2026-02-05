import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:4000/terminal";

export default function TerminalPanel({ token, status }) {
  const containerRef = useRef(null);
  const terminalRef = useRef(null);
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      theme: { background: "#0b1120", foreground: "#e2e8f0" }
    });

    terminal.open(containerRef.current);
    terminal.writeln("Welcome to your lab terminal.");
    terminal.writeln(status === "running" ? "Connecting..." : "Start a lab to connect.");
    terminalRef.current = terminal;

    return () => {
      terminal.dispose();
    };
  }, [status]);

  useEffect(() => {
    if (status !== "running" || !token) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      return;
    }

    const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
    socketRef.current = ws;

    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setConnected(true);
      terminalRef.current?.writeln("Connected to container.");
    };

    ws.onmessage = (event) => {
      const data = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : event.data;
      terminalRef.current?.write(data);
    };

    ws.onclose = () => {
      setConnected(false);
      terminalRef.current?.writeln("Disconnected from container.");
    };

    return () => {
      ws.close();
    };
  }, [status, token]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    const handler = terminal.onData((data) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(data);
      }
    });

    return () => handler.dispose();
  }, []);

  return (
    <div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
        <span style={{ alignSelf: "center", color: connected ? "#16a34a" : "#f59e0b" }}>
          {connected ? "Connected" : "Offline"}
        </span>
      </div>
      <div className="terminal-container" ref={containerRef}></div>
    </div>
  );
}
