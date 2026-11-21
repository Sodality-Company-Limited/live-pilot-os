import { enUS } from "../messages/en-US";
import { CouponBanner } from "./coupon-banner";

const sampleMessages = [
  { name: "Mina", message: "What colors are available?" },
  { name: "Kai", message: "This looks great!" },
  { name: "Nok", message: "Is the size adjustable?" },
];

type StageState = "loading" | "empty" | "partial" | "failed" | "ready";

export function LiveStage({ state = "ready", promotion, mockData = false, commentCount = 0 }: { state?: StageState; promotion?: unknown; mockData?: boolean; commentCount?: number }) {
  const stateCopy = {
    loading: "Loading simulated preview…",
    empty: "No simulated preview or chat messages available.",
    partial: "Partial simulated preview · Sample only",
    failed: "Simulated preview unavailable. No live connection was attempted.",
    ready: "",
  }[state];

  return (
    <>
    <section className="panel stage-card stage" aria-labelledby="stage-heading">
        <div className="section-heading">
          <h2 id="stage-heading">{enUS.stageTitle}</h2>
          <span className="eyebrow">จำลอง</span>
        </div>
        {stateCopy && <p role={state === "failed" ? "alert" : "status"}>{stateCopy}</p>}
        {state !== "empty" && state !== "failed" && (
          mockData ? <div className="stage-media"><video className="stage-video" src="/demo/cream-9x16-30s.mp4" controls muted loop playsInline preload="metadata" aria-label="วิดีโอไลฟ์ครีมจำลอง" />{promotion !== undefined && <CouponBanner promotion={promotion} />}</div> : <div aria-label="Simulated live preview" role="img">
              <span className="stage__mark" aria-hidden="true">▶</span>
              <p className="stage__title">Sample product showcase</p>
              <p className="empty-note">{enUS.stageRatio} · Demo content</p>
            </div>
        )}
    </section>
    {state !== "loading" && state !== "empty" && state !== "failed" && (
      <section className="panel stage-chat-card" aria-labelledby="sample-chat-heading">
                <div className="section-heading"><h2 id="sample-chat-heading">คอมเมนต์ผู้ชม</h2><span className="eyebrow">จำลอง · {commentCount} ข้อความ</span></div>
                <ul className="chat-list" aria-live="polite" aria-relevant="additions">
                  {(mockData ? Array.from({ length: Math.min(commentCount, 8) }, (_, index) => {
                    const number = commentCount - index;
                    const messages = ["ขอโปรครีมหน่อยค่ะ", "ครีมตัวนี้มีส่วนลดไหมคะ", "อยากได้โปรครีมช่วงไลฟ์ค่ะ", "มีโค้ดส่วนลดครีมไหม", "รอโปรครีมอยู่นะคะ", "ช่วยจัดโปรครีมให้หน่อยค่ะ", "ครีมลดได้อีกไหมคะ", "สนใจครีม ขอโปรหน่อยค่ะ"];
                    const names = ["มิน", "ฟ้า", "นก", "เมย์", "บีม", "อิง", "พลอย", "แก้ม"];
                    return { name: names[(number - 1) % names.length], message: messages[(number - 1) % messages.length], key: number };
                  }) : (state === "partial" ? sampleMessages.slice(0, 1) : sampleMessages).map((message, index) => ({ ...message, key: index }))).map(({ name, message, key }) => (
                    <li key={key}><strong>{name}</strong><span>{message}</span></li>
                  ))}
                </ul>
                <p className="control-reason">คอมเมนต์จำลอง · ไม่มีการเชื่อมต่อไลฟ์จริง</p>
      </section>
    )}
    </>
  );
}
