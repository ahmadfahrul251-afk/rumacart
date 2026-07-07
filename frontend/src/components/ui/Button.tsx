import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  children: ReactNode;
}

// Komponen tombol reusable — supaya style tombol konsisten di seluruh app
// tanpa copy-paste className berulang kali.
export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  const variantClass = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    outline: "btn-outline",
    ghost: "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-medium text-ink hover:bg-accent transition",
  }[variant];

  return (
    <button className={cn(variantClass, className)} {...props}>
      {children}
    </button>
  );
}
