"use client";

import { ProductPageHeader } from "@/components/ProductPageHeader";
import { useT } from "@/lib/i18n";

export function ExchangePageHeader() {
  const t = useT("home");
  return (
    <ProductPageHeader
      eyebrow="EXCHANGE"
      title="Carbadia Exchange"
      description={t.exCardDesc}
    />
  );
}
