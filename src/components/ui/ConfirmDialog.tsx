import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
}: ConfirmDialogProps) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const Icon = variant === 'info' ? Info : AlertTriangle;

  const iconBg = variant === 'danger' ? '#FEF2F2' : variant === 'warning' ? '#FFFBEB' : '#EFF6FF';
  const iconColor = variant === 'danger' ? '#DC2626' : variant === 'warning' ? '#D97706' : '#2563EB';
  const confirmBg = variant === 'danger' ? '#DC2626' : variant === 'warning' ? '#D97706' : '#2563EB';
  const confirmHoverBg = variant === 'danger' ? '#B91C1C' : variant === 'warning' ? '#B45309' : '#1D4ED8';

  // ── MOBILE BOTTOM SHEET ──
  const mobileSheet = isOpen ? (
    <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-t-[22px] px-5 pt-3 pb-8"
        onClick={e => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconBg }}>
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
          <p className="text-[16px] font-extrabold text-gray-900">{title}</p>
        </div>

        {/* Description */}
        <p className="text-[13.5px] text-gray-500 leading-relaxed whitespace-pre-line mb-5">
          {description}
        </p>

        {/* Buttons */}
        <div className="flex gap-2.5">
          <button onClick={onClose} disabled={isLoading}
            className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-[14px] font-bold text-gray-600 transition-colors active:bg-gray-50">
            {cancelText}
          </button>
          <button onClick={onConfirm} disabled={isLoading}
            className="flex-[1.5] py-3.5 rounded-xl text-[14px] font-bold text-white flex items-center justify-center gap-2 transition-colors"
            style={{ backgroundColor: isLoading ? '#9CA3AF' : confirmBg }}>
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              : confirmText}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Desktop
  const buttonVariants = { danger: 'destructive', warning: 'default', info: 'default' } as const;
  const buttonClasses = {
    danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-700',
    warning: '',
    info: '',
  };

  return (
    <>
      {createPortal(mobileSheet, document.body)}

      <Dialog open={isOpen && !isMobile} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-2 ${variant === 'danger' ? 'bg-red-100' : variant === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                <Icon className={`w-5 h-5 ${variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-yellow-600' : 'text-blue-600'}`} />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                <DialogDescription className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button type="button" variant={buttonVariants[variant]} onClick={onConfirm}
              disabled={isLoading} className={buttonClasses[variant]}>
              {isLoading ? 'Processing...' : confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
