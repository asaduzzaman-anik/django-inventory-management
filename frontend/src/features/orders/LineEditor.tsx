import { Button } from "../../components/ui/Button.tsx"
import { Input } from "../../components/ui/Input.tsx"
import { Select } from "../../components/ui/Select.tsx"
import type { Product } from "../catalog/types.ts"
import { useAvailableStock } from "../inventory/useAvailableStock.ts"
import { emptyLine, type LineDraft } from "./lines.ts"

export function LineEditor({
  lines,
  products,
  warehouseId,
  priceLabel,
  priceKey,
  showAvailable,
  onChange,
}: {
  lines: LineDraft[]
  products: Product[]
  warehouseId: string
  priceLabel: string
  priceKey: "cost_price" | "selling_price"
  showAvailable?: boolean
  onChange: (lines: LineDraft[]) => void
}) {
  function update(index: number, patch: Partial<LineDraft>) {
    onChange(lines.map((line, itemIndex) => (itemIndex === index ? { ...line, ...patch } : line)))
  }

  return (
    <div className="space-y-3">
      {lines.map((line, index) => (
        <div key={line.key} className="grid gap-3 rounded-md border border-stone-200 bg-white p-3 sm:grid-cols-2">
          <Select
            label="Product"
            value={line.product}
            onChange={(event) => {
              const productId = event.target.value
              const product = products.find((item) => String(item.id) === productId)
              update(index, {
                product: productId,
                price: line.price || (product ? product[priceKey] : ""),
              })
            }}
          >
            <option value="">Choose a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.sku} {product.name}
              </option>
            ))}
          </Select>
          <Input label="Quantity" value={line.quantity} onChange={(event) => update(index, { quantity: event.target.value })} />
          <Input label={priceLabel} value={line.price} onChange={(event) => update(index, { price: event.target.value })} />
          {showAvailable ? <Available warehouseId={warehouseId} productId={line.product} quantity={line.quantity} /> : <div />}
          {lines.length > 1 ? (
            <Button type="button" variant="ghost" onClick={() => onChange(lines.filter((item) => item.key !== line.key))}>
              Remove line
            </Button>
          ) : null}
        </div>
      ))}
      <Button type="button" variant="ghost" onClick={() => onChange([...lines, emptyLine()])}>
        Add line
      </Button>
    </div>
  )
}

function Available({ warehouseId, productId, quantity }: { warehouseId: string; productId: string; quantity: string }) {
  const available = useAvailableStock(warehouseId, productId)
  const short = available !== "—" && available !== "Loading…" && available !== "Unavailable" && Number(quantity) > Number(available)
  return (
    <p className={`self-end text-sm ${short ? "text-red-700" : "text-stone-600"}`}>
      Available: {available}
      {short ? ". More than available." : ""}
    </p>
  )
}
