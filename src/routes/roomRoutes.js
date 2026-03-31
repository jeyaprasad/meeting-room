const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.get(['/api/rooms', '/rooms'], roomController.getAllRooms);
router.get(['/api/rooms/available', '/rooms/available'], roomController.getAvailableRooms);

module.exports = router;
