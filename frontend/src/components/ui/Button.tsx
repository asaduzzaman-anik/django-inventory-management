import type { ButtonHTMLAttributes } from "react"

const variants = {
  primary: "btn-primary",
  ghost: "btn-secondary",
  danger: "btn-danger",
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants
}

export function Button({ children, className = "", variant = "primary", ...props }: ButtonProps) {
  return (
    <button className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
