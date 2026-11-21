import { validatePromotion } from "./promotion-status";

export function CouponBanner({ promotion: rawPromotion }: { promotion?: unknown }) {
  const promotion = validatePromotion(rawPromotion);
  if (!promotion || promotion.status !== "issued" || promotion.mode !== "SIMULATED") return null;

  return (
    <aside aria-label="Simulated promotion" className="panel" role="status">
      <span className="eyebrow">SIMULATED · FICTIONAL PROMOTION</span>
      {promotion.product_id && <p>Product: {promotion.product_id}</p>}
      {typeof promotion.discount_percent === "number" && <p>{promotion.discount_percent}% off</p>}
    </aside>
  );
}
