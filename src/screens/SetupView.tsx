"use client";

import { useState } from "react";

export type StepStatus = "idle" | "active" | "done" | "error";

export interface StepState {
  connecting: StepStatus;
  forking: StepStatus;
  secrets: StepStatus;
}

// SVG eye icons — inline, no icon library needed
const EyeOpen = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOff = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

interface SecretRow {
  name: string;
  value: string;
}

function SecretsReveal({ secrets }: { secrets: SecretRow[] }) {
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  const toggle = (name: string) =>
    setVisible((prev) => ({ ...prev, [name]: !prev[name] }));

  const copy = async (name: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied((prev) => ({ ...prev, [name]: true }));
      setTimeout(() => setCopied((prev) => ({ ...prev, [name]: false })), 2000);
    } catch {
      // fallback silent
    }
  };

  return (
    <div className="sr-table">
      {secrets.map((s) => {
        const isVisible = visible[s.name] ?? false;
        const isCopied = copied[s.name] ?? false;
        const masked = s.value ? "\u2022".repeat(Math.min(s.value.length, 28)) : "(unavailable)";

        return (
          <div key={s.name} className="sr-row">
            <code className="sr-name">{s.name}</code>
            <span className={`sr-value ${isVisible ? "sr-plain" : "sr-dots"}`}>
              {isVisible ? s.value || "(unavailable)" : masked}
            </span>
            <div className="sr-actions">
              <button
                className="sr-btn"
                onClick={() => toggle(s.name)}
                title={isVisible ? "Hide" : "Show"}
                disabled={!s.value}
              >
                {isVisible ? <EyeOff /> : <EyeOpen />}
              </button>
              <button
                className={`sr-btn ${isCopied ? "sr-btn-copied" : ""}`}
                onClick={() => copy(s.name, s.value)}
                title="Copy"
                disabled={!s.value}
              >
                {isCopied ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <CopyIcon />
                )}
              </button>
            </div>
          </div>
        );
      })}

      <style>{`
        .sr-table {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 20px;
        }

        .sr-row {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: hsl(240 4% 9%);
          border: 1px solid hsl(240 4% 18%);
          border-radius: 5px;
        }

        .sr-name {
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: 11px;
          color: hsl(0 0% 55%);
          white-space: nowrap;
        }

        .sr-value {
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: 11.5px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sr-plain { color: hsl(0 0% 72%); }
        .sr-dots  { color: hsl(0 0% 28%); letter-spacing: 2px; }

        .sr-actions { display: flex; gap: 4px; }

        .sr-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border: 1px solid hsl(240 4% 22%);
          border-radius: 4px;
          background: transparent;
          color: hsl(0 0% 40%);
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
          padding: 0;
        }

        .sr-btn:hover:not(:disabled) {
          color: hsl(0 0% 68%);
          border-color: hsl(240 4% 32%);
          background: hsl(240 4% 11%);
        }

        .sr-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .sr-btn-copied { color: hsl(145 55% 48%) !important; border-color: hsl(145 40% 28%) !important; }
      `}</style>
    </div>
  );
}

const ITEMS: { id: keyof StepState; label: string; sublabel: string }[] = [
  {
    id: "connecting",
    label: "Connecting to your GitHub",
    sublabel: "Verifying your OAuth session with GitHub",
  },
  {
    id: "forking",
    label: "Forking dumpmail script to your GitHub",
    sublabel: "Forking repository into your account...",
  },
  {
    id: "secrets",
    label: "Injecting secrets to the GitHub Action",
    sublabel: "Writing SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and USER_ID into your fork's Actions secrets",
  },
];

export function SetupView({
  steps,
  forkLogin,
  forkError,
  hardError,
  isDone,
  sourceOwner,
  sourceRepo,
  userId,
  onRetry,
  onContinue,
}: {
  steps: StepState;
  forkLogin: string | null;
  forkError: string | null;
  hardError: string | null;
  isDone: boolean;
  sourceOwner: string;
  sourceRepo: string;
  userId: string | null;
  onRetry?: () => void;
  onContinue?: () => void;
}) {
  const hasForkError = !!forkError;
  const hasHardError = !!hardError;

  const forkUrl = `https://github.com/${sourceOwner}/${sourceRepo}/fork`;
  const forkedUrl = forkLogin ? `https://github.com/${forkLogin}/${sourceRepo}` : null;
  const secretsUrl = forkLogin
    ? `https://github.com/${forkLogin}/${sourceRepo}/settings/secrets/actions`
    : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  const secretRows: SecretRow[] = [
    { name: "SUPABASE_URL", value: supabaseUrl },
    { name: "SUPABASE_PUBLISHABLE_KEY", value: supabaseKey },
    { name: "USER_ID", value: userId ?? "" },
  ];

  const topStatus = hasHardError
    ? "error"
    : hasForkError
    ? "warn"
    : isDone
    ? "done"
    : "loading";

  return (
    <div className="sv-root">
      {/* Hero */}
      <div className="sv-hero">
        <div className={`sv-indicator ind-${topStatus}`}>
          {topStatus === "loading" && <span className="ind-spinner" />}
          {topStatus === "done" && <span className="ind-symbol">&#10003;</span>}
          {topStatus === "error" && <span className="ind-symbol">&#10005;</span>}
          {topStatus === "warn" && <span className="ind-symbol">!</span>}
        </div>

        <h1 className="sv-heading">
          {hasHardError
            ? "Setup failed"
            : hasForkError
            ? "Action needed"
            : isDone
            ? "You're all set"
            : "Setting up your account"}
        </h1>
        <p className="sv-sub">
          {hasHardError
            ? hardError
            : hasForkError
            ? "GitHub authentication worked, but we couldn't complete the repo setup automatically."
            : isDone
            ? "Redirecting you to your dashboard..."
            : "Just a moment - configuring your GitHub workflow."}
        </p>
      </div>

      {/* Steps */}
      <div className="sv-steps">
        {ITEMS.map((item, idx) => {
          const status = steps[item.id];
          const isActive = status === "active";
          const isDoneStep = status === "done";
          const isError = status === "error";
          const isIdle = status === "idle";

          return (
            <div key={item.id} className={`sv-step st-${status}`}>
              {idx > 0 && (
                <div className={`sv-vline vl-${steps[ITEMS[idx - 1].id]}`} />
              )}

              <div className="sv-badge">
                {isDoneStep && <span className="b-check">&#10003;</span>}
                {isError && <span className="b-x">&#10005;</span>}
                {isActive && <span className="b-spin" />}
                {isIdle && <span className="b-num">{idx + 1}</span>}
              </div>

              <div className="sv-content">
                <span className="sv-label">{item.label}</span>

                {isActive && item.id === "forking" && (
                  <span className="sv-detail sv-detail-muted">
                    Forking {sourceOwner}/{sourceRepo} into your account...
                  </span>
                )}
                {isActive && item.id !== "forking" && (
                  <span className="sv-detail sv-detail-muted">{item.sublabel}</span>
                )}

                {isDoneStep && item.id === "forking" && forkedUrl && (
                  <span className="sv-detail">
                    {"Forked -> "}
                    <a href={forkedUrl} target="_blank" rel="noopener noreferrer">
                      {forkLogin}/{sourceRepo}
                    </a>
                  </span>
                )}

                {isError && item.id === "forking" && (
                  <span className="sv-detail sv-detail-err">
                    Fork failed. Fork it manually -{">"}
                    {" "}
                    <a href={forkUrl} target="_blank" rel="noopener noreferrer">
                      {sourceOwner}/{sourceRepo}
                    </a>
                    {forkError && (
                      <span className="sv-err-reason"> ({forkError})</span>
                    )}
                  </span>
                )}

                {isError && item.id === "secrets" && (
                  <span className="sv-detail sv-detail-err">
                    Set the secrets manually in your fork.
                    {secretsUrl && (
                      <>
                        {" "}
                        <a href={secretsUrl} target="_blank" rel="noopener noreferrer">
                          Open secrets settings
                        </a>
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fork error banner with copyable secrets */}
      {hasForkError && (
        <div className="sv-banner">
          <p className="sv-banner-title">Fork manually &amp; set the secrets</p>
          <p className="sv-banner-body">
            Fork{" "}
            <a href={forkUrl} target="_blank" rel="noopener noreferrer">
              {sourceOwner}/{sourceRepo}
            </a>{" "}
            to your account, then add these secrets under{" "}
            <em>Settings {">"} Secrets and variables {">"} Actions</em>:
          </p>

          <SecretsReveal secrets={secretRows} />

          <div className="sv-banner-actions">
            <a href={forkUrl} target="_blank" rel="noopener noreferrer" className="sv-btn-ghost">
              Fork on GitHub
            </a>
            {secretsUrl && (
              <a href={secretsUrl} target="_blank" rel="noopener noreferrer" className="sv-btn-ghost">
                Add secrets
              </a>
            )}
            {onContinue && (
              <button className="sv-btn-solid" onClick={onContinue}>
                Continue to dashboard
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hard error retry */}
      {hasHardError && onRetry && (
        <button className="sv-retry" onClick={onRetry}>
          Go back &amp; try again
        </button>
      )}

      <style>{`
        .sv-root {
          width: 100%;
          max-width: 520px;
          margin: 0 auto;
        }

        .sv-hero { margin-bottom: 52px; }

        .sv-indicator {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          border: 1.5px solid hsl(240 4% 22%);
          background: hsl(240 5% 8%);
        }

        .ind-loading { border-color: hsl(234 55% 50%); }
        .ind-done    { border-color: hsl(145 50% 38%); background: hsl(145 20% 8%); }
        .ind-error   { border-color: hsl(345 60% 42%); background: hsl(345 20% 8%); }
        .ind-warn    { border-color: hsl(38 70% 42%);  background: hsl(38 20% 8%); }

        .ind-spinner {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid hsl(240 4% 28%);
          border-top-color: hsl(234 55% 62%);
          animation: sv-spin 0.8s linear infinite;
        }

        @keyframes sv-spin { to { transform: rotate(360deg); } }

        .ind-symbol { font-size: 17px; font-weight: 700; line-height: 1; }
        .ind-done .ind-symbol  { color: hsl(145 55% 50%); }
        .ind-error .ind-symbol { color: hsl(345 72% 58%); }
        .ind-warn .ind-symbol  { color: hsl(38 80% 55%); }

        .sv-heading {
          font-size: 28px;
          font-weight: 600;
          color: hsl(0 0% 92%);
          margin: 0 0 10px;
          letter-spacing: -0.5px;
          line-height: 1.15;
        }

        .sv-sub {
          font-size: 14px;
          color: hsl(0 0% 46%);
          margin: 0;
          line-height: 1.6;
          max-width: 400px;
        }

        .sv-steps { display: flex; flex-direction: column; }

        .sv-step {
          position: relative;
          display: flex;
          align-items: flex-start;
          gap: 18px;
          padding-bottom: 36px;
        }

        .sv-step:last-child { padding-bottom: 0; }

        .sv-vline {
          position: absolute;
          left: 19px;
          top: -36px;
          width: 1.5px;
          height: 36px;
          background: hsl(240 4% 18%);
          transition: background 0.4s;
        }

        .vl-done   { background: hsl(145 45% 28%); }
        .vl-error  { background: hsl(345 50% 28%); }
        .vl-active { background: hsl(234 40% 30%); }

        .sv-badge {
          width: 40px;
          height: 40px;
          min-width: 40px;
          border-radius: 50%;
          border: 1.5px solid hsl(240 4% 20%);
          background: hsl(240 5% 8%);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.35s;
          position: relative;
          z-index: 1;
        }

        .st-active .sv-badge { border-color: hsl(234 55% 52%); background: hsl(234 20% 11%); }
        .st-done   .sv-badge { border-color: hsl(145 50% 35%); background: hsl(145 18% 9%); }
        .st-error  .sv-badge { border-color: hsl(345 60% 38%); background: hsl(345 18% 9%); }

        .b-num   { font-size: 13px; font-weight: 600; color: hsl(0 0% 30%); }
        .b-check { font-size: 14px; font-weight: 700; color: hsl(145 55% 48%); }
        .b-x     { font-size: 14px; font-weight: 700; color: hsl(345 72% 58%); }

        .b-spin {
          display: block;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid hsl(240 4% 26%);
          border-top-color: hsl(234 55% 62%);
          animation: sv-spin 0.8s linear infinite;
        }

        .sv-content {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding-top: 9px;
        }

        .sv-label {
          font-size: 15px;
          font-weight: 500;
          color: hsl(0 0% 72%);
          line-height: 1.3;
          transition: color 0.3s;
        }

        .st-idle   .sv-label { color: hsl(0 0% 34%); font-weight: 400; }
        .st-active .sv-label { color: hsl(0 0% 88%); }
        .st-done   .sv-label { color: hsl(145 45% 52%); }
        .st-error  .sv-label { color: hsl(345 65% 60%); }

        .sv-detail {
          font-size: 12.5px;
          color: hsl(0 0% 40%);
          line-height: 1.55;
          animation: sv-fadein 0.25s ease both;
        }

        .sv-detail a { color: hsl(234 55% 62%); text-decoration: underline; text-underline-offset: 2px; }
        .sv-detail-muted { color: hsl(0 0% 36%); }
        .sv-detail-err { color: hsl(345 60% 55%); }
        .sv-detail-err a { color: hsl(345 60% 65%); }
        .sv-err-reason { color: hsl(0 0% 36%); font-size: 11.5px; }

        @keyframes sv-fadein {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .sv-banner {
          margin-top: 40px;
          padding: 22px 24px;
          border: 1px solid hsl(345 40% 24%);
          border-radius: 8px;
          background: hsl(345 12% 7%);
          animation: sv-fadein 0.3s ease both;
        }

        .sv-banner-title {
          font-size: 14px;
          font-weight: 600;
          color: hsl(345 65% 60%);
          margin: 0 0 10px;
        }

        .sv-banner-body {
          font-size: 13px;
          color: hsl(0 0% 48%);
          margin: 0 0 16px;
          line-height: 1.65;
        }

        .sv-banner-body a { color: hsl(234 55% 62%); text-decoration: underline; text-underline-offset: 2px; }
        .sv-banner-body em { font-style: normal; color: hsl(0 0% 55%); }

        .sv-banner-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        .sv-btn-ghost {
          display: inline-flex;
          align-items: center;
          height: 34px;
          padding: 0 14px;
          border: 1px solid hsl(240 4% 24%);
          border-radius: 5px;
          background: transparent;
          color: hsl(0 0% 60%);
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          text-decoration: none;
          transition: border-color 0.2s, color 0.2s;
        }
        .sv-btn-ghost:hover { border-color: hsl(240 4% 36%); color: hsl(0 0% 82%); }

        .sv-btn-solid {
          display: inline-flex;
          align-items: center;
          height: 34px;
          padding: 0 14px;
          border: 1px solid hsl(234 40% 36%);
          border-radius: 5px;
          background: hsl(234 28% 14%);
          color: hsl(234 60% 72%);
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .sv-btn-solid:hover { background: hsl(234 28% 18%); border-color: hsl(234 40% 46%); }

        .sv-retry {
          display: block;
          width: 100%;
          margin-top: 32px;
          height: 38px;
          background: transparent;
          border: 1px solid hsl(240 4% 20%);
          border-radius: 5px;
          color: hsl(0 0% 44%);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .sv-retry:hover { border-color: hsl(240 4% 32%); color: hsl(0 0% 64%); }
      `}</style>
    </div>
  );
}
