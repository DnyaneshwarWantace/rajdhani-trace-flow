import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Plus, X, Search, ChevronRight, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export interface SheetOption {
  value: string;
  label?: string;
  colorCode?: string | null;
  isActive?: boolean;
  id?: string;
  isUsed?: boolean;
}

interface MobileOptionSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  options: SheetOption[];
  selected: string;
  onSelect: (value: string) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  onToggleActive?: (opt: SheetOption) => void;
  onDelete?: (opt: SheetOption) => void;
}

export function MobileOptionSheet({
  open, onClose, title, options, selected, onSelect, onAddNew, addNewLabel,
  onToggleActive, onDelete,
}: MobileOptionSheetProps) {
  const [q, setQ] = useState('');
  const [managing, setManaging] = useState(false);
  const canManage = !!(onToggleActive || onDelete);

  useEffect(() => {
    if (!open) { setQ(''); setManaging(false); }
  }, [open]);

  const filtered = useMemo(() => {
    // Always show all options (active first, inactive last) — matches RN app
    const active = options.filter(o => o.isActive !== false);
    const inactive = options.filter(o => o.isActive === false);
    const all = [...active, ...inactive];
    const withSearch = q
      ? all.filter(o => (o.label || o.value).toLowerCase().includes(q.toLowerCase()))
      : all;
    if (managing) return withSearch;
    // selected first when not managing
    const idx = withSearch.findIndex(o => o.value === selected);
    if (idx <= 0) return withSearch;
    return [withSearch[idx], ...withSearch.slice(0, idx), ...withSearch.slice(idx + 1)];
  }, [options, q, selected, managing]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      {/* Sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white flex flex-col"
        style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center px-4 py-4 border-b border-gray-100 flex-shrink-0 gap-3">
          <span className="text-[17px] font-bold text-gray-900 flex-1">{title}</span>
          {canManage && (
            <button
              onClick={() => setManaging(m => !m)}
              className="text-sm font-semibold"
              style={{ color: managing ? '#ef4444' : '#6b7280' }}
            >
              {managing ? 'Done' : 'Manage'}
            </button>
          )}
          <button onClick={onClose} className="text-blue-600 text-sm font-semibold">Close</button>
        </div>

        {/* Search (if >6 options) */}
        {options.length > 6 && (
          <div className="px-4 pt-3 flex-shrink-0">
            <div className="flex items-center bg-gray-100 rounded-xl px-3 h-10 gap-2">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}…`}
                className="flex-1 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
              />
              {q && <button onClick={() => setQ('')}><X className="w-4 h-4 text-gray-400" /></button>}
            </div>
          </div>
        )}

        {/* Add new button — hidden in manage mode */}
        {onAddNew && !managing && (
          <div className="px-4 pt-3 flex-shrink-0">
            <button
              onClick={() => { onAddNew(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-200 text-sm font-semibold text-blue-600"
              style={{ backgroundColor: 'rgba(37,99,235,0.06)' }}
            >
              <Plus className="w-4 h-4" />
              {addNewLabel || `Add new ${title.toLowerCase()}`}
            </button>
          </div>
        )}

        {/* Options list */}
        <div className="flex-1 overflow-y-auto py-2 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No options</p>
          ) : (
            filtered.map(opt => {
              const isSelected = selected === opt.value;
              const label = opt.label || opt.value;
              const inactive = opt.isActive === false;

              return (
                <div
                  key={opt.value}
                  className="flex items-center border-b border-gray-50"
                  style={{ backgroundColor: isSelected && !managing ? 'rgba(37,99,235,0.06)' : undefined, opacity: inactive ? 0.5 : 1 }}
                >
                  {/* Left: selectable area (inactive = not selectable) */}
                  <button
                    className="flex-1 flex items-center px-4 py-3 text-left active:bg-gray-50 min-w-0"
                    onClick={() => {
                      if (managing || inactive) return;
                      onSelect(opt.value);
                      onClose();
                    }}
                    disabled={managing || inactive}
                  >
                    {opt.colorCode && (
                      <span className="w-6 h-6 rounded-full border border-gray-200 flex-shrink-0 mr-3" style={{ backgroundColor: opt.colorCode }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="block text-[14.5px] font-medium truncate" style={{ color: isSelected && !managing ? '#2563eb' : '#1a1a1a' }}>
                        {label}
                      </span>
                      {inactive && (
                        <span className="text-[10px] text-gray-400">{managing ? 'Inactive' : 'Inactive · activate in Manage'}</span>
                      )}
                    </div>
                    {isSelected && !managing && <Check className="w-[18px] h-[18px] text-blue-600 flex-shrink-0 ml-2" />}
                  </button>

                  {/* Right: manage buttons */}
                  {managing && (
                    <div className="flex items-center pr-3 gap-1 flex-shrink-0">
                      {onToggleActive && (
                        <button
                          onClick={() => onToggleActive(opt)}
                          className="p-2 rounded-lg active:bg-gray-100"
                        >
                          {inactive
                            ? <ToggleLeft className="w-6 h-6 text-gray-400" />
                            : <ToggleRight className="w-6 h-6 text-green-500" />
                          }
                        </button>
                      )}
                      {onDelete && !opt.isUsed && (
                        <button
                          onClick={() => onDelete(opt)}
                          className="p-2 rounded-lg active:bg-red-50"
                        >
                          <Trash2 className="w-[18px] h-[18px] text-red-500" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Mobile trigger button that looks like RN's selector row */
export function MobileSelectTrigger({
  value, placeholder, hasError, onClick,
}: {
  value: string; placeholder: string; hasError?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between h-[46px] rounded-xl border bg-white px-4 text-left"
      style={{ borderColor: hasError ? '#ef4444' : '#e5e7eb' }}
    >
      <span className="text-[15px]" style={{ color: value ? '#111827' : '#9ca3af' }}>
        {value || placeholder}
      </span>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );
}
