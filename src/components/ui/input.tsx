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

      const handleMouseDown = (e: MouseEvent) => {
        // Allow double-click and triple-click selection (detail is click count)
        if (e.detail > 1) {
          return; // Let browser handle double/triple-click selection
        }

        // Prevent default selection behavior for single click only
        if (document.activeElement !== input) {
          e.preventDefault();
          // Use setTimeout to ensure focus happens after browser's default behavior
          setTimeout(() => {
            input.focus();
            // setSelectionRange doesn't work on number inputs
            if (input.value && input.type !== 'number') {
              try {
                input.setSelectionRange(input.value.length, input.value.length);
              } catch (e) {
                // Ignore errors for inputs that don't support selection
              }
            }
          }, 0);
        }
      };

      const handleFocus = () => {
        // Place cursor at end on focus (only for non-number inputs)
        if (input.value && input.type !== 'number') {
          setTimeout(() => {
            try {
              input.setSelectionRange(input.value.length, input.value.length);
            } catch (e) {
              // Ignore errors for inputs that don't support selection
            }
          }, 0);
        }
      };

      const handleClick = (e: MouseEvent) => {
        // Allow double-click and triple-click selection (detail is click count)
        if (e.detail > 1) {
          return; // Let browser handle double/triple-click selection
        }

        // Only move cursor to end if input was NOT already focused (i.e., first click)
        // If already focused, let user click anywhere to position cursor
        if (document.activeElement !== input) {
          // Ensure cursor is at end after single click only (only for non-number inputs)
          if (input.value && input.type !== 'number') {
            setTimeout(() => {
              try {
                input.setSelectionRange(input.value.length, input.value.length);
              } catch (e) {
                // Ignore errors for inputs that don't support selection
              }
            }, 0);
          }
        }
      };

      input.addEventListener('mousedown', handleMouseDown);
      input.addEventListener('focus', handleFocus);
      input.addEventListener('click', handleClick);

      return () => {
        input.removeEventListener('mousedown', handleMouseDown);
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('click', handleClick);
      };
    }, []);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Prevent auto-selection, place cursor at end instead (only for non-number inputs)
      setTimeout(() => {
        if (e.target.value && e.target.type !== 'number') {
          try {
            e.target.setSelectionRange(e.target.value.length, e.target.value.length);
          } catch (err) {
            // Ignore errors for number inputs that don't support selection
          }
        }
      }, 0);
      onFocus?.(e);
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLInputElement>) => {
      // Allow double-click and triple-click selection (detail is click count)
      if (e.detail > 1) {
        onMouseDown?.(e);
        return; // Let browser handle double/triple-click selection
      }

      // Prevent auto-selection on single click only
      if (document.activeElement !== e.target) {
        e.preventDefault();
        setTimeout(() => {
          (e.target as HTMLInputElement).focus();
        }, 0);
      }
      onMouseDown?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      // Allow double-click and triple-click selection (detail is click count)
      if (e.detail > 1) {
        onClick?.(e);
        return; // Let browser handle double/triple-click selection
      }

      // Only move cursor to end if input was NOT already focused (i.e., first click)
      // If already focused, let user click anywhere to position cursor
      if (document.activeElement !== e.target) {
        // Ensure cursor is at end after single click only (only for non-number inputs)
        setTimeout(() => {
          const target = e.target as HTMLInputElement;
          if (target.value && target.type !== 'number') {
            try {
              target.setSelectionRange(
                target.value.length,
                target.value.length
              );
            } catch (err) {
              // Ignore errors for number inputs that don't support selection
            }
          }
        }, 0);
      }
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
