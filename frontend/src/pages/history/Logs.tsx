import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import {
    CheckCircle2,
    XCircle,
    RefreshCw,
    Clock,
    ChevronRight,
    ExternalLink,
    Filter,
    Calendar,
    ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SyncLog {
    id: number;
    github_repo_url: string;
    gitee_repo_url: string;
    status: 'completed' | 'failed' | 'syncing' | 'pending';
    trigger_source: string;
    error_message: string | null;
    created_at: string;
}

export default function SyncLogs() {
    const { userId } = useAuthStore();
    const [logs, setLogs] = useState<SyncLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        fetchLogs();
    }, [userId, statusFilter]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const queryParam = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
            const res = await axios.get(`http://localhost:8001/api/v1/logs/${userId}${queryParam}`);
            console.log("Raw logs response type:", typeof res.data, "IsArray:", Array.isArray(res.data), res.data);
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch sync logs", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'completed': return { icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
            case 'failed': return { icon: <XCircle className="w-5 h-5 text-rose-400" />, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
            case 'syncing': return { icon: <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" };
            default: return { icon: <Clock className="w-5 h-5 text-amber-400" />, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
        }
    };

    const getTriggerSourceInfo = (source: string) => {
        switch (source) {
            case 'manual': return { label: "手动", color: "text-white/50", bg: "bg-white/5", border: "border-white/10" };
            case 'webhook': return { label: "Webhook", color: "text-emerald-400/70", bg: "bg-emerald-500/5", border: "border-emerald-500/10" };
            case 'cron': return { label: "定时", color: "text-amber-400/70", bg: "bg-amber-500/5", border: "border-amber-500/10" };
            case 'github_actions': return { label: "CI/CD", color: "text-violet-400/70", bg: "bg-violet-500/5", border: "border-violet-500/10" };
            default: return { label: source, color: "text-white/40", bg: "bg-white/5", border: "border-white/10" };
        }
    };

    const extractRepoName = (url: string | null | undefined) => {
        if (!url || typeof url !== 'string') return "Unknown Repository";
        try {
            const parts = url.split('/');
            const lastPart = parts[parts.length - 1];
            return lastPart ? lastPart.replace('.git', '') : "Unknown Repository";
        } catch (e) {
            return url;
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return "Unknown Date";
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "Invalid Date";
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(date);
        } catch (e) {
            return "Unknown Date";
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } }
    };

    return (
        <div className="max-w-6xl mx-auto pb-16">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-2">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Sync History</h1>
                    <p className="text-white/40 font-medium font-bold uppercase tracking-widest text-[10px]">Review all repository synchronization logs</p>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-sm">
                    {['all', 'completed', 'failed', 'syncing'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={cn(
                                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300",
                                statusFilter === status
                                    ? "bg-white text-slate-900 shadow-xl"
                                    : "text-white/40 hover:text-white"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </header>

            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col justify-center items-center h-96 space-y-8"
                    >
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                            <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 blur-xl border-4 border-t-blue-500 rounded-full animate-spin opacity-40" />
                        </div>
                        <div className="flex flex-col items-center">
                            <p className="text-white/80 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Accessing Logs</p>
                        </div>
                    </motion.div>
                ) : logs.length === 0 ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center justify-center h-80 bg-white/5 border border-white/5 rounded-[3rem] text-center p-12"
                    >
                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                            <Filter className="w-8 h-8 text-white/10" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
                        <p className="text-white/30 text-sm max-w-xs">We couldn't find any sync logs matching your current filter.</p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {logs.map((log) => {
                            const statusInfo = getStatusInfo(log.status);
                            return (
                                <motion.div
                                    key={log.id}
                                    variants={itemVariants}
                                    layout
                                    className="group relative bg-[#0f0f12]/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 hover:bg-[#141417] hover:border-white/10 transition-all duration-300 overflow-hidden"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-8 relative z-10">
                                        <div className={cn(
                                            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-500 group-hover:scale-110 shadow-lg",
                                            statusInfo.bg,
                                            statusInfo.border
                                        )}>
                                            {statusInfo.icon}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={cn(
                                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                    statusInfo.bg,
                                                    statusInfo.color,
                                                    statusInfo.border
                                                )}>
                                                    {log.status}
                                                </span>
                                                {log.trigger_source && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                                        getTriggerSourceInfo(log.trigger_source).bg,
                                                        getTriggerSourceInfo(log.trigger_source).color,
                                                        getTriggerSourceInfo(log.trigger_source).border
                                                    )}>
                                                        {getTriggerSourceInfo(log.trigger_source).label}
                                                    </span>
                                                )}
                                                <div className="flex items-center text-white/20 gap-2 text-[10px] font-bold uppercase tracking-widest">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(log.created_at)}
                                                </div>
                                            </div>

                                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                                                <h3 className="text-xl font-bold text-white truncate max-w-md">
                                                    {extractRepoName(log.github_repo_url)}
                                                </h3>
                                                <div className="hidden md:flex items-center text-white/10">
                                                    <ArrowRightLeft className="w-4 h-4" />
                                                </div>
                                                <p className="text-white/30 text-xs font-medium truncate flex items-center gap-2">
                                                    {extractRepoName(log.gitee_repo_url)}
                                                    <ExternalLink className="w-3 h-3" />
                                                </p>
                                            </div>

                                            {log.error_message && (
                                                <div className="mt-4 p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                                    <p className="text-rose-400/80 text-[11px] font-medium leading-relaxed italic">
                                                        "{log.error_message}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 lg:ml-auto">
                                            <a
                                                href={log.github_repo_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-3 bg-white/5 rounded-xl border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Accent gradient background */}
                                    <div className={cn(
                                        "absolute top-0 right-0 w-64 h-64 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                                        log.status === 'completed' ? "bg-emerald-500" : log.status === 'failed' ? "bg-rose-500" : "bg-blue-500"
                                    )} />
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
