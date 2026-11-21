import { enUS } from "../messages/en-US";
import { CouponBanner } from "./coupon-banner";

const sampleMessages = [
  { name: "Mina", message: "What colors are available?" },
  { name: "Kai", message: "This looks great!" },
  { name: "Nok", message: "Is the size adjustable?" },
];

type StageState = "loading" | "empty" | "partial" | "failed" | "ready";

export function LiveStage({ state = "ready", promotion }: { state?: StageState; promotion?: unknown }) {
  const stateCopy = {
    loading: "Loading simulated preview…",
    empty: "No simulated preview or chat messages available.",
    partial: "Partial simulated preview · Sample only",
    failed: "Simulated preview unavailable. No live connection was attempted.",
    ready: "",
  }[state];

  return (
    <section className="panel stage-card stage" aria-labelledby="stage-heading">
      <div className="stage__content">
        <div className="section-heading">
          <h2 id="stage-heading">{enUS.stageTitle}</h2>
          <span className="eyebrow">SIMULATED</span>
        </div>
        {stateCopy && <p role={state === "failed" ? "alert" : "status"}>{stateCopy}</p>}
        {promotion !== undefined && <CouponBanner promotion={promotion} />}
        {state !== "empty" && state !== "failed" && (
          <>
            <div aria-label="Simulated live preview" role="img">
              <span className="stage__mark" aria-hidden="true">▶</span>
              <p className="stage__title">Sample product showcase</p>
              <p className="empty-note">{enUS.stageRatio} · Demo content</p>
            </div>
            {state !== "loading" && (
              <section aria-labelledby="sample-chat-heading">
                <h3 id="sample-chat-heading">Sample chat</h3>
                <ul>
                  {(state === "partial" ? sampleMessages.slice(0, 1) : sampleMessages).map(({ name, message }) => (
                    <li key={name}><strong>{name}:</strong> {message}</li>
                  ))}
                </ul>
                <p className="control-reason">Fictional demo messages · No live connection</p>
              </section>
            )}
          </>
        )}
      </div>
    </section>
  );
}
