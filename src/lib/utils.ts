import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAppBaseUrl(): string {
  if (typeof window === "undefined") return ""
  return window.location.origin
}
