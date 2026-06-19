import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, CalendarDays, Keyboard } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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
  // text input mode: dd/mm/yyyy
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState(
    value ? (() => { const [y, m, d] = value.split('-'); return `${d}/${m}/${y}`; })() : ''
  );
  const [textError, setTextError] = useState('');

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
    const v = `${viewYear}-${mm}-${dd}`;
    setSelected(v);
    setTextInput(`${dd}/${mm}/${viewYear}`);
    setTextError('');
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

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleTextChange = (raw: string) => {
    // auto-insert slashes: dd/mm/yyyy
    let v = raw.replace(/[^0-9/]/g, '');
    if (raw.length > textInput.length) {
      if (v.length === 2 && !v.includes('/')) v = v + '/';
      else if (v.length === 5 && v.split('/').length === 2) v = v + '/';
    }
    setTextInput(v);
    setTextError('');

    // try to parse when full
    const parts = v.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      const dd = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10);
      const yy = parseInt(parts[2], 10);
      if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yy >= 2000 && yy <= 2100) {
        const dateStr = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        const d = new Date(dateStr + 'T00:00:00');
        if (!isNaN(d.getTime()) && d.getDate() === dd) {
          setSelected(dateStr);
          setViewYear(yy);
          setViewMonth(mm - 1);
          setTextError('');
          return;
        }
      }
      setTextError('Invalid date');
    }
  };

  const handleClear = () => {
    setSelected('');
    setTextInput('');
    setTextError('');
  };

  const handleSet = () => {
    if (textMode && textInput && !selected) {
      setTextError('Enter a valid date (DD/MM/YYYY)');
      return;
    }
    onConfirm(selected);
    onClose();
  };

  const headerDate = selectedParsed
    ? selectedParsed.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : 'No date selected';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl shadow-2xl overflow-hidden">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-0.5">{title}</p>
              <p className="text-lg font-bold text-gray-900">{headerDate}</p>
            </div>
            {/* Toggle calendar / keyboard */}
            <button
              type="button"
              onClick={() => setTextMode(t => !t)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
            >
              {textMode
                ? <CalendarDays className="w-4 h-4 text-gray-600" />
                : <Keyboard className="w-4 h-4 text-gray-600" />}
            </button>
          </div>
        </div>

        {textMode ? (
          /* ── Text input mode ── */
          <div className="px-5 py-5">
            <p className="text-xs text-gray-500 mb-2">Enter date manually</p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/YYYY"
              value={textInput}
              onChange={e => handleTextChange(e.target.value)}
              maxLength={10}
              autoFocus
              className="w-full h-12 px-4 border-2 rounded-xl text-lg font-semibold text-gray-900 outline-none tracking-widest"
              style={{ borderColor: textError ? '#EF4444' : selected ? '#3B82F6' : '#E5E7EB' }}
            />
            {textError && <p className="text-xs text-red-500 mt-1.5">{textError}</p>}
            {selected && !textError && (
              <p className="text-xs text-blue-500 font-medium mt-1.5">
                ✓ {selectedParsed?.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        ) : (
          /* ── Calendar mode ── */
          <>
            {/* Month nav */}
            <div className="flex items-center justify-between px-4 py-3">
              <button type="button" onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm font-bold text-gray-900">{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <button type="button" onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 px-3">
              {DAY_NAMES.map((d, i) => (
                <div key={i} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 px-3 pb-2 gap-y-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const sel = isSelected(day);
                const tod = isToday(day);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDay(day)}
                    className="mx-auto w-10 h-10 flex items-center justify-center rounded-full text-sm transition-colors active:opacity-70"
                    style={{
                      background: sel ? '#3B82F6' : tod ? '#EFF6FF' : 'transparent',
                      color: sel ? '#fff' : tod ? '#3B82F6' : '#374151',
                      fontWeight: sel || tod ? 700 : 400,
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-1 px-4 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClear}
            className="px-5 py-2.5 text-sm font-semibold text-gray-500 rounded-lg active:bg-gray-100"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-500 rounded-lg active:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSet}
            className="px-5 py-2.5 text-sm font-semibold text-blue-600 rounded-lg active:bg-blue-50"
          >
            Set
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Trigger button ───────────────────────────────────────────────────────────

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
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : '';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full h-[44px] px-3 flex items-center gap-2 bg-white border border-gray-200 rounded-[10px] text-[14px] text-left ${className}`}
      >
        <CalendarDays className="w-4 h-4 shrink-0" style={{ color: value ? '#3B82F6' : '#9CA3AF' }} />
        <span style={{ color: value ? '#111827' : '#9CA3AF' }}>{displayDate || placeholder}</span>
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
