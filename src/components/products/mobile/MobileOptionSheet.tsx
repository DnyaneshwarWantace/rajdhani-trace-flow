import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Check, ChevronDown, Search, Loader2, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { DropdownService } from '@/services/dropdownService';
import { uploadImageToR2 } from '@/services/imageService';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/utils/apiConfig';
import type { DropdownOption } from '@/types/dropdown';

export type SheetOption = {
  value: string;
  color_code?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  _id?: string;
  id?: string;
};

interface MobileOptionSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  opts: SheetOption[];
  current: string;
  onSelect: (v: string) => void;
  kind?: 'color' | 'pattern' | 'plain';
  category?: string;
  onAdded?: () => Promise<void>;
}

export function MobileOptionSheet({
  open, onClose, title, opts, current, onSelect, kind, category, onAdded,
}: MobileOptionSheetProps) {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [loadingManage, setLoadingManage] = useState(false);
  const [fullOpts, setFullOpts] = useState<DropdownOption[]>([]);
  const [loadingFull, setLoadingFull] = useState(false);
  const [usageMap, setUsageMap] = useState<Record<string, boolean>>({});
  const [newValue, setNewValue] = useState('');
  const [newColorCode, setNewColorCode] = useState('#FF6B6B');
  const [patternFile, setPatternFile] = useState<File | null>(null);
  const [patternPreview, setPatternPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DropdownOption | null>(null);

  // Fetch ALL opts (incl. inactive) when sheet opens
  useEffect(() => {
    if (open && category) {
      setLoadingFull(true);
      DropdownService.getDropdownsByCategory(category)
        .then(data => {
          const out = category === 'unit' ? data.filter(o => !/^rolls?$/i.test(o.value.trim())) : data;
          setFullOpts(out);
        })
        .catch(() => {})
        .finally(() => setLoadingFull(false));
    }
  }, [open, category]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQ(''); setComposerOpen(false); setManaging(false);
      setFullOpts([]); setLoadingFull(false); setUsageMap({});
      setNewValue(''); setPatternFile(null); setPatternPreview('');
      setConfirmDelete(null);
    }
  }, [open]);

  const displayOpts: SheetOption[] = fullOpts.length > 0
    ? fullOpts.map(o => ({ _id: o._id, id: o.id, value: o.value, color_code: o.color_code, image_url: o.image_url, is_active: o.is_active }))
    : opts;

  const filtered = useMemo(() => {
    const matched = displayOpts.filter(o => !q || o.value.toLowerCase().includes(q.toLowerCase()));
    const active = matched.filter(o => o.is_active !== false);
    const inactive = matched.filter(o => o.is_active === false);
    const combined = [...active, ...inactive];
    if (!current) return combined;
    const idx = combined.findIndex(o => o.value === current);
    if (idx <= 0) return combined;
    return [combined[idx], ...combined.slice(0, idx), ...combined.slice(idx + 1)];
  }, [displayOpts, q, current]);

  const toggleManage = async () => {
    if (!managing) {
      setLoadingManage(true);
      try {
        const token = localStorage.getItem('auth_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const [data, usageRes] = await Promise.all([
          DropdownService.getDropdownsByCategory(category!),
          fetch(`${getApiUrl()}/dropdowns/usage`, { headers }).then(r => r.ok ? r.json() : { data: {} }),
        ]);
        setFullOpts(data);
        setUsageMap(usageRes.data || {});
      } catch {} finally {
        setLoadingManage(false);
      }
    }
    setManaging(m => !m);
  };

  const flipInFull = (id: string) =>
    setFullOpts(prev => prev.map(o => (o.id === id || o._id === id) ? { ...o, is_active: !o.is_active } : o));

  const handleToggle = async (opt: SheetOption) => {
    const id = opt.id || opt._id;
    if (!id) return;
    flipInFull(id);
    try {
      await DropdownService.toggleActive(id);
      if (onAdded) await onAdded();
    } catch (e: any) {
      flipInFull(id);
      toast({ title: 'Error', description: e?.message || 'Failed to toggle', variant: 'destructive' });
    }
  };

  const handleDelete = async (opt: DropdownOption) => {
    const id = opt.id || opt._id;
    if (!id) return;
    setFullOpts(prev => prev.filter(o => o.id !== id && o._id !== id));
    if (current === opt.value) onSelect('');
    setConfirmDelete(null);
    try {
      await DropdownService.deleteDropdown(id);
      if (onAdded) await onAdded();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to delete', variant: 'destructive' });
      if (category) DropdownService.getDropdownsByCategory(category).then(setFullOpts).catch(() => {});
    }
  };

  const handleSave = async () => {
    const v = newValue.trim();
    if (!v || !category) return;
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (kind === 'pattern' && patternFile) {
        const res = await uploadImageToR2(patternFile, 'dropdowns');
        if (res.error || !res.url) { toast({ title: 'Error', description: res.error || 'Upload failed', variant: 'destructive' }); setSaving(false); return; }
        imageUrl = res.url;
      }
      const res = await DropdownService.addOption(category, v, undefined, imageUrl, kind === 'color' ? newColorCode : undefined);
      if (!res.success) { toast({ title: 'Error', description: res.error || 'Failed to add', variant: 'destructive' }); setSaving(false); return; }
      if (onAdded) await onAdded();
      onSelect(v);
      setComposerOpen(false);
      toast({ title: 'Added', description: `"${v}" added and selected` });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to add', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isUsed = (opt: SheetOption) => !category || usageMap[`${category}:${opt.value}`] === true;

  if (!open) return null;

  return (
    <>
      {/* Backdrop — does NOT close sheet (user must tap X or Close) */}
      <div className="fixed inset-0 z-[70] bg-black/40" />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[71] bg-white rounded-t-[22px] flex flex-col" style={{ maxHeight: '85dvh' }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 shrink-0">
          <p className="text-[17px] font-bold text-gray-900 flex-1">{title}</p>
          {category && (
            <button
              onClick={toggleManage}
              disabled={loadingManage}
              className={`flex items-center gap-1 text-[13px] font-semibold ${managing ? 'text-red-500' : 'text-gray-500'}`}
            >
              {loadingManage && <Loader2 className="w-3 h-3 animate-spin" />}
              {managing ? 'Done' : 'Manage'}
            </button>
          )}
          <button onClick={onClose} className="text-[14px] font-semibold text-blue-600 ml-1">
            Close
          </button>
        </div>

        {/* Search */}
        {opts.length > 8 && !composerOpen && (
          <div className="px-4 pt-3 shrink-0">
            <div className="flex items-center gap-2 h-11 px-3 bg-white border border-gray-200 rounded-[10px]">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                className="flex-1 bg-transparent text-[14.5px] outline-none text-gray-900 placeholder-gray-400"
                placeholder={`Search ${title.toLowerCase()}…`}
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              {q && (
                <button onClick={() => setQ('')} className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add new button */}
        {category && !composerOpen && !managing && (
          <div className="px-4 pt-3 shrink-0">
            <button
              onClick={() => setComposerOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-3 rounded-[10px] bg-[#E6F0FF] border border-[#B3D1FF] text-[13.5px] font-semibold text-[#0066FF]"
            >
              <Plus className="w-[15px] h-[15px]" />
              Add new {title.toLowerCase()}
            </button>
          </div>
        )}

        {/* Composer */}
        {composerOpen && (
          <div className="px-4 pt-3 shrink-0">
            <div className="bg-white border border-gray-200 rounded-[12px] p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-gray-900">New option</p>
                <button
                  onClick={() => { setComposerOpen(false); setNewValue(''); setPatternFile(null); setPatternPreview(''); }}
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <input
                autoFocus
                className="w-full h-[46px] rounded-[10px] border border-gray-200 bg-white px-[13px] text-[15px] outline-none text-gray-900 placeholder-gray-400 focus:border-blue-500"
                placeholder={kind === 'color' ? 'Color name (e.g. Beige, Sky Blue)' : 'Value'}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
              />
              {kind === 'color' && (
                <div className="space-y-2">
                  <HexColorPicker color={newColorCode} onChange={setNewColorCode} style={{ width: '100%', height: 150 }} />
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: newColorCode }} />
                    <HexColorInput color={newColorCode} onChange={setNewColorCode} prefixed
                      className="flex-1 h-[46px] rounded-[10px] border border-gray-200 px-3 text-[15px] uppercase outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}
              {kind === 'pattern' && (
                <div className="space-y-1.5">
                  <p className="text-[11.5px] text-gray-500">Pattern image (optional)</p>
                  <input type="file" accept="image/*" className="text-sm text-gray-600 w-full" onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setPatternFile(f);
                    if (!f) { setPatternPreview(''); return; }
                    const r = new FileReader();
                    r.onload = ev => setPatternPreview((ev.target?.result as string) || '');
                    r.readAsDataURL(f);
                  }} />
                  {patternPreview && <img src={patternPreview} alt="" className="w-12 h-12 rounded-[10px] object-cover border border-gray-200" />}
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving || !newValue.trim()}
                className="w-full h-[40px] rounded-[10px] bg-[#0066FF] text-[14px] font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save & Select'}
              </button>
            </div>
          </div>
        )}

        {/* Options list */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-9">
          {loadingFull && fullOpts.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[14px] text-gray-400 py-8">No options</p>
          ) : (
            filtered.map(opt => {
              const checked = current === opt.value;
              const inactive = opt.is_active === false;
              const used = isUsed(opt);
              const fullOpt = fullOpts.find(o => o.value === opt.value);

              return (
                <div
                  key={opt.value}
                  className={`flex items-center border-b border-[#F1F2F4] last:border-0 rounded-[10px] ${checked && !managing ? 'bg-[#E6F0FF]' : ''}`}
                >
                  {/* Selectable left area */}
                  <button
                    onClick={() => {
                      if (managing || inactive) return;
                      // Always just set the value — if same, clear; if different, replace (auto-deselects previous)
                      if (checked) {
                        onSelect('');
                        // Keep sheet open on deselect
                      } else {
                        onSelect(opt.value);
                        // Keep sheet open so user sees their selection, close on X
                      }
                    }}
                    className="flex-1 flex items-center gap-3 py-3 pl-3 pr-1 text-left min-w-0"
                    style={{ opacity: inactive ? 0.5 : 1, cursor: (managing || inactive) ? 'default' : 'pointer' }}
                  >
                    {kind === 'color' && opt.color_code && (
                      <div className="w-6 h-6 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: opt.color_code }} />
                    )}
                    {kind === 'pattern' && opt.image_url && (
                      <img src={opt.image_url} alt="" className="w-8 h-8 rounded-[6px] object-cover border border-gray-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className={`text-[14.5px] font-medium block ${checked && !managing ? 'text-[#0066FF] font-bold' : 'text-gray-900'}`}>
                        {opt.value}
                      </span>
                      {inactive && !managing && (
                        <span className="text-[10px] text-gray-400">Inactive · go to Manage to activate</span>
                      )}
                      {inactive && managing && (
                        <span className="text-[10px] text-gray-400">Inactive</span>
                      )}
                      {checked && !inactive && !managing && (
                        <span className="text-[11px] text-gray-400">tap to clear</span>
                      )}
                    </div>
                    {!managing && checked && (
                      <div className="flex items-center gap-1.5 pr-2 shrink-0">
                        <Check className="w-[18px] h-[18px] text-[#0066FF]" />
                      </div>
                    )}
                  </button>

                  {/* Manage buttons */}
                  {managing && fullOpt && (
                    <div className="flex items-center gap-0.5 pr-3 shrink-0">
                      <button onClick={() => handleToggle(opt)} className="p-2">
                        {inactive
                          ? <ToggleLeft className="w-[22px] h-[22px] text-gray-400" />
                          : <ToggleRight className="w-[22px] h-[22px] text-green-500" />
                        }
                      </button>
                      {!used && (
                        <button onClick={() => setConfirmDelete(fullOpt)} className="p-2">
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

      {/* Delete confirmation */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-[81] bg-white rounded-t-[22px] px-4 pt-5 pb-10">
            <p className="text-[16px] font-bold text-gray-900 mb-1">Delete "{confirmDelete.value}"?</p>
            <p className="text-[13.5px] text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 h-12 rounded-[10px] border border-gray-200 bg-gray-50 text-[14.5px] font-semibold text-gray-600">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 h-12 rounded-[10px] bg-red-600 text-[14.5px] font-bold text-white">
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/** Tappable selector row matching app's Selector component */
export function MobileSelector({
  label, value, placeholder, onPress, required, colorCode, imageUrl, noMargin,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  required?: boolean;
  colorCode?: string;
  imageUrl?: string;
  noMargin?: boolean;
}) {
  const has = !!value;
  return (
    <div className={noMargin ? '' : 'mb-[14px]'}>
      {label && (
        <p className="text-[13px] font-semibold text-gray-900 mb-1.5">
          {label}{required && <span className="text-red-500"> *</span>}
        </p>
      )}
      <button
        type="button"
        onClick={onPress}
        className="w-full min-h-[46px] flex items-center gap-2.5 px-[13px] py-2.5 rounded-[10px] border border-gray-200 bg-white text-left"
      >
        {colorCode && (
          <div className="w-5 h-5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: colorCode }} />
        )}
        {imageUrl && (
          <img src={imageUrl} alt="" className="w-[22px] h-[22px] rounded object-cover border border-gray-100 shrink-0" />
        )}
        <span className={`flex-1 text-[15px] ${has ? 'text-gray-900' : 'text-gray-400'}`} style={{ fontWeight: has ? 500 : 400 }}>
          {has ? value : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>
    </div>
  );
}
