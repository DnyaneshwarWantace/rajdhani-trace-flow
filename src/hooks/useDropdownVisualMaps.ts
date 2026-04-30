import { useEffect, useState } from 'react';
import { ProductService } from '@/services/productService';

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
          if (item?.value && item?.image_url) {
            nextPatternImageMap[item.value] = item.image_url;
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
