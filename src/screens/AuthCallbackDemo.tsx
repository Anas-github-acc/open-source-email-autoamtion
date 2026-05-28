"use client";

import { useState } from "react";
import { SetupView, type StepState } from "@/screens/SetupView";

type ScenarioId = "connecting" | "forking" | "secrets" | "success" | "fork-error" | "hard-error";

interface Scenario {
  id: ScenarioId;
  label: string;
  steps: StepState;
  forkLogin: string | null;
  forkError: string | null;
  hardError: string | null;
  isDone: boolean;
  userId: string | null;
}

const SCENARIOS: Scenario[] = [
  {
    id: "connecting",
    label: "Step 1 - Connecting",
    steps: { connecting: "active", forking: "idle", secrets: "idle" },
    forkLogin: null, forkError: null, hardError: null, isDone: false,
    userId: null,
  },
  {
    id: "forking",
    label: "Step 2 - Forking",
    steps: { connecting: "done", forking: "active", secrets: "idle" },
    forkLogin: null, forkError: null, hardError: null, isDone: false,
    userId: "a1b2c3d4-0000-0000-0000-e5f6a7b8c9d0",
  },
  {
    id: "secrets",
    label: "Step 3 - Injecting secrets",
    steps: { connecting: "done", forking: "done", secrets: "active" },
    forkLogin: "demo-user", forkError: null, hardError: null, isDone: false,
    userId: "a1b2c3d4-0000-0000-0000-e5f6a7b8c9d0",
  },
  {
    id: "success",
    label: "All done",
    steps: { connecting: "done", forking: "done", secrets: "done" },
    forkLogin: "demo-user", forkError: null, hardError: null, isDone: true,
    userId: "a1b2c3d4-0000-0000-0000-e5f6a7b8c9d0",
  },
  {
    id: "fork-error",
    label: "Fork failed",
    steps: { connecting: "done", forking: "error", secrets: "error" },
    forkLogin: null,
    forkError: "A repository with the same name already exists on this account",
    hardError: null, isDone: false,
    userId: "a1b2c3d4-0000-0000-0000-e5f6a7b8c9d0",
  },
  {
    id: "hard-error",
    label: "Auth failed",
    steps: { connecting: "error", forking: "idle", secrets: "idle" },
    forkLogin: null, forkError: null,
    hardError: "No active session found. Please try signing in again.",
    isDone: false, userId: null,
  },
];

export default function AuthCallbackDemo({
  sourceOwner,
  sourceRepo,
}: {
  sourceOwner: string;
  sourceRepo: string;
}) {
  const [active, setActive] = useState<ScenarioId>("connecting");
  const scenario = SCENARIOS.find((s) => s.id === active)!;

  return (
    <div className="demo-root">
      <aside className="demo-sidebar">
        <p className="demo-sidebar-label">Preview state</p>
        <nav className="demo-nav">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={`demo-nav-btn ${active === s.id ? "dnb-active" : ""}`}
              onClick={() => setActive(s.id)}
            >
              <span className={`dnb-dot dot-${s.id}`} />
              {s.label}
            </button>
          ))}
        </nav>
        <div className="demo-note">
          <p>
            Preview of every state without signing in.
            Real page is at <code>/auth/callback</code>.
          </p>
          <p style={{ marginTop: 8 }}>
            Repo: <code>{sourceOwner}/{sourceRepo}</code>
          </p>
        </div>
      </aside>

      <main className="demo-main">
        <div className="demo-badge">Preview only - no real requests</div>
        <SetupView
          steps={scenario.steps}
          forkLogin={scenario.forkLogin}
          forkError={scenario.forkError}
          hardError={scenario.hardError}
          isDone={scenario.isDone}
          sourceOwner={sourceOwner}
          sourceRepo={sourceRepo}
          userId={scenario.userId}
          onRetry={() => setActive("connecting")}
          onContinue={() => alert("Would redirect to /dashboard")}
        />
      </main>

      <style>{`
        .demo-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 220px 1fr;
          background: hsl(240 6% 4%);
          font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          font-size: 14px;
          -webkit-font-smoothing: antialiased;
          color: hsl(0 0% 80%);
        }

        .demo-sidebar {
          border-right: 1px solid hsl(240 4% 12%);
          padding: 32px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }

        .demo-sidebar-label {
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: hsl(0 0% 34%);
          margin: 0 0 12px;
          padding: 0 8px;
        }

        .demo-nav { display: flex; flex-direction: column; gap: 2px; }

        .demo-nav-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          width: 100%;
          padding: 8px 10px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: hsl(0 0% 46%);
          font-size: 12.5px;
          font-weight: 400;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s, color 0.15s;
        }
        .demo-nav-btn:hover { background: hsl(240 4% 9%); color: hsl(0 0% 72%); }
        .dnb-active { background: hsl(240 4% 10%) !important; color: hsl(0 0% 82%) !important; font-weight: 500; }

        .dnb-dot {
          width: 6px; height: 6px; min-width: 6px;
          border-radius: 50%;
          background: hsl(240 4% 26%);
        }
        .dot-connecting, .dot-forking, .dot-secrets { background: hsl(234 55% 55%); }
        .dot-success    { background: hsl(145 50% 42%); }
        .dot-fork-error { background: hsl(345 60% 48%); }
        .dot-hard-error { background: hsl(345 60% 48%); }

        .demo-note {
          margin-top: auto;
          padding: 14px 10px 0;
          border-top: 1px solid hsl(240 4% 11%);
        }
        .demo-note p {
          font-size: 11.5px;
          color: hsl(0 0% 32%);
          line-height: 1.6;
          margin: 0;
        }
        .demo-note code {
          font-family: ui-monospace, monospace;
          font-size: 11px;
          color: hsl(0 0% 48%);
          background: hsl(240 4% 10%);
          border: 1px solid hsl(240 4% 18%);
          border-radius: 3px;
          padding: 1px 5px;
        }

        .demo-main {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 48px;
          min-height: 100vh;
        }

        .demo-badge {
          font-size: 11px;
          font-weight: 500;
          color: hsl(38 70% 45%);
          background: hsl(38 15% 8%);
          border: 1px solid hsl(38 40% 18%);
          border-radius: 20px;
          padding: 4px 12px;
          margin-bottom: 48px;
          letter-spacing: 0.02em;
        }

        @media (max-width: 640px) {
          .demo-root { grid-template-columns: 1fr; }
          .demo-sidebar {
            height: auto; position: relative;
            border-right: none; border-bottom: 1px solid hsl(240 4% 12%);
            flex-direction: row; flex-wrap: wrap; padding: 16px;
          }
          .demo-sidebar-label { display: none; }
          .demo-nav { flex-direction: row; flex-wrap: wrap; gap: 6px; }
          .demo-note { display: none; }
          .demo-main { padding: 40px 24px; }
        }
      `}</style>
    </div>
  );
}
