"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { enUS } from "../messages/en-US";
import { SessionOverview } from "./session-overview";
import { LiveStage } from "./live-stage";
import { demoPromotion, demoTopics } from "../lib/mock-live-os-data";

type Role = "host" | "ops";
type DemoState = { startedAt: number; issued: boolean };
const demoKey = "live-os-cream-demo-v1";

function readDemo(): DemoState {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(demoKey) ?? "null");
    if (value && typeof value === "object" && "startedAt" in value && "issued" in value && typeof value.startedAt === "number" && Number.isFinite(value.startedAt) && typeof value.issued === "boolean") return { startedAt: value.startedAt, issued: value.issued };
  } catch { /* Local storage may be unavailable. */ }
  return { startedAt: Date.now(), issued: false };
}

function saveDemo(value: DemoState) {
  try { localStorage.setItem(demoKey, JSON.stringify(value)); } catch { /* The current tab still works without storage. */ }
}

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
  children,
}: {
  className?: string;
  title: string;
  note: string;
  children?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`} aria-label={title} tabIndex={0}>
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      <div className="empty-state">
        {children || <p className="empty-note">{note}</p>}
      </div>
    </section>
  );
}

function Signals({ mockData }: { mockData: boolean }) {
  const examples: Record<(typeof metrics)[number][1], string> = {
    viewers: "1,284",
    clicks: "426",
    carts: "93",
    price: enUS.unavailable,
    stock: "พร้อมขาย",
  };
  return (
    <section className="panel signal-card" aria-labelledby="signals-heading" tabIndex={0}>
      <div className="section-heading">
        <h2 id="signals-heading">{enUS.signalsTitle}</h2>
      </div>
      <dl className="metrics-grid">
        {metrics.map(([label, key]) => (
          <div className="metric" key={key}>
            <dt className="metric-label">{label}</dt>
            <dd className="metric-value">{mockData ? examples[key] : <><span aria-hidden="true">—</span><span className="visually-hidden">{enUS.unavailable}</span></>}</dd>
          </div>
        ))}
      </dl>
      <p className="control-reason">{mockData ? "ตัวเลขจำลองสำหรับการสาธิต" : enUS.unavailable}</p>
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

function Guardrails({ mockData, commentCount, issued, onAccept }: { mockData: boolean; commentCount: number; issued: boolean; onAccept: () => void }) {
  const sample: Record<(typeof guardrails)[number][1], string> = {
    price: enUS.unavailable,
    discount: `${demoPromotion.discount_percent}%`,
    margin: enUS.unavailable,
    threshold: enUS.unavailable,
    "stock-check": "พร้อมขาย",
  };
  return (
    <section className="panel guardrail-card" aria-labelledby="guardrails-heading" tabIndex={0}>
      <div className="section-heading">
        <h2 id="guardrails-heading">{enUS.guardrailsTitle}</h2>
      </div>
      {mockData && <div className="promotion-recommendation" aria-live="polite">
        {issued ? <><strong>ส่งโปรโมชันให้ Host แล้ว</strong><p>จำลองการออกโปรครีมลด 15% เรียบร้อย</p></> : commentCount >= 3 ? <><strong>แนะนำโปรโมชันครีมลด 15%</strong><p>ผู้ชมถามหาโปรครีมต่อเนื่อง {commentCount} ข้อความ · ข้อมูลจำลอง</p><button className="demo-action" type="button" onClick={onAccept}>รับโปรและส่งให้ Host</button></> : <p>กำลังรอสัญญาณจากคอมเมนต์ผู้ชม…</p>}
      </div>}
      <dl className="guardrail-list">
        {guardrails.map(([label, key]) => (
          <div className="guardrail-row" key={key}>
            <dt>{label}</dt>
            <dd>{mockData ? sample[key] : enUS.unavailable}</dd>
          </div>
        ))}
      </dl>
      <p className="control-reason">{mockData ? "ข้อมูลจำลอง · ยังไม่มีการตรวจสอบนโยบายจริง" : enUS.noGuardrailCheck}</p>
    </section>
  );
}

export function LiveShell({ role, mockData = false }: { role: Role; mockData?: boolean }) {
  const isHost = role === "host";
  const [demo, setDemo] = useState<DemoState | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!mockData) return;
    const initial = readDemo();
    saveDemo(initial);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const initialize = window.setTimeout(() => { setDemo(initial); setNow(Date.now()); }, 0);
    const sync = (event: StorageEvent) => { if (event.key === demoKey) { setDemo(readDemo()); setNow(Date.now()); } };
    window.addEventListener("storage", sync);
    return () => { window.clearTimeout(initialize); window.clearInterval(timer); window.removeEventListener("storage", sync); };
  }, [mockData]);

  const commentCount = demo ? Math.min(99, Math.max(0, Math.floor((now - demo.startedAt) / 2000))) : 0;
  function updateDemo(next: DemoState) { saveDemo(next); setDemo(next); setNow(Date.now()); }
  const issuedPromotion = demo?.issued ? {
    promotion_id: demoPromotion.promotion_id, session_id: demoPromotion.session_id,
    product_id: demoPromotion.product_id, status: "issued", resource_version: 4,
    discount_percent: demoPromotion.discount_percent, margin_percent: null,
    policy_revision: demoPromotion.policy_revision, action_id: "action-demo-issued", mode: "SIMULATED",
  } : undefined;

  return (
    <div className={`app-frame ${isHost ? "app-frame--host" : "app-frame--ops"}`}>
      <header className="topbar">
        <p className="brand-name">{enUS.appName}</p>
        <nav className="role-switch" aria-label={enUS.chooseRole}>
          <Link href="/" aria-current={isHost ? "page" : undefined}>{enUS.hostShort}</Link>
          <Link href="/ops" aria-current={!isHost ? "page" : undefined}>{enUS.opsShort}</Link>
        </nav>
        {mockData && <button className="demo-reset" type="button" onClick={() => updateDemo({ startedAt: Date.now(), issued: false })}>เริ่มเดโมใหม่</button>}
      </header>

      <main>
        <h1 className="visually-hidden">{isHost ? enUS.hostRole : enUS.opsRole}</h1>
        <div className="shell-grid">
          <SessionOverview role={role} mockData={mockData} issued={Boolean(demo?.issued)} />
          <LiveStage mockData={mockData} commentCount={commentCount} promotion={isHost && mockData ? issuedPromotion : undefined} />
          <EmptyPanel className="topic-card" title={enUS.topicsTitle} note={enUS.topicsEmpty}>
            {mockData && <><ul>{demoTopics.map(({ label }) => <li key={label}>{label}</li>)}</ul><p className="empty-note">ตัวอย่างหัวข้อจำลองจากคอมเมนต์</p></>}
          </EmptyPanel>
          <Signals mockData={mockData} />
          {!isHost && (
            <>
              <Guardrails mockData={mockData} commentCount={commentCount} issued={Boolean(demo?.issued)} onAccept={() => { if (demo && commentCount >= 3) updateDemo({ ...demo, issued: true }); }} />
              <DisabledControls />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
