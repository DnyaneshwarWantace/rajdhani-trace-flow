import React, { useEffect, useRef, useState } from 'react';
import {
    DatabaseBackup,
    HardDrive,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    Trash2,
    RefreshCw,
    Play,
    AlertTriangle,
    FileArchive,
    Layers,
    Zap,
    Timer,
    DownloadCloud,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Backend for this project runs on 8000 by default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface BackupItem {
    name: string;
    path: string;
    created: string;
    size: string;
    status: 'pending' | 'completed' | 'failed';
    totalDocuments: number | null;
    collections: number | null;
}

// ───────────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    try {
        const d = new Date(iso);
        return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        });
    } catch {
        return iso;
    }
}

function elapsed(startIso: string) {
    const secs = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

// ───────────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────────

const BackupDashboard: React.FC = () => {
    const { toast } = useToast();
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // While a backup is running we track start time and tick elapsed seconds
    const [backupStartTime, setBackupStartTime] = useState<string | null>(null);
    const [elapsedSecs, setElapsedSecs] = useState(0);
    const [fakeProgress, setFakeProgress] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── fetch list ───────────────────────────────────────────────────────────────
    const fetchBackups = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_BASE_URL}/admin/backup/list`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.success) {
                const items = data.data || [];
                setBackups(items);
                // If there's a pending backup and we're not already polling, start polling
                const hasPending = items.some((b: BackupItem) => b.status === 'pending');
                if (hasPending && !pollRef.current) {
                    const pendingItem = items.find((b: BackupItem) => b.status === 'pending');
                    setCreating(true); // Indicate that a backup is in progress
                    startPolling(pendingItem?.created || new Date().toISOString());
                }
                return items as BackupItem[];
            }
        } catch (e: any) {
            if (!silent) toast({ title: 'Error', description: e.message, variant: 'destructive' });
        } finally {
            if (!silent) setLoading(false);
        }
        return [] as BackupItem[];
    };

    useEffect(() => {
        fetchBackups();
        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── polling helpers ──────────────────────────────────────────────────────────
    const stopPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (tickRef.current) clearInterval(tickRef.current);
        pollRef.current = null;
        tickRef.current = null;
    };

    const startPolling = (startTime: string) => {
        setBackupStartTime(startTime);
        setElapsedSecs(0);
        setFakeProgress(5); // jump to 5% immediately so the bar isn't empty

        // tick elapsed seconds
        tickRef.current = setInterval(() => {
            setElapsedSecs((s) => s + 1);
            // slowly increment fake progress up to ~90% (never 100% until done)
            setFakeProgress((p) => (p < 88 ? p + 0.4 : p));
        }, 1000);

        // check list every 4 seconds for completion
        pollRef.current = setInterval(async () => {
            const items = await fetchBackups(true);
            const stillPending = items.some((b) => b.status === 'pending');
            if (!stillPending) {
                stopPolling();
                setCreating(false);
                setBackupStartTime(null);
                setFakeProgress(100);
                const latest = items[0];
                if (latest?.status === 'completed') {
                    toast({
                        title: '✅ Backup Complete',
                        description: `${latest.collections} collections · ${latest.totalDocuments?.toLocaleString()} docs · ${latest.size}`,
                    });
                } else {
                    toast({ title: '❌ Backup Failed', description: 'Check server logs for details.', variant: 'destructive' });
                }
                // reset progress bar after flash
                setTimeout(() => setFakeProgress(0), 1800);
            }
        }, 4000);
    };

    // ── create backup ────────────────────────────────────────────────────────────
    const handleCreate = async () => {
        setCreating(true);
        try {
            const token = localStorage.getItem('admin_token');

            // Create abort controller with 5 minute timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes

            const res = await fetch(`${API_BASE_URL}/admin/backup/create`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to start backup');

            // Backup completed successfully (synchronous)
            setCreating(false);
            toast({
                title: '✅ Backup Complete',
                description: `${data.data.collections} collections · ${data.data.totalDocuments?.toLocaleString()} docs · ${data.data.size}`
            });
            await fetchBackups(true);
        } catch (e: any) {
            setCreating(false);
            if (e.name === 'AbortError') {
                toast({ title: 'Backup Timeout', description: 'Backup took too long. Check server logs.', variant: 'destructive' });
            } else {
                toast({ title: 'Backup Error', description: e.message, variant: 'destructive' });
            }
        }
    };

    // ── delete backup ────────────────────────────────────────────────────────────
    const handleDelete = async (name: string) => {
        setDeleting(name);
        setConfirmDelete(null);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_BASE_URL}/admin/backup/${encodeURIComponent(name)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            toast({ title: 'Backup Deleted', description: `${name} removed successfully.` });
            await fetchBackups(true);
        } catch (e: any) {
            toast({ title: 'Delete Failed', description: e.message, variant: 'destructive' });
        } finally {
            setDeleting(null);
        }
    };

    const [downloading, setDownloading] = useState<string | null>(null);

    // ── download backup ──────────────────────────────────────────────────────────
    const handleDownload = async (name: string) => {
        setDownloading(name);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_BASE_URL}/admin/backup/${encodeURIComponent(name)}/download`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            // Convert the streaming response to a blob
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({ title: 'Download Complete', description: `${name}.zip downloaded successfully.` });
        } catch (e: any) {
            toast({ title: 'Download Failed', description: e.message, variant: 'destructive' });
        } finally {
            setDownloading(null);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchBackups();
        setRefreshing(false);
    };

    const totalSize = backups
        .filter((b) => b.status === 'completed')
        .reduce((acc, b) => acc + parseFloat(b.size) || 0, 0)
        .toFixed(2);

    const completed = backups.filter((b) => b.status === 'completed').length;
    const pending = backups.filter((b) => b.status === 'pending').length;
    const failed = backups.filter((b) => b.status === 'failed').length;

    const estimatedMins = (() => {
        if (!backupStartTime) return '—';
        const secs = Math.floor((Date.now() - new Date(backupStartTime).getTime()) / 1000);
        // rough heuristic based on elapsed: typically 1-5 min for medium DB
        const remaining = Math.max(0, 120 - secs);
        if (remaining === 0) return '< 1 min';
        return `~${Math.ceil(remaining / 60)} min`;
    })();

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
        .bk-dash { font-family: 'Sora', sans-serif; }
        .bk-mono { font-family: 'JetBrains Mono', monospace !important; }
        .bk-bg {
          background-color: #0a0a0f;
          background-image: radial-gradient(ellipse 80% 40% at 50% -5%, rgba(0,102,255,0.07) 0%, transparent 70%);
        }
        .bk-glass {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
        }
        .bk-glass:hover { border-color: rgba(255,255,255,0.09); }

        .bk-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.2s ease;
        }
        .bk-card:hover {
          background: rgba(255,255,255,0.035);
          border-color: rgba(0,102,255,0.18);
          transform: translateY(-2px);
        }

        .bk-row {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.2s ease;
        }
        .bk-row:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.08);
        }

        .progress-track {
          background: rgba(255,255,255,0.04);
          border-radius: 99px;
          overflow: hidden;
          height: 8px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #0066ff, #6633ff, #00d4ff);
          background-size: 200% 100%;
          animation: progress-shimmer 1.4s linear infinite;
          transition: width 0.8s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes progress-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .bk-btn-primary {
          background: linear-gradient(135deg, #0066ff, #6633ff);
          box-shadow: 0 4px 20px rgba(0,102,255,0.4);
          transition: all 0.2s ease;
        }
        .bk-btn-primary:hover:not(:disabled) {
          box-shadow: 0 6px 28px rgba(0,102,255,0.55);
          transform: translateY(-1px);
        }
        .bk-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .bk-delete-btn {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.15);
          transition: all 0.2s ease;
        }
        .bk-delete-btn:hover:not(:disabled) {
          background: rgba(239,68,68,0.18);
          border-color: rgba(239,68,68,0.35);
        }

        .status-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 6px;
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-in { animation: slide-up 0.4s ease forwards; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        .sec-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.28);
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        /* Confirm delete overlay */
        .del-overlay {
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
        }
        .del-modal {
          background: #0f0f18;
          border: 1px solid rgba(239,68,68,0.2);
          box-shadow: 0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(239,68,68,0.08);
        }

        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-in { animation: modal-in 0.22s cubic-bezier(0.4,0,0.2,1) forwards; }

        .pulse-ring { animation: bk-pulse 2s ease infinite; }
        @keyframes bk-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

            <div className="bk-dash bk-bg min-h-screen p-6 xl:p-8">

                {/* ── HEADER ─────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div
                            className="p-3.5 rounded-2xl"
                            style={{ background: 'linear-gradient(135deg,#0066ff,#6633ff)', boxShadow: '0 8px 32px rgba(0,102,255,0.35)' }}
                        >
                            <DatabaseBackup className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">
                                Database Backups
                            </h1>
                            <p className="bk-mono text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                                <Zap className="w-3 h-3 text-yellow-500" />
                                Full MongoDB snapshots · Worker-based export
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white transition-all bk-glass text-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="bk-btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
                        >
                            {creating ? (
                                <Loader2 className="w-4 h-4 spin" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            {creating ? 'Backup Running…' : 'New Backup'}
                        </button>
                    </div>
                </div>

                {/* ── LIVE PROGRESS PANEL (visible while creating) ──────────── */}
                {creating && (
                    <div
                        className="bk-glass rounded-2xl p-6 mb-6 anim-in"
                        style={{ border: '1px solid rgba(0,102,255,0.25)', background: 'rgba(0,102,255,0.04)' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="p-2 rounded-xl pulse-ring"
                                    style={{ background: 'rgba(0,102,255,0.15)', border: '1px solid rgba(0,102,255,0.3)' }}
                                >
                                    <DatabaseBackup className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-[14px] font-bold text-white">Backup In Progress</p>
                                    <p className="bk-mono text-[10px] text-gray-500">
                                        Exporting all collections to JSON · auto-detects completion every 4s
                                    </p>
                                </div>
                            </div>
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                                style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
                            >
                                <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-ring" />
                                <span className="bk-mono text-[10px] text-emerald-400 font-semibold">LIVE</span>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="progress-track mb-3">
                            <div
                                className="progress-fill"
                                style={{ width: `${fakeProgress}%` }}
                            />
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: Timer, label: 'Elapsed', value: `${elapsedSecs}s` },
                                { icon: Clock, label: 'Est. Remaining', value: estimatedMins },
                                { icon: HardDrive, label: 'Progress', value: `${Math.round(fakeProgress)}%` },
                            ].map(({ icon: Icon, label, value }) => (
                                <div
                                    key={label}
                                    className="rounded-xl p-3"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Icon className="w-3 h-3 text-blue-400" />
                                        <span className="bk-mono text-[9px] text-gray-600 uppercase">{label}</span>
                                    </div>
                                    <div className="bk-mono text-[18px] font-bold text-white">{value}</div>
                                </div>
                            ))}
                        </div>

                        <p className="bk-mono text-[10px] text-gray-600 mt-3">
                            ⓘ The backup worker runs as a separate process. This page auto-polls until it detects completion.
                        </p>
                    </div>
                )}

                {/* ── STAT CARDS ────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                    {[
                        { label: 'Total Backups', value: backups.length, icon: FileArchive, color: '#0066ff', bg: 'rgba(0,102,255,0.1)', glow: 'rgba(0,102,255,0.25)' },
                        { label: 'Completed', value: completed, icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)', glow: 'rgba(16,185,129,0.25)' },
                        { label: 'Total Size', value: `${totalSize} MB`, icon: HardDrive, color: '#f97316', bg: 'rgba(249,115,22,0.1)', glow: 'rgba(249,115,22,0.25)' },
                        { label: 'Pending / Failed', value: `${pending} / ${failed}`, icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', glow: 'rgba(245,158,11,0.25)' },
                    ].map(({ label, value, icon: Icon, color, bg, glow }, i) => (
                        <div
                            key={label}
                            className="bk-card rounded-2xl p-5 anim-in"
                            style={{ animationDelay: `${i * 60}ms` }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2.5 rounded-xl" style={{ background: bg, boxShadow: `0 4px 16px ${glow}` }}>
                                    <Icon className="w-4 h-4" style={{ color }} />
                                </div>
                                <Layers className="w-3.5 h-3.5 text-gray-700" />
                            </div>
                            <div className="bk-mono text-2xl font-bold text-white mb-1">{value}</div>
                            <div className="text-[12px] font-semibold" style={{ color }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* ── BACKUP LIST ───────────────────────────────────────────── */}
                <div className="bk-glass rounded-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div
                                className="p-2 rounded-xl"
                                style={{ background: 'rgba(0,102,255,0.12)', boxShadow: '0 4px 16px rgba(0,102,255,0.15)' }}
                            >
                                <HardDrive className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Backup History</h2>
                                <p className="bk-mono text-[11px] text-gray-600">
                                    {backups.length} total · sorted newest first
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full spin" />
                                <span className="bk-mono text-[12px] text-gray-600">Loading backups…</span>
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <div
                                    className="p-5 rounded-2xl"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                >
                                    <DatabaseBackup className="w-10 h-10 text-gray-700" />
                                </div>
                                <p className="text-[14px] font-semibold text-gray-500">No backups yet</p>
                                <p className="bk-mono text-[11px] text-gray-700">Click "New Backup" to create your first snapshot</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {backups.map((backup, idx) => {
                                    const isPending = backup.status === 'pending';
                                    const isDone = backup.status === 'completed';
                                    const isFailed = backup.status === 'failed';

                                    return (
                                        <div
                                            key={backup.name}
                                            className="bk-row rounded-2xl p-4 anim-in"
                                            style={{ animationDelay: `${idx * 40}ms` }}
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Status icon */}
                                                <div
                                                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                                                    style={
                                                        isDone ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' } :
                                                            isFailed ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' } :
                                                                { background: 'rgba(0,102,255,0.1)', border: '1px solid rgba(0,102,255,0.2)' }
                                                    }
                                                >
                                                    {isPending && <Loader2 className="w-5 h-5 text-blue-400 spin" />}
                                                    {isDone && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                                                    {isFailed && <XCircle className="w-5 h-5 text-red-400" />}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span
                                                            className="status-pill"
                                                            style={
                                                                isDone ? { color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' } :
                                                                    isFailed ? { color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' } :
                                                                        { color: '#60a5fa', background: 'rgba(0,102,255,0.1)', border: '1px solid rgba(0,102,255,0.2)' }
                                                            }
                                                        >
                                                            {backup.status}
                                                        </span>
                                                        <h4 className="bk-mono text-[12px] font-semibold text-gray-200 truncate">
                                                            {backup.name}
                                                        </h4>
                                                    </div>

                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3 text-gray-600" />
                                                            <span className="bk-mono text-[11px] text-gray-500">
                                                                {fmtDate(backup.created)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <HardDrive className="w-3 h-3 text-gray-600" />
                                                            <span className="bk-mono text-[11px] text-gray-500">
                                                                {backup.size}
                                                            </span>
                                                        </div>
                                                        {isDone && backup.collections != null && (
                                                            <>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Layers className="w-3 h-3 text-blue-500" />
                                                                    <span className="bk-mono text-[11px] text-gray-500">
                                                                        {backup.collections} collections
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <FileArchive className="w-3 h-3 text-purple-500" />
                                                                    <span className="bk-mono text-[11px] text-gray-500">
                                                                        {backup.totalDocuments?.toLocaleString()} docs
                                                                    </span>
                                                                </div>
                                                            </>
                                                        )}
                                                        {isPending && backupStartTime && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Timer className="w-3 h-3 text-blue-400" />
                                                                <span className="bk-mono text-[11px] text-blue-400">
                                                                    Running · {elapsed(backupStartTime)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Inline progress bar for pending row */}
                                                    {isPending && (
                                                        <div className="progress-track mt-2" style={{ height: '5px' }}>
                                                            <div
                                                                className="progress-fill"
                                                                style={{ width: `${fakeProgress}%`, height: '5px' }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {!isPending && (
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {isDone && (
                                                            <button
                                                                onClick={() => handleDownload(backup.name)}
                                                                disabled={downloading === backup.name}
                                                                title="Download ZIP archive"
                                                                className="bk-download-btn p-2 rounded-lg"
                                                                style={{ background: 'rgba(0,102,255,0.08)', border: '1px solid rgba(0,102,255,0.15)' }}
                                                            >
                                                                {downloading === backup.name ? (
                                                                    <Loader2 className="w-4 h-4 text-blue-400 spin" />
                                                                ) : (
                                                                    <DownloadCloud className="w-4 h-4 text-blue-400 hover:text-blue-300 transition-colors" />
                                                                )}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setConfirmDelete(backup.name)}
                                                            disabled={deleting === backup.name}
                                                            title="Delete backup"
                                                            className="bk-delete-btn p-2 rounded-lg"
                                                        >
                                                            {deleting === backup.name ? (
                                                                <Loader2 className="w-4 h-4 text-red-400 spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4 text-red-400" />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ DELETE CONFIRM MODAL ═════════════════════════════════════ */}
            {confirmDelete && (
                <div
                    className="del-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => setConfirmDelete(null)}
                >
                    <div
                        className="del-modal modal-in rounded-3xl w-full max-w-sm p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="p-2.5 rounded-xl"
                                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                                <Trash2 className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Delete Backup</h3>
                                <p className="bk-mono text-[10px] text-gray-600">This cannot be undone</p>
                            </div>
                        </div>

                        <div
                            className="rounded-xl p-3 mb-5"
                            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}
                        >
                            <p className="bk-mono text-[11px] text-gray-400 break-all">{confirmDelete}</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-gray-400 hover:text-white transition-all"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDelete)}
                                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
                                style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 16px rgba(220,38,38,0.3)' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BackupDashboard;
