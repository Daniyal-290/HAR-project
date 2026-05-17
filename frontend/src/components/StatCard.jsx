import { motion } from 'framer-motion';

const CATEGORY_STYLES = {
  Productivity: {
    gradient: 'from-indigo-500 to-violet-500',
    iconBg: 'bg-indigo-500/20',
    textColor: 'text-indigo-400',
  },
  'Health/Breaks': {
    gradient: 'from-emerald-500 to-teal-400',
    iconBg: 'bg-emerald-500/20',
    textColor: 'text-emerald-400',
  },
  'Ergonomics/Posture': {
    gradient: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-500/20',
    textColor: 'text-amber-400',
  },
  default: {
    gradient: 'from-slate-500 to-slate-400',
    iconBg: 'bg-slate-500/20',
    textColor: 'text-slate-400',
  },
};

export default function StatCard({ icon: Icon, label, value, subtitle, category, index = 0 }) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass-card-hover relative overflow-hidden group"
    >
      {/* Gradient accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${style.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold text-white leading-none">
            {value}
          </p>
          {subtitle && (
            <p className={`text-xs mt-1.5 ${style.textColor}`}>
              {subtitle}
            </p>
          )}
        </div>

        {Icon && (
          <div className={`${style.iconBg} p-2.5 rounded-xl`}>
            <Icon className={`w-5 h-5 ${style.textColor}`} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
