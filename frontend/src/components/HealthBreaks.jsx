import { motion } from 'framer-motion';
import { Droplets, Dumbbell, StretchHorizontal, Check } from 'lucide-react';

const HEALTH_CONFIG = {
  'Drinking Water': {
    icon: Droplets,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    target: 8,
    unit: 'times',
    tip: 'Stay hydrated! Aim for 8+ glasses.',
  },
  Stretching: {
    icon: StretchHorizontal,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    target: 6,
    unit: 'sessions',
    tip: 'Great for circulation! Aim for every hour.',
  },
  'Micro-Workout': {
    icon: Dumbbell,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    target: 4,
    unit: 'sessions',
    tip: 'Quick desk exercises boost energy!',
  },
};

export default function HealthBreaks({ healthData }) {
  const items = Object.entries(HEALTH_CONFIG).map(([activity, cfg]) => {
    const match = (healthData || []).find((h) => h.activity === activity);
    return {
      activity,
      ...cfg,
      count: match?.count || 0,
      total_minutes: match?.total_minutes || 0,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="glass-card"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">💪</span>
        <h3 className="text-sm font-semibold text-slate-200 tracking-wide">
          Health Breaks
        </h3>
      </div>

      <div className="space-y-4">
        {items.map((item, i) => {
          const progress = Math.min((item.count / item.target) * 100, 100);
          const isComplete = item.count >= item.target;
          const Icon = item.icon;

          return (
            <motion.div
              key={item.activity}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`${item.bgColor} p-1.5 rounded-lg`}>
                    <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-300">
                    {item.activity}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${item.color}`}>
                    {item.count}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    / {item.target} {item.unit}
                  </span>
                  {isComplete && (
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center ml-0.5">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.7 + i * 0.1 }}
                  className={`h-full rounded-full ${
                    isComplete
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : `bg-gradient-to-r ${
                          item.activity === 'Drinking Water'
                            ? 'from-cyan-500 to-cyan-400'
                            : item.activity === 'Stretching'
                            ? 'from-emerald-500 to-emerald-400'
                            : 'from-violet-500 to-violet-400'
                        }`
                  }`}
                />
              </div>

              {item.total_minutes > 0 && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {item.total_minutes} min total
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Tip */}
      <div className="mt-4 pt-3 border-t border-white/5">
        <p className="text-[10px] text-slate-500 italic">
          💡 Take a break every 45–60 minutes for optimal health.
        </p>
      </div>
    </motion.div>
  );
}
