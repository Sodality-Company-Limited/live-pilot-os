export type StockStatus = "available" | "low" | "out_of_stock" | "unknown";

export type TopProduct = {
  product_id: string;
  name: string;
  interest_count: number;
  stock_status: StockStatus;
};

const stockLabels: Record<StockStatus, string> = {
  available: "พร้อมขาย",
  low: "สินค้าใกล้หมด",
  out_of_stock: "สินค้าหมด",
  unknown: "ไม่ทราบสถานะสต็อก",
};

export function ProductDetails({ product, locale }: { product?: TopProduct | null; locale?: string }) {
  if (!product) {
    return (
      <section className="panel" aria-live="polite" aria-label="รายละเอียดสินค้า">
        <div className="section-heading"><h2>รายละเอียดสินค้า</h2></div>
        <p className="empty-note">ไม่มีข้อมูลสินค้า</p>
      </section>
    );
  }

  const interests = new Intl.NumberFormat(locale).format(product.interest_count);
  const stockLabel = stockLabels[product.stock_status];

  return (
    <section className="panel" aria-labelledby="product-details-heading">
      <div className="section-heading"><h2 id="product-details-heading">รายละเอียดสินค้า</h2></div>
      <dl>
        <div><dt>สินค้า</dt><dd>{product.name}</dd></div>
        <div><dt>จำนวนผู้สนใจ</dt><dd>{interests}</dd></div>
        <div><dt>สต็อก</dt><dd aria-label={`สต็อก: ${stockLabel}`}>{stockLabel}</dd></div>
      </dl>
    </section>
  );
}
