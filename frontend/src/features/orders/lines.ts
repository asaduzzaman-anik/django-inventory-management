export type LineDraft = {
  key: string
  product: string
  quantity: string
  price: string
}

let nextKey = 1

export function emptyLine(): LineDraft {
  nextKey += 1
  return { key: String(nextKey), product: "", quantity: "", price: "" }
}

export function lineIssues(lines: LineDraft[], priceLabel: string) {
  if (!lines.length) {
    return "Add at least one line."
  }
  const seen = new Set<string>()
  for (const line of lines) {
    if (!line.product) {
      return "Choose a product on every line."
    }
    if (seen.has(line.product)) {
      return "Each product can appear only once."
    }
    seen.add(line.product)
    if (!(Number(line.quantity) > 0)) {
      return "Quantity must be greater than zero."
    }
    if (line.price.trim() === "" || Number(line.price) < 0) {
      return `${priceLabel} cannot be negative.`
    }
  }
  return ""
}
