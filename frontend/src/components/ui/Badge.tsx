const tones: Record<string, string> = {
  active: "badge-success",
  inactive: "badge-secondary",
  "in stock": "badge-success",
  low: "badge-warning",
  out: "badge-danger",
  draft: "badge-secondary",
  confirmed: "badge-info",
  submitted: "badge-info",
  approved: "badge-success",
  processing: "badge-warning",
  completed: "badge-success",
  received: "badge-success",
  "partially received": "badge-warning",
  cancelled: "badge-danger",
  unpaid: "badge-danger",
  partial: "badge-warning",
  paid: "badge-success",
}

export function Badge({ children }: { children: string }) {
  return <span className={tones[children.toLowerCase()] ?? "badge"}>{children}</span>
}
