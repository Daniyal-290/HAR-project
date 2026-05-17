const express = require('express');
const router = express.Router();
const {
  createLog,
  createBatchLogs,
  getStats,
} = require('../controllers/activityController');

// POST  /api/activity-logs       — single log
router.post('/activity-logs', createLog);

// POST  /api/activity-logs/batch — batch insert
router.post('/activity-logs/batch', createBatchLogs);

// GET   /api/stats               — aggregated stats
router.get('/stats', getStats);

module.exports = router;
