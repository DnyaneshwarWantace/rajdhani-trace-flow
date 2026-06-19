import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MobileDatePickerSheetProps {
  value: string; // yyyy-mm-dd or ''
  onConfirm: (value: string) => void;
  onClose: () => void;
  title?: string;
}

export function MobileDatePickerSheet({
  value,
  onConfirm,
  onClose,
  title = 'Select Date',
}: MobileDatePickerSheetProps) {
  const today = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : today.getMonth());
  const [selected, setSelected] = useState(value || '');

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setSelected(`${viewYear}-${mm}-${dd}`);
  };

  const selectedParsed = selected ? new Date(selected + 'T00:00:00') : null;
  const isSelected = (day: number) =>
    selectedParsed &&
    selectedParsed.getFullYear() === viewYear &&
    selectedParsed.getMonth() === viewMonth &&
    selectedParsed.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const headerDate = selectedParsed
    ? selectedParsed.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
    : 'No date selected';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative rounded-t-2xl overflow-hidden" style={{ background: '#1C2333' }}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4" style={{ background: '#2D3748' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#90CDF4' }}>{title}</p>
          <p className="text-3xl font-bold text-white">{headerDate}</p>
          <p className="text-sm mt-0.5" style={{ color: '#90CDF4' }}>{viewYear}</p>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3">
          <button type="button" onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-sm font-bold text-white">{MONTH_NAMES[viewMonth]} {viewYear}</span>
          <button type="button" onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-white/10">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 px-3">
          {DAY_NAMES.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-bold py-1" style={{ color: '#718096' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const sel = isSelected(day);
            const tod = isToday(day);
            return (
              <button
                key={i}
                type="button"
                onClick={() => selectDay(day)}
                className="mx-auto w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-colors active:opacity-70"
                style={{
                  background: sel ? '#3B82F6' : 'transparent',
                  color: sel ? '#fff' : tod ? '#90CDF4' : '#E2E8F0',
                  fontWeight: sel || tod ? 700 : 400,
                }}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-4 border-t"
          style={{ borderColor: '#2D3748' }}
        >
          <button
            type="button"
            onClick={() => { setSelected(''); }}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg active:opacity-70"
            style={{ color: '#90CDF4' }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg active:opacity-70"
            style={{ color: '#90CDF4' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(selected); onClose(); }}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg active:opacity-70"
            style={{ color: '#90CDF4' }}
          >
            Set
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Trigger button — tap to open the sheet ──────────────────────────────────

interface MobileDateFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  title?: string;
  className?: string;
}

export function MobileDateField({
  value,
  onChange,
  placeholder = 'Select date',
  title,
  className = '',
}: MobileDateFieldProps) {
  const [open, setOpen] = useState(false);

  const displayDate = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : '';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full h-[44px] px-3 flex items-center bg-white border border-gray-200 rounded-[10px] text-[14px] text-left ${className}`}
        style={{ color: value ? '#111827' : '#9CA3AF' }}
      >
        {displayDate || placeholder}
      </button>

      {open && (
        <MobileDatePickerSheet
          value={value}
          onConfirm={onChange}
          onClose={() => setOpen(false)}
          title={title}
        />
      )}
    </>
  );
}
