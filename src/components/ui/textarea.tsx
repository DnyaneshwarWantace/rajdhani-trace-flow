import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onFocus, onMouseDown, onClick, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement) => {
        textareaRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const handleSelectStart = (e: Event) => {
        // Prevent text selection
        e.preventDefault();
      };

      const handleMouseDown = (e: MouseEvent) => {
        // Prevent default selection behavior
        if (document.activeElement !== textarea) {
          e.preventDefault();
          setTimeout(() => {
            textarea.focus();
            if (textarea.value) {
              textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            }
          }, 0);
        }
      };

      const handleFocus = () => {
        // Place cursor at end on focus
        if (textarea.value) {
          setTimeout(() => {
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }, 0);
        }
      };

      const handleClick = () => {
        // Ensure cursor is at end after click
        if (textarea.value) {
          setTimeout(() => {
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }, 0);
        }
      };

      textarea.addEventListener('selectstart', handleSelectStart);
      textarea.addEventListener('mousedown', handleMouseDown);
      textarea.addEventListener('focus', handleFocus);
      textarea.addEventListener('click', handleClick);

      return () => {
        textarea.removeEventListener('selectstart', handleSelectStart);
        textarea.removeEventListener('mousedown', handleMouseDown);
        textarea.removeEventListener('focus', handleFocus);
        textarea.removeEventListener('click', handleClick);
      };
    }, []);

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setTimeout(() => {
        if (e.target.value) {
          e.target.setSelectionRange(e.target.value.length, e.target.value.length);
        }
      }, 0);
      onFocus?.(e);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      if (document.activeElement !== e.target) {
        e.preventDefault();
        setTimeout(() => {
          (e.target as HTMLTextAreaElement).focus();
        }, 0);
      }
      onMouseDown?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
      setTimeout(() => {
        if (e.target.value) {
          (e.target as HTMLTextAreaElement).setSelectionRange(
            e.target.value.length,
            e.target.value.length
          );
        }
      }, 0);
      onClick?.(e);
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary-600 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={combinedRef}
        onFocus={handleFocus}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
