import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Base URL for QR links: matches where the app is currently running.
 * - If you're on .../v2/... (e.g. localhost:3000/v2 or rajdhani.wantace.com/v2), returns origin + /v2.
 * - If you're at root (e.g. localhost:3000/ or example.com/), returns origin only.
 * Uses window.location so local stays http and production stays https.
 */
export function getAppBaseUrl(): string {
  if (typeof window === "undefined") return ""
  const origin = window.location.origin
  const pathname = window.location.pathname
  if (pathname.startsWith("/v2")) return `${origin}/v2`
  return origin
}
