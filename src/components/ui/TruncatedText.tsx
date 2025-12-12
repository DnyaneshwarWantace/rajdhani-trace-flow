import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
 * Displays text with truncation and fast tooltip for full text.
 * Uses Radix UI Tooltip for instant display (300ms delay).
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

  if (!displayTooltip) {
    return (
      <Component className={cn('inline', className)}>
        {truncatedText}
      </Component>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Component
            className={cn(
              'inline cursor-help',
              className
            )}
          >
            {truncatedText}
          </Component>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs break-words">
          <p>{tooltipContent || text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Utility function to truncate text
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

