const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.get(['/api/bookings', '/bookings'], bookingController.getBookings);
router.post(['/api/bookings', '/bookings'], bookingController.createBooking);

module.exports = router;
