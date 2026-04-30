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
  ) {
    return value;
  }

  // Ignore bare filenames like "image51.jpg" to avoid noisy 404 requests.
  if (!value.includes('/')) return null;

  // Treat root-relative paths as app-hosted assets.
  if (value.startsWith('/')) return value;

  return null;
}

export function useDropdownVisualMaps() {
  const [colorCodeMap, setColorCodeMap] = useState<Record<string, string>>({});
  const [patternImageMap, setPatternImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await ProductService.getDropdownData();
        if (!mounted) return;

        const nextColorCodeMap: Record<string, string> = {};
        (data?.colors || []).forEach((item: any) => {
          if (item?.value && item?.color_code) {
            nextColorCodeMap[item.value] = item.color_code;
          }
        });
        setColorCodeMap(nextColorCodeMap);

        const nextPatternImageMap: Record<string, string> = {};
        (data?.patterns || []).forEach((item: any) => {
          const imageUrl = getSafeImageUrl(item?.image_url);
          if (item?.value && imageUrl) {
            nextPatternImageMap[item.value] = imageUrl;
          }
        });
        setPatternImageMap(nextPatternImageMap);
      } catch (error) {
        console.error('Failed to load dropdown visual maps:', error);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { colorCodeMap, patternImageMap };
}
