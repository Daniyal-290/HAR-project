const mongoose = require('mongoose');

// ── Valid enums ────────────────────────────────────────────
const ACTIVITIES = [
  'Typing',
  'Writing on Paper',
  'Talking / In Meeting',
  'Drinking Water',
  'Eating',
  'Micro-Workout',
  'Using Mobile Phone',
  'Stretching',
  'Slouching (Tech Neck)',
  'Reading (Leaning/Squinting)',
  'Idle / Neutral',
];

const CATEGORIES = [
  'Productivity',
  'Health/Breaks',
  'Ergonomics/Posture',
  'Other',
];

// ── Schema ─────────────────────────────────────────────────
const activityLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: [true, 'user_id is required'],
      index: true,
      trim: true,
    },
    activity: {
      type: String,
      required: [true, 'activity is required'],
      enum: {
        values: ACTIVITIES,
        message: '{VALUE} is not a valid activity',
      },
    },
    category: {
      type: String,
      required: [true, 'category is required'],
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
    },
    confidence_score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    duration_seconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    landmarks_summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt
  }
);

// ── Compound indexes for efficient queries ─────────────────
activityLogSchema.index({ user_id: 1, timestamp: -1 });
activityLogSchema.index({ category: 1, timestamp: -1 });
activityLogSchema.index({ activity: 1, timestamp: -1 });

// ── Statics ────────────────────────────────────────────────
activityLogSchema.statics.ACTIVITIES = ACTIVITIES;
activityLogSchema.statics.CATEGORIES = CATEGORIES;

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
