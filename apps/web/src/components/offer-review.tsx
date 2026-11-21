import { validatePromotion } from "./promotion-status";

export function OfferReview({ promotion }: { promotion: unknown }) {
  const value = validatePromotion(promotion);

  return (
    <section className="panel" aria-labelledby="offer-review-heading">
      <h2 id="offer-review-heading">Offer review</h2>
      {!value ? <p role="alert">Promotion data unavailable.</p> : (
        <dl>
          <dt>Status</dt><dd>{value.status}</dd>
          <dt>Discount</dt><dd>{value.discount_percent === undefined ? "Unavailable" : `${value.discount_percent}%`}</dd>
          <dt>Margin</dt><dd>{value.margin_percent == null ? "Unavailable" : `${value.margin_percent}%`}</dd>
          <dt>Policy revision</dt><dd>{value.policy_revision ?? "Unavailable"}</dd>
          <dt>Mode</dt><dd>{value.mode}</dd>
        </dl>
      )}
    </section>
  );
}
