import type { ButtonHTMLAttributes } from "react"

const variants = {
  primary: "bg-teal-800 text-white hover:bg-teal-900",
  ghost: "bg-white text-stone-800 ring-1 ring-stone-300 hover:bg-stone-50",
  danger: "bg-red-800 text-white hover:bg-red-900",
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
}

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
