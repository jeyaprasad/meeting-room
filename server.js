const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./src/db');

const roomRoutes = require('./src/routes/roomRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set up the default view to serve bookings.html as requested
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bookings.html'));
});

// Link up the MVC routers
app.use('/', roomRoutes);
app.use('/', bookingRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n================================`);
  console.log(`Backend is running on MVC Architecture!`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`================================\n`);
});
