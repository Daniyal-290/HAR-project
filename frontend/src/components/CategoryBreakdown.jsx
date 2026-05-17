import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';

const CATEGORY_COLORS = {
  Productivity: '#6366f1',
  'Health/Breaks': '#10b981',
  'Ergonomics/Posture': '#f59e0b',
  Other: '#64748b',
};

const CATEGORY_LABELS = {
  Productivity: { emoji: '💻', color: 'text-indigo-400' },
  'Health/Breaks': { emoji: '💪', color: 'text-emerald-400' },
  'Ergonomics/Posture': { emoji: '⚠️', color: 'text-amber-400' },
  Other: { emoji: '⏸️', color: 'text-slate-400' },
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const { category, count } = payload[0].payload;

  return (
    <div className="glass-card !p-3 text-xs">
      <p className="font-semibold text-white">{category}</p>
      <p className="text-slate-300 mt-0.5">{count} logs</p>
    </div>
  );
};

export default function CategoryBreakdown({ categoryData }) {
  const data = (categoryData || []).map((c) => ({
    ...c,
    name: c.category,
    value: c.count,
  }));

  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card"
    >
      <h3 className="text-sm font-semibold text-slate-200 mb-4 tracking-wide">
        Category Breakdown
      </h3>

      <div className="flex items-center gap-4">
        {/* Donut chart */}
        <div className="w-40 h-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.length > 0 ? data : [{ name: 'No data', value: 1 }]}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.length > 0 ? (
                  data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={CATEGORY_COLORS[entry.category] || '#64748b'}
                    />
                  ))
                ) : (
                  <Cell fill="rgba(255,255,255,0.05)" />
                )}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {data.length > 0 ? (
            data.map((entry) => {
              const label = CATEGORY_LABELS[entry.category] || CATEGORY_LABELS.Other;
              const pct = Math.round((entry.count / total) * 100);
              return (
                <div key={entry.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">
                      {label.emoji} {entry.category}
                    </span>
                    <span className={`font-semibold ${label.color}`}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[entry.category] }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-500">No activity data yet</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
