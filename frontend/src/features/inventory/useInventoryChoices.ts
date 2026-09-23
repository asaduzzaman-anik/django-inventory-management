import { useQuery } from "@tanstack/react-query"

import { fetchPage } from "../../api/paging.ts"
import type { Product } from "../catalog/types.ts"
import type { Warehouse } from "../warehouses/types.ts"

export function useInventoryChoices() {
  const warehouses = useQuery({
    queryKey: ["warehouses", "options", "active"],
    queryFn: () => fetchPage<Warehouse>("/warehouses/", { is_active: true, page_size: 100, ordering: "name" }),
  })
  const products = useQuery({
    queryKey: ["products", "options", "active"],
    queryFn: () => fetchPage<Product>("/products/", { is_active: true, page_size: 100, ordering: "name" }),
  })
  return { warehouses, products }
}
