import { useQuery } from "@tanstack/react-query"

import { fetchPage } from "../../api/paging.ts"
import type { StockRow } from "./types.ts"

export function useAvailableStock(warehouseId: string, productId: string) {
  const enabled = warehouseId !== "" && productId !== ""
  const query = useQuery({
    queryKey: ["stock", "available", warehouseId, productId],
    queryFn: () => fetchPage<StockRow>("/stock/", { warehouse: warehouseId, product: productId, page_size: 1 }),
    enabled,
  })
  if (!enabled) {
    return "—"
  }
  if (query.isPending) {
    return "Loading…"
  }
  if (query.isError) {
    return "Unavailable"
  }
  return query.data.results[0]?.available ?? "0.000"
}
