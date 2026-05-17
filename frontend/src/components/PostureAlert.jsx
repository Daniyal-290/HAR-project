import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Eye } from 'lucide-react';

const ALERT_CONFIG = {
  'Slouching (Tech Neck)': {
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    gradient: 'from-red-500/20 to-orange-500/10',
    description: 'Forward head posture detected',
  },
  'Reading (Leaning/Squinting)': {
    icon: Eye,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    gradient: 'from-amber-500/20 to-yellow-500/10',
    description: 'Leaning in or squinting detected',
  },
};

const SEVERITY_BADGES = {
  critical: { text: 'CRITICAL', bg: 'bg-red-500/20', color: 'text-red-400' },
  warning: { text: 'WARNING', bg: 'bg-amber-500/20', color: 'text-amber-400' },
  info: { text: 'INFO', bg: 'bg-blue-500/20', color: 'text-blue-400' },
};

export default function PostureAlert({ alerts }) {
  const hasAlerts = alerts && alerts.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-slate-200 tracking-wide">
          Ergonomic Alerts
        </h3>
        {hasAlerts && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
            {alerts.length}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {hasAlerts ? (
          <div className="space-y-3">
            {alerts.map((alert, i) => {
              const cfg = ALERT_CONFIG[alert.activity] || ALERT_CONFIG['Slouching (Tech Neck)'];
              const sev = SEVERITY_BADGES[alert.severity] || SEVERITY_BADGES.info;
              const Icon = cfg.icon;

              return (
                <motion.div
                  key={alert.activity}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.borderColor} bg-gradient-to-r ${cfg.gradient}`}
                >
                  <div className={`${cfg.bgColor} p-2 rounded-lg mt-0.5`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-white truncate">
                        {alert.activity}
                      </p>
                      <span className={`${sev.bg} ${sev.color} text-[9px] font-bold px-1.5 py-0.5 rounded-full`}>
                        {sev.text}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{cfg.description}</p>
                    <div className="flex gap-4 mt-1.5 text-xs">
                      <span className="text-slate-300">
                        <strong className={cfg.color}>{alert.count}</strong> occurrences
                      </span>
                      {alert.total_minutes > 0 && (
                        <span className="text-slate-300">
                          <strong className={cfg.color}>{alert.total_minutes}</strong> min total
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
              <span className="text-lg">✅</span>
            </div>
            <p className="text-sm text-emerald-400 font-medium">Great posture!</p>
            <p className="text-xs text-slate-500 mt-0.5">No ergonomic alerts today</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
