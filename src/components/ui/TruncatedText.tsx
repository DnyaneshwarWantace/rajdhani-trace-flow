import { cn } from '@/lib/utils';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  showTooltip?: boolean;
  tooltipContent?: string;
  as?: 'p' | 'span' | 'div';
}

/**
 * TruncatedText Component
 * 
 * Displays text with truncation and optional tooltip for full text.
 * Uses native title attribute for tooltip (works everywhere).
 * 
 * @param text - The text to display
 * @param maxLength - Maximum characters before truncation (default: 50)
 * @param className - Additional CSS classes
 * @param showTooltip - Show tooltip with full text on hover (default: true if text is truncated)
 * @param tooltipContent - Custom tooltip content (defaults to full text)
 * @param as - HTML element to render (default: 'span')
 */
export function TruncatedText({
  text,
  maxLength = 50,
  className,
  showTooltip = true,
  tooltipContent,
  as: Component = 'span',
}: TruncatedTextProps) {
  if (!text) return null;
  
  const shouldTruncate = text.length > maxLength;
  const truncatedText = shouldTruncate ? `${text.slice(0, maxLength)}...` : text;
  const displayTooltip = showTooltip && shouldTruncate;

  return (
    <Component
      className={cn(
        'block',
        shouldTruncate && 'truncate',
        className
      )}
      title={displayTooltip ? (tooltipContent || text) : undefined}
    >
      {truncatedText}
    </Component>
  );
}

/**
 * Utility function to truncate text
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

