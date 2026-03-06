import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

// Global counter to track how many dialogs are open (for nested dialogs)
const incrementDialogCount = () => {
  const currentCount = parseInt(
    document.documentElement.getAttribute("data-dialog-count") || "0",
    10
  )
  document.documentElement.setAttribute("data-dialog-count", String(currentCount + 1))
  return currentCount + 1
}

const decrementDialogCount = () => {
  const currentCount = parseInt(
    document.documentElement.getAttribute("data-dialog-count") || "0",
    10
  )
  const newCount = Math.max(0, currentCount - 1)
  document.documentElement.setAttribute("data-dialog-count", String(newCount))
  return newCount
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  React.useEffect(() => {
    // Increment dialog counter
    const count = incrementDialogCount()

    // Only set up scroll lock on FIRST dialog
    if (count === 1) {
      // Hide scrollbars and prevent background scrolling without shifting content
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
    }

    return () => {
      // Decrement dialog counter
      const newCount = decrementDialogCount()

      // Only remove scroll lock when ALL dialogs are closed
      if (newCount === 0) {
        document.body.style.overflow = ""
        document.documentElement.style.overflow = ""
      }
    }
  }, [])

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-[9998] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 overscroll-contain",
        className
      )}
      style={{ overscrollBehavior: "contain" }}
      onWheel={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      onTouchMove={(e) => {
        e.stopPropagation()
        e.preventDefault()
      }}
      {...props}
    />
  )
})
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** When true, children are rendered directly without the default scroll wrapper (use for custom layout with sticky header/footer). */
  customLayout?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, customLayout, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[9998] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border border-gray-200 bg-white shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh] overflow-hidden overscroll-contain",
        className
      )}
      style={{ overscrollBehavior: 'contain' }}
      {...props}
    >
      {customLayout ? (
        <>
          {children}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </>
      ) : (
        <>
          <div
            className="overflow-y-auto max-h-[85vh] overscroll-contain"
            style={{ overscrollBehavior: 'contain' }}
            onWheel={(e) => {
              e.stopPropagation();
              const target = e.currentTarget;
              const { scrollTop, scrollHeight, clientHeight } = target;
              const atTop = scrollTop <= 0 && e.deltaY < 0;
              const atBottom = scrollTop + clientHeight >= scrollHeight && e.deltaY > 0;
              if (atTop || atBottom) e.preventDefault();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="grid gap-4 px-6 py-6">
              {children}
            </div>
          </div>
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}

