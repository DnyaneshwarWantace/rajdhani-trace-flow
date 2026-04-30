import { useEffect, useState } from 'react';
import { ProductService } from '@/services/productService';

function getSafeImageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:')
  ) return value;
  if (!value.includes('/')) return null;
  if (value.startsWith('/')) return value;
  return null;
}

// Module-level cache — fetched once, shared across all component instances
let cache: { colorCodeMap: Record<string, string>; patternImageMap: Record<string, string> } | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

async function loadOnce() {
  if (cache) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const data = await ProductService.getDropdownData();
      const colorCodeMap: Record<string, string> = {};
      (data?.colors || []).forEach((item: any) => {
        if (item?.value && item?.color_code) colorCodeMap[item.value] = item.color_code;
      });
      const patternImageMap: Record<string, string> = {};
      (data?.patterns || []).forEach((item: any) => {
        const imageUrl = getSafeImageUrl(item?.image_url);
        if (item?.value && imageUrl) patternImageMap[item.value] = imageUrl;
      });
      cache = { colorCodeMap, patternImageMap };
    } catch (error) {
      console.error('Failed to load dropdown visual maps:', error);
      cache = { colorCodeMap: {}, patternImageMap: {} };
    } finally {
      inflight = null;
      listeners.forEach((fn) => fn());
    }
  })();

  return inflight;
}

const EMPTY = { colorCodeMap: {} as Record<string, string>, patternImageMap: {} as Record<string, string> };

export function useDropdownVisualMaps() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (cache) return;
    const notify = () => forceUpdate((n) => n + 1);
    listeners.add(notify);
    loadOnce();
    return () => { listeners.delete(notify); };
  }, []);

  return cache ?? EMPTY;
}

export function invalidateDropdownVisualMaps() {
  cache = null;
}
