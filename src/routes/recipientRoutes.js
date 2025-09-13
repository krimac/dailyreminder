const express = require('express');
const RecipientController = require('../controllers/recipientController');

const router = express.Router();

// Recipient routes
router.post('/', RecipientController.createRecipient);
router.get('/', RecipientController.getRecipients);
router.get('/:id', RecipientController.getRecipientById);
router.get('/email/:email', RecipientController.getRecipientByEmail);
router.put('/:id', RecipientController.updateRecipient);
router.delete('/:id', RecipientController.deleteRecipient);

// Event association routes
router.get('/:id/events', RecipientController.getRecipientEvents);
router.post('/:id/events', RecipientController.addRecipientToEvent);
router.delete('/:id/events/:eventId', RecipientController.removeRecipientFromEvent);

module.exports = router;