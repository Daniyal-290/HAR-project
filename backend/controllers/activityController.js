const ActivityLog = require('../models/ActivityLog');

// ── POST /api/activity-logs ────────────────────────────────
// Ingest a single activity classification from the Python HAR pipeline.
exports.createLog = async (req, res, next) => {
  try {
    const { user_id, activity, category, timestamp, confidence_score, landmarks_summary } = req.body;

    const log = await ActivityLog.create({
      user_id,
      activity,
      category,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      confidence_score,
      landmarks_summary,
    });

    res.status(201).json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/activity-logs/batch ──────────────────────────
// Batch insert multiple activity logs.
exports.createBatchLogs = async (req, res, next) => {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ success: false, message: 'logs must be a non-empty array' });
    }

    const docs = logs.map((l) => ({
      user_id: l.user_id,
      activity: l.activity,
      category: l.category,
      timestamp: l.timestamp ? new Date(l.timestamp) : new Date(),
      confidence_score: l.confidence_score,
      landmarks_summary: l.landmarks_summary || {},
    }));

    const result = await ActivityLog.insertMany(docs, { ordered: false });
    res.status(201).json({ success: true, count: result.length });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/stats ─────────────────────────────────────────
// Aggregated statistics for the current day (or week).
exports.getStats = async (req, res, next) => {
  try {
    const userId = req.query.user_id || 'default_user';
    const range = req.query.range || 'day'; // 'day' | 'week'

    // ── Date range ─────────────────────────────────────────
    const now = new Date();
    let startDate;
    if (range === 'week') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    }

    const matchStage = {
      $match: {
        user_id: userId,
        timestamp: { $gte: startDate, $lte: now },
      },
    };

    // ── Aggregation pipeline with $facet ───────────────────
    const pipeline = [
      matchStage,
      {
        $facet: {
          // Total count
          totals: [
            {
              $group: {
                _id: null,
                total_logs: { $sum: 1 },
                total_duration_seconds: { $sum: '$duration_seconds' },
                avg_confidence: { $avg: '$confidence_score' },
              },
            },
          ],

          // Breakdown by activity
          by_activity: [
            {
              $group: {
                _id: '$activity',
                count: { $sum: 1 },
                total_seconds: { $sum: '$duration_seconds' },
                avg_confidence: { $avg: '$confidence_score' },
              },
            },
            {
              $project: {
                _id: 0,
                activity: '$_id',
                count: 1,
                total_minutes: { $round: [{ $divide: ['$total_seconds', 60] }, 1] },
                avg_confidence: { $round: ['$avg_confidence', 3] },
              },
            },
            { $sort: { count: -1 } },
          ],

          // Breakdown by category
          by_category: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                total_seconds: { $sum: '$duration_seconds' },
              },
            },
            {
              $project: {
                _id: 0,
                category: '$_id',
                count: 1,
                total_minutes: { $round: [{ $divide: ['$total_seconds', 60] }, 1] },
              },
            },
            { $sort: { count: -1 } },
          ],

          // Ergonomic alerts (Slouching, Reading/Squinting)
          ergonomic_alerts: [
            {
              $match: {
                category: 'Ergonomics/Posture',
              },
            },
            {
              $group: {
                _id: '$activity',
                count: { $sum: 1 },
                total_seconds: { $sum: '$duration_seconds' },
                avg_confidence: { $avg: '$confidence_score' },
              },
            },
            {
              $project: {
                _id: 0,
                activity: '$_id',
                count: 1,
                total_minutes: { $round: [{ $divide: ['$total_seconds', 60] }, 1] },
                severity: {
                  $cond: [{ $gte: ['$count', 20] }, 'critical', { $cond: [{ $gte: ['$count', 10] }, 'warning', 'info'] }],
                },
              },
            },
          ],

          // Health highlights (positive breaks)
          health_highlights: [
            {
              $match: {
                activity: { $in: ['Stretching', 'Drinking Water', 'Micro-Workout'] },
              },
            },
            {
              $group: {
                _id: '$activity',
                count: { $sum: 1 },
                total_seconds: { $sum: '$duration_seconds' },
              },
            },
            {
              $project: {
                _id: 0,
                activity: '$_id',
                count: 1,
                total_minutes: { $round: [{ $divide: ['$total_seconds', 60] }, 1] },
              },
            },
          ],

          // Hourly distribution (for timeline chart)
          hourly: [
            {
              $group: {
                _id: {
                  hour: { $hour: '$timestamp' },
                  category: '$category',
                },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                hour: '$_id.hour',
                category: '$_id.category',
                count: 1,
              },
            },
            { $sort: { hour: 1 } },
          ],
        },
      },
    ];

    const [result] = await ActivityLog.aggregate(pipeline);

    const totals = result.totals[0] || { total_logs: 0, total_duration_seconds: 0, avg_confidence: 0 };

    res.json({
      success: true,
      data: {
        date: startDate.toISOString().slice(0, 10),
        range,
        total_logs: totals.total_logs,
        total_active_minutes: Math.round(totals.total_duration_seconds / 60),
        avg_confidence: Math.round((totals.avg_confidence || 0) * 100),
        by_activity: result.by_activity,
        by_category: result.by_category,
        ergonomic_alerts: result.ergonomic_alerts,
        health_highlights: result.health_highlights,
        hourly: result.hourly,
      },
    });
  } catch (err) {
    next(err);
  }
};
