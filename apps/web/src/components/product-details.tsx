export type StockStatus = "available" | "low" | "out_of_stock" | "unknown";

export type TopProduct = {
  product_id: string;
  name: string;
  interest_count: number;
  stock_status: StockStatus;
};

const stockLabels: Record<StockStatus, string> = {
  available: "Available",
  low: "Low stock",
  out_of_stock: "Out of stock",
  unknown: "Stock status unavailable",
};

export function ProductDetails({ product, locale }: { product?: TopProduct | null; locale?: string }) {
  if (!product) {
    return (
      <section className="panel" aria-live="polite" aria-label="Product details">
        <div className="section-heading"><h2>Product details</h2></div>
        <p className="empty-note">Product details are unavailable.</p>
      </section>
    );
  }

  const interests = new Intl.NumberFormat(locale).format(product.interest_count);
  const stockLabel = stockLabels[product.stock_status];

  return (
    <section className="panel" aria-labelledby="product-details-heading">
      <div className="section-heading"><h2 id="product-details-heading">Product details</h2></div>
      <dl>
        <div><dt>Product</dt><dd>{product.name}</dd></div>
        <div><dt>Interest</dt><dd>{interests}</dd></div>
        <div><dt>Stock</dt><dd aria-label={`Stock: ${stockLabel}`}>{stockLabel}</dd></div>
      </dl>
    </section>
  );
}
