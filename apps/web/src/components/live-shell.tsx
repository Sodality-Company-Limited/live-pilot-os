import Link from "next/link";
import { enUS } from "../messages/en-US";
import { SessionOverview } from "./session-overview";
import { LiveStage } from "./live-stage";

type Role = "host" | "ops";

const metrics = [
  [enUS.viewers, "viewers"],
  [enUS.clicks, "clicks"],
  [enUS.addToCart, "carts"],
  [enUS.price, "price"],
  [enUS.stock, "stock"],
] as const;

const guardrails = [
  [enUS.proposedPrice, "price"],
  [enUS.discount, "discount"],
  [enUS.margin, "margin"],
  [enUS.threshold, "threshold"],
  [enUS.stockCheck, "stock-check"],
] as const;

function EmptyPanel({
  className = "",
  title,
  note,
}: {
  className?: string;
  title: string;
  note: string;
}) {
  return (
    <section className={`panel ${className}`} aria-label={title} tabIndex={0}>
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      <div className="empty-state">
        <p className="empty-note">{note}</p>
      </div>
    </section>
  );
}

function Signals() {
  return (
    <section className="panel signal-card" aria-labelledby="signals-heading" tabIndex={0}>
      <div className="section-heading">
        <h2 id="signals-heading">{enUS.signalsTitle}</h2>
      </div>
      <dl className="metrics-grid">
        {metrics.map(([label, key]) => (
          <div className="metric" key={key}>
            <dt className="metric-label">{label}</dt>
            <dd className="metric-value">
              <span aria-hidden="true">—</span>
              <span className="visually-hidden">{enUS.unavailable}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="control-reason">{enUS.unavailable}</p>
    </section>
  );
}

function DisabledControls() {
  return (
    <section className="panel controls-card" aria-labelledby="controls-heading" tabIndex={0}>
      <div className="section-heading">
        <h2 id="controls-heading">{enUS.controlsTitle}</h2>
      </div>
      <div className="control-list">
        {[enUS.start, enUS.pause, enUS.replay, enUS.reset].map((label) => (
          <button className="disabled-control" disabled key={label} type="button">
            {label}
          </button>
        ))}
      </div>
      <p className="control-reason">{enUS.controlsUnavailable}</p>
    </section>
  );
}

function Guardrails() {
  return (
    <section className="panel guardrail-card" aria-labelledby="guardrails-heading" tabIndex={0}>
      <div className="section-heading">
        <h2 id="guardrails-heading">{enUS.guardrailsTitle}</h2>
      </div>
      <dl className="guardrail-list">
        {guardrails.map(([label, key]) => (
          <div className="guardrail-row" key={key}>
            <dt>{label}</dt>
            <dd>{enUS.unavailable}</dd>
          </div>
        ))}
      </dl>
      <p className="control-reason">{enUS.noGuardrailCheck}</p>
    </section>
  );
}

export function LiveShell({ role }: { role: Role }) {
  const isHost = role === "host";

  return (
    <div className={`app-frame ${isHost ? "app-frame--host" : "app-frame--ops"}`}>
      <header className="topbar">
        <p className="brand-name">{enUS.appName}</p>
        <nav className="role-switch" aria-label={enUS.chooseRole}>
          <Link href="/" aria-current={isHost ? "page" : undefined}>{enUS.hostShort}</Link>
          <Link href="/ops" aria-current={!isHost ? "page" : undefined}>{enUS.opsShort}</Link>
        </nav>
      </header>

      <main>
        <h1 className="visually-hidden">{isHost ? enUS.hostRole : enUS.opsRole}</h1>
        <div className="shell-grid">
          <SessionOverview role={role} />
          <LiveStage />
          <EmptyPanel className="topic-card" title={enUS.topicsTitle} note={enUS.topicsEmpty} />
          <Signals />
          {!isHost ? (
            <>
              <Guardrails />
              <DisabledControls />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
