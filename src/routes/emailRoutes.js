const express = require('express');
const EmailController = require('../controllers/emailController');

const router = express.Router();

// Email service management
router.get('/status', EmailController.getEmailStatus);
router.post('/test', EmailController.sendTestEmail);

// Email statistics and history
router.get('/stats', EmailController.getEmailStats);
router.get('/history', EmailController.getEmailHistory);

// Manual digest and notification triggers
router.post('/digest/:email', EmailController.triggerDailyDigest);
router.post('/check-notifications', EmailController.triggerNotificationCheck);
router.post('/weekly-digest', EmailController.sendWeeklyDigest);

// Scheduler management
router.get('/scheduler/stats', EmailController.getSchedulerStats);
router.post('/scheduler/restart', EmailController.restartScheduler);

// Cleanup operations
router.delete('/cleanup', EmailController.cleanupNotifications);

module.exports = router;