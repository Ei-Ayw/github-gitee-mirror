import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { Github, CheckCircle2, ShieldCheck, Link2, Copy, Webhook, Rocket, RefreshCw } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { cn } from '../../lib/utils';

const GiteeIcon = ({ className }: { className?: string }) => (
    <div className={cn("bg-[#c71d23] rounded-[4px] flex items-center justify-center p-0.5", className)}>
        <svg viewBox="0 0 24 24" className="w-full h-full text-white fill-current">
            <path d="M11.977 24c6.626 0 11.998-5.372 11.998-12S18.604 0 11.977 0C5.352 0 .002 5.372.002 12s5.35 12 11.975 12zM6.166 6.848h11.621v2.105H8.381v2.105h9.406v2.105H8.381v2.105h9.406v2.105H6.166V6.848z" />
        </svg>
    </div>
);

export default function Accounts() {
    const { userId, githubLinked, giteeLinked, githubUser, giteeUser, setLinked, syncApiToken, setSyncApiToken } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const handleCopyWebhook = () => {
        navigator.clipboard.writeText(`http://localhost:8001/api/v1/webhook/github/${userId}`);
        setCopied('webhook');
        setTimeout(() => setCopied(null), 2000);
    };

    const handleCopyCiToken = () => {
        if (syncApiToken) {
            navigator.clipboard.writeText(syncApiToken);
            setCopied('ci_token');
            setTimeout(() => setCopied(null), 2000);
        }
    };

    const handleCopyCiUrl = () => {
        navigator.clipboard.writeText(`http://localhost:8001/api/v1/ci/trigger/${userId}`);
        setCopied('ci_url');
        setTimeout(() => setCopied(null), 2000);
    };

    const handleGenerateToken = async () => {
        try {
            const res = await axios.post(`http://localhost:8001/api/v1/auth/generate-sync-token/${userId}`);
            setSyncApiToken(res.data.sync_api_token);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        checkStatus();
    }, [userId]);

    const checkStatus = async () => {
        try {
            const res = await axios.get(`http://localhost:8001/api/v1/auth/status/${userId}`);
            setLinked(
                res.data.github_linked,
                res.data.gitee_linked,
                res.data.github_username,
                res.data.gitee_username
            );
        } catch (e) {
            console.error(e);
        }
    };

    const handleUnlink = async (platform: 'github' | 'gitee') => {
        try {
            setLoading(true);
            await axios.delete(`http://localhost:8001/api/v1/auth/unlink/${userId}/${platform}`);
            await checkStatus();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const variants: Variants = {
        hidden: { opacity: 0, y: 15 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const }
        })
    };

    return (
        <div className="max-w-5xl mx-auto pb-16">
            <motion.header
                custom={0}
                initial="hidden"
                animate="visible"
                variants={variants}
                className="mb-12 px-2"
            >
                <h1 className="text-4xl font-bold tracking-tight text-white mb-2 leading-tight">Connected Accounts</h1>
                <p className="text-white/40 font-medium font-bold uppercase tracking-widest text-[10px]">Manage your version control credentials</p>
            </motion.header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* GitHub Section */}
                <motion.div
                    custom={1}
                    initial="hidden"
                    animate="visible"
                    variants={variants}
                    className="relative group bg-[#0f0f12]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 hover:bg-[#141417] hover:border-white/10 transition-all duration-500 overflow-hidden"
                >
                    <div className="flex flex-col h-full relative z-10">
                        <div className="flex items-start justify-between mb-10">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                                <Github className="w-8 h-8 text-white" />
                            </div>
                            {githubLinked ? (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleUnlink('github')}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500/80 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all"
                                    disabled={loading}
                                >
                                    Unlink
                                </motion.button>
                            ) : (
                                <div className="p-3 bg-white/5 rounded-2xl flex items-center justify-center">
                                    <Link2 className="w-5 h-5 text-white/20" />
                                </div>
                            )}
                        </div>

                        <div className="mb-auto">
                            <h3 className="text-2xl font-bold text-white mb-2 flex items-center tracking-tight">
                                GitHub
                                {githubLinked && <CheckCircle2 className="w-5 h-5 ml-3 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" />}
                            </h3>
                            <p className="text-sm font-medium leading-relaxed">
                                {githubLinked && githubUser ? (
                                    <span className="text-emerald-400/80 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        Authenticated as <strong className="text-emerald-400">{githubUser}</strong>
                                    </span>
                                ) : (
                                    <span className="text-white/30 uppercase tracking-widest text-[10px] font-bold">Primary storage provider</span>
                                )}
                            </p>
                        </div>

                        {!githubLinked ? (
                            <motion.a
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                href={`http://localhost:8001/api/v1/auth/oauth/github/login?user_id=${userId}`}
                                className="mt-12 w-full px-6 py-4 bg-white text-slate-900 font-black text-xs rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                            >
                                <Github className="w-4 h-4" />
                                <span>Authorize Account</span>
                            </motion.a>
                        ) : (
                            <div className="mt-12 h-[52px] flex items-center justify-center border border-white/5 rounded-2xl text-[10px] font-bold text-white/10 uppercase tracking-widest">
                                Connection Active
                            </div>
                        )}
                    </div>

                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </motion.div>

                {/* Gitee Section */}
                <motion.div
                    custom={2}
                    initial="hidden"
                    animate="visible"
                    variants={variants}
                    className="relative group bg-[#0f0f12]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 hover:bg-[#141417] hover:border-white/10 transition-all duration-500 overflow-hidden"
                >
                    <div className="flex flex-col h-full relative z-10">
                        <div className="flex items-start justify-between mb-10">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                                <GiteeIcon className="w-8 h-8" />
                            </div>
                            {giteeLinked ? (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleUnlink('gitee')}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500/80 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all"
                                    disabled={loading}
                                >
                                    Unlink
                                </motion.button>
                            ) : (
                                <div className="p-3 bg-white/5 rounded-2xl flex items-center justify-center">
                                    <Link2 className="w-5 h-5 text-white/20" />
                                </div>
                            )}
                        </div>

                        <div className="mb-auto">
                            <h3 className="text-2xl font-bold text-white mb-2 flex items-center tracking-tight">
                                Gitee
                                {giteeLinked && <CheckCircle2 className="w-5 h-5 ml-3 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" />}
                            </h3>
                            <p className="text-sm font-medium leading-relaxed">
                                {giteeLinked && giteeUser ? (
                                    <span className="text-emerald-400/80 flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        Connected as <strong className="text-emerald-400">{giteeUser}</strong>
                                    </span>
                                ) : (
                                    <span className="text-white/30 uppercase tracking-widest text-[10px] font-bold">Destination mirror provider</span>
                                )}
                            </p>
                        </div>

                        {!giteeLinked ? (
                            <motion.a
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                href={`http://localhost:8001/api/v1/auth/oauth/gitee/login?user_id=${userId}`}
                                className="mt-12 w-full px-6 py-4 bg-[#c71d23] text-white font-black text-xs rounded-2xl shadow-[0_0_30px_rgba(199,29,35,0.2)] hover:shadow-[0_0_40px_rgba(199,29,35,0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 uppercase tracking-widest"
                            >
                                <GiteeIcon className="w-4 h-4" />
                                <span>Authorize Account</span>
                            </motion.a>
                        ) : (
                            <div className="mt-12 h-[52px] flex items-center justify-center border border-white/5 rounded-2xl text-[10px] font-bold text-white/10 uppercase tracking-widest">
                                Connection Active
                            </div>
                        )}
                    </div>

                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#c71d23]/10 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </motion.div>
            </div>

            {githubLinked && giteeLinked && (
                <>
                    {/* Webhook Integration */}
                    <motion.div
                        custom={3}
                        initial="hidden"
                        animate="visible"
                        variants={variants}
                        className="mt-8 bg-[#0f0f12]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />

                        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/10 shadow-inner">
                                <Webhook className="w-8 h-8 text-emerald-400" />
                            </div>

                            <div className="flex-1 w-full overflow-hidden">
                                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Webhook Integration</h3>
                                <p className="text-sm text-white/60 leading-relaxed mb-6">
                                    Automate your sync process by adding this webhook URL to your GitHub repositories. It triggers an instant sync to Gitee whenever code is pushed.
                                </p>

                                <div className="flex items-center gap-3 bg-[#0a0a0c] border border-white/5 p-2 pl-4 rounded-2xl w-full">
                                    <div className="flex-1 overflow-x-auto scrollbar-hide">
                                        <code className="text-xs text-blue-300 font-mono whitespace-nowrap">
                                            http://localhost:8001/api/v1/webhook/github/{userId}
                                        </code>
                                    </div>
                                    <button
                                        onClick={handleCopyWebhook}
                                        className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest shrink-0"
                                    >
                                        {copied === 'webhook' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        {copied === 'webhook' ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* CI/CD Integration */}
                    <motion.div
                        custom={4}
                        initial="hidden"
                        animate="visible"
                        variants={variants}
                        className="mt-8 bg-[#0f0f12]/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />

                        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                            <div className="p-5 bg-white/5 rounded-3xl border border-white/10 shadow-inner">
                                <Rocket className="w-8 h-8 text-violet-400" />
                            </div>

                            <div className="flex-1 w-full overflow-hidden">
                                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">CI/CD Integration</h3>
                                <p className="text-sm text-white/60 leading-relaxed mb-6">
                                    Configure GitHub Actions to automatically sync your repositories. Add this workflow to your GitHub repos for push-triggered and scheduled synchronization to Gitee.
                                </p>

                                {/* Generate Token */}
                                <div className="mb-4">
                                    {!syncApiToken ? (
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleGenerateToken}
                                            className="px-6 py-3 bg-violet-600 text-white font-black text-xs rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] transition-all flex items-center gap-3 uppercase tracking-widest"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Generate Sync Token
                                        </motion.button>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-[#0a0a0c] border border-white/5 p-2 pl-4 rounded-2xl w-full">
                                            <div className="flex-1 overflow-x-auto scrollbar-hide">
                                                <code className="text-xs text-violet-300 font-mono whitespace-nowrap">
                                                    {syncApiToken}
                                                </code>
                                            </div>
                                            <button
                                                onClick={handleCopyCiToken}
                                                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest shrink-0"
                                            >
                                                {copied === 'ci_token' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                                {copied === 'ci_token' ? 'Copied' : 'Copy'}
                                            </button>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleGenerateToken}
                                                className="px-3 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl transition-colors text-[10px] uppercase tracking-widest shrink-0"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                            </motion.button>
                                        </div>
                                    )}
                                </div>

                                {/* CI/CD Trigger URL */}
                                <div className="flex items-center gap-3 bg-[#0a0a0c] border border-white/5 p-2 pl-4 rounded-2xl w-full">
                                    <div className="flex-1 overflow-x-auto scrollbar-hide">
                                        <code className="text-xs text-blue-300 font-mono whitespace-nowrap">
                                            http://localhost:8001/api/v1/ci/trigger/{userId}
                                        </code>
                                    </div>
                                    <button
                                        onClick={handleCopyCiUrl}
                                        className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest shrink-0"
                                    >
                                        {copied === 'ci_url' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        {copied === 'ci_url' ? 'Copied' : 'Copy'}
                                    </button>
                                </div>

                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-4">
                                    Add the Sync Token as SYNCPULSE_API_TOKEN, the URL as SYNCPULSE_API_URL, and your User ID as SYNCPULSE_USER_ID in your GitHub repository Secrets.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}

            <motion.div
                custom={5}
                initial="hidden"
                animate="visible"
                variants={variants}
                className="mt-8 bg-white/5 border border-white/5 rounded-[2.5rem] p-8 flex items-center gap-6"
            >
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-white/80">Security Notice</p>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                        Access tokens are encrypted and never exposed in the browser. You can revoke access at any time from your platform's settings.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}