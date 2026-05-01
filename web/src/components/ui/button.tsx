import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { clsx } from "clsx";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost";
};

const baseClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "bg-zinc-950 text-white shadow-sm hover:bg-zinc-800 focus-visible:outline-zinc-950",
  secondary:
    "bg-white/75 text-zinc-950 ring-1 ring-zinc-950/10 backdrop-blur-xl hover:bg-white",
  ghost: "text-zinc-700 hover:bg-white/60",
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button className={clsx(baseClass, variants[variant], className)} {...props} />
  );
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: ButtonProps["variant"];
};

export function ButtonLink({
  href,
  children,
  className,
  variant = "primary",
}: ButtonLinkProps) {
  return (
    <Link href={href} className={clsx(baseClass, variants[variant], className)}>
      {children}
    </Link>
  );
}
