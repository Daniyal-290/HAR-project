import { motion } from 'framer-motion';
import {
  Clock, ShieldCheck, Coffee, AlertTriangle, TrendingUp,
} from 'lucide-react';

import { useStats } from '../hooks/useStats';
import StatCard from './StatCard';
import ActivityTimeline from './ActivityTimeline';
import CategoryBreakdown from './CategoryBreakdown';
import PostureAlert from './PostureAlert';
import HealthBreaks from './HealthBreaks';

function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function Dashboard() {
  const { data, loading, error, lastUpdated } = useStats('day');

  return (
    <div className="min-h-screen px-4 py-6 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">
              🧠 Ergonomic Controller
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            AI-Powered Desk Activity Monitor
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] text-slate-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="live-dot" />
            <span className="text-xs font-medium text-emerald-400">Live</span>
          </div>
        </div>
      </motion.header>

      {/* ── Error banner ───────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            {error.includes('fetch') || error.includes('Failed')
              ? 'Cannot connect to backend. Make sure the server is running on localhost:5000.'
              : error}
          </p>
        </motion.div>
      )}

      {/* ── Loading state ──────────────────────────────────── */}
      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      )}

      {/* ── Main content ───────────────────────────────────── */}
      {(data || !loading) && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              icon={Clock}
              label="Active Time"
              value={formatMinutes(data?.total_active_minutes || 0)}
              subtitle="Today"
              category="Productivity"
              index={0}
            />
            <StatCard
              icon={ShieldCheck}
              label="Posture Score"
              value={(() => {
                const alerts = data?.ergonomic_alerts || [];
                const totalAlerts = alerts.reduce((s, a) => s + a.count, 0);
                const score = Math.max(0, 100 - totalAlerts * 2);
                return `${score}/100`;
              })()}
              subtitle={(() => {
                const alerts = data?.ergonomic_alerts || [];
                const totalAlerts = alerts.reduce((s, a) => s + a.count, 0);
                const score = Math.max(0, 100 - totalAlerts * 2);
                return score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs work';
              })()}
              category={(() => {
                const alerts = data?.ergonomic_alerts || [];
                const totalAlerts = alerts.reduce((s, a) => s + a.count, 0);
                const score = Math.max(0, 100 - totalAlerts * 2);
                return score >= 60 ? 'Health/Breaks' : 'Ergonomics/Posture';
              })()}
              index={1}
            />
            <StatCard
              icon={Coffee}
              label="Breaks Taken"
              value={(data?.health_highlights || []).reduce((s, h) => s + h.count, 0)}
              subtitle="Health activities"
              category="Health/Breaks"
              index={2}
            />
            <StatCard
              icon={AlertTriangle}
              label="Alerts"
              value={(data?.ergonomic_alerts || []).reduce((s, a) => s + a.count, 0)}
              subtitle="Posture warnings"
              category="Ergonomics/Posture"
              index={3}
            />
            <StatCard
              icon={TrendingUp}
              label="Confidence"
              value={`${data?.avg_confidence || 0}%`}
              subtitle="Avg accuracy"
              category="Productivity"
              index={4}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <div className="lg:col-span-3">
              <ActivityTimeline hourlyData={data?.hourly} />
            </div>
            <div className="lg:col-span-2">
              <CategoryBreakdown categoryData={data?.by_category} />
            </div>
          </div>

          {/* Alerts & Health row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <PostureAlert alerts={data?.ergonomic_alerts} />
            <HealthBreaks healthData={data?.health_highlights} />
          </div>

          {/* Activity details table */}
          {data?.by_activity && data.by_activity.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="glass-card"
            >
              <h3 className="text-sm font-semibold text-slate-200 mb-4 tracking-wide">
                Activity Details
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">Activity</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">Count</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">Duration</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_activity.map((a, i) => (
                      <tr
                        key={a.activity}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-2.5 px-3 text-slate-200 font-medium">{a.activity}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">{a.count}</td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {a.total_minutes ? `${a.total_minutes}m` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-medium ${
                            a.avg_confidence >= 0.8
                              ? 'text-emerald-400'
                              : a.avg_confidence >= 0.6
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}>
                            {Math.round((a.avg_confidence || 0) * 100)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="mt-8 pb-4 text-center">
        <p className="text-[10px] text-slate-600">
          The Invisible Ergonomic Controller • Edge AI Powered • v1.0
        </p>
      </footer>
    </div>
  );
}
