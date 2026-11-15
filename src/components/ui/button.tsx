import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";

const variants = { default: "primary", outline: "outline", ghost: "ghost" };

export function Button({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={clsx("button", variants[variant], className)} {...props} />
  );
}
