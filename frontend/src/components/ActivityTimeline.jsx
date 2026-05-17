import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

const CATEGORY_COLORS = {
  Productivity: '#6366f1',
  'Health/Breaks': '#10b981',
  'Ergonomics/Posture': '#f59e0b',
  Other: '#64748b',
};

function buildHourlyData(hourlyRaw) {
  // Create a 24-hour array with counts per category
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, '0')}:00`,
    Productivity: 0,
    'Health/Breaks': 0,
    'Ergonomics/Posture': 0,
    Other: 0,
  }));

  if (hourlyRaw) {
    hourlyRaw.forEach(({ hour, category, count }) => {
      if (hours[hour]) {
        hours[hour][category] = (hours[hour][category] || 0) + count;
      }
    });
  }

  // Only return hours with data + surrounding hours for context
  const hasData = hours.some((h) =>
    h.Productivity + h['Health/Breaks'] + h['Ergonomics/Posture'] + h.Other > 0
  );

  if (!hasData) {
    // Return business hours placeholder
    return hours.slice(8, 19);
  }

  // Find first and last hours with data, add padding
  let first = hours.findIndex((h) =>
    h.Productivity + h['Health/Breaks'] + h['Ergonomics/Posture'] + h.Other > 0
  );
  let last = hours.length - 1 - [...hours].reverse().findIndex((h) =>
    h.Productivity + h['Health/Breaks'] + h['Ergonomics/Posture'] + h.Other > 0
  );

  first = Math.max(0, first - 1);
  last = Math.min(23, last + 1);

  return hours.slice(first, last + 1);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;

  return (
    <div className="glass-card !p-3 text-xs">
      <p className="font-semibold text-white mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="font-medium text-white">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ActivityTimeline({ hourlyData }) {
  const data = buildHourlyData(hourlyData);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card"
    >
      <h3 className="text-sm font-semibold text-slate-200 mb-4 tracking-wide">
        Activity Timeline
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="hour"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            />
            <Bar dataKey="Productivity" stackId="a" fill={CATEGORY_COLORS.Productivity} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Health/Breaks" stackId="a" fill={CATEGORY_COLORS['Health/Breaks']} />
            <Bar dataKey="Ergonomics/Posture" stackId="a" fill={CATEGORY_COLORS['Ergonomics/Posture']} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
