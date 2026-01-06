import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onFocus, onMouseDown, onClick, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = React.useCallback(
      (node: HTMLInputElement) => {
        inputRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    React.useEffect(() => {
      const input = inputRef.current;
      if (!input) return;

      const handleSelectStart = (e: Event) => {
        // Prevent text selection
        e.preventDefault();
      };

      const handleMouseDown = (e: MouseEvent) => {
        // Prevent default selection behavior
        if (document.activeElement !== input) {
          e.preventDefault();
          // Use setTimeout to ensure focus happens after browser's default behavior
          setTimeout(() => {
            input.focus();
            if (input.value) {
              input.setSelectionRange(input.value.length, input.value.length);
            }
          }, 0);
        }
      };

      const handleFocus = () => {
        // Place cursor at end on focus
        if (input.value) {
          setTimeout(() => {
            input.setSelectionRange(input.value.length, input.value.length);
          }, 0);
        }
      };

      const handleClick = () => {
        // Ensure cursor is at end after click
        if (input.value) {
          setTimeout(() => {
            input.setSelectionRange(input.value.length, input.value.length);
          }, 0);
        }
      };

      input.addEventListener('selectstart', handleSelectStart);
      input.addEventListener('mousedown', handleMouseDown);
      input.addEventListener('focus', handleFocus);
      input.addEventListener('click', handleClick);

      return () => {
        input.removeEventListener('selectstart', handleSelectStart);
        input.removeEventListener('mousedown', handleMouseDown);
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('click', handleClick);
      };
    }, []);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Prevent auto-selection, place cursor at end instead
      setTimeout(() => {
        if (e.target.value) {
          e.target.setSelectionRange(e.target.value.length, e.target.value.length);
        }
      }, 0);
      onFocus?.(e);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
      // Prevent auto-selection on click
      if (document.activeElement !== e.target) {
        e.preventDefault();
        setTimeout(() => {
          (e.target as HTMLInputElement).focus();
        }, 0);
      }
      onMouseDown?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      // Ensure cursor is at end after click
      setTimeout(() => {
        const target = e.target as HTMLInputElement;
        if (target.value) {
          target.setSelectionRange(
            target.value.length,
            target.value.length
          );
        }
      }, 0);
      onClick?.(e);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary-600 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors",
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
Input.displayName = "Input"

export { Input }
