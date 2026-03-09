import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Base URL for QR links: app is served at root (no /v2).
 * Returns origin so local stays http and production stays https.
 */
export function getAppBaseUrl(): string {
  if (typeof window === "undefined") return ""
  return window.location.origin
}
