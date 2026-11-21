import { validatePromotion } from "./promotion-status";

export function CouponBanner({ promotion: rawPromotion }: { promotion?: unknown }) {
  const promotion = validatePromotion(rawPromotion);
  if (!promotion || promotion.status !== "issued" || promotion.mode !== "SIMULATED") return null;

  return (
    <aside aria-label="โปรโมชันจำลอง" className="demo-coupon" role="status">
      <span>โปรโมชันจำลองสำหรับโฮสต์</span>
      <strong>ครีมลด {promotion.discount_percent}%</strong>
      <small>Ops อนุมัติและจำลองการออกโปรแล้ว</small>
    </aside>
  );
}
