const express = require('express');
const EventController = require('../controllers/eventController');

const router = express.Router();

// Event routes
router.post('/', EventController.createEvent);
router.get('/', EventController.getEvents);
router.get('/upcoming', EventController.getUpcomingEvents);
router.get('/:id', EventController.getEventById);
router.put('/:id', EventController.updateEvent);
router.delete('/:id', EventController.deleteEvent);

module.exports = router;