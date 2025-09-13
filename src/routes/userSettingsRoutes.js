const express = require('express');
const UserSettingsController = require('../controllers/userSettingsController');

const router = express.Router();

// User settings routes
router.post('/', UserSettingsController.createOrUpdateSettings);
router.get('/', UserSettingsController.getAllSettings);
router.get('/timezones', UserSettingsController.getTimezones);
router.get('/:id', UserSettingsController.getSettingsById);
router.get('/email/:email', UserSettingsController.getSettingsByEmail);
router.put('/:id', UserSettingsController.updateSettings);
router.delete('/:id', UserSettingsController.deleteSettings);

// Digest preferences routes
router.put('/email/:email/digest', UserSettingsController.updateDigestPreferences);

module.exports = router;