const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'bookings.html'));
});

const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data if not exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ bookings: [], nextId: 1000 }, null, 2));
}

function readData() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { bookings: [], nextId: 1000 };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Get all bookings
app.get('/api/bookings', (req, res) => {
  const data = readData();
  res.json(data.bookings);
});

// Create a new booking
app.post('/api/bookings', (req, res) => {
  const data = readData();
  const booking = req.body;
  
  data.nextId++;
  booking.id = `BK-${data.nextId}`;
  booking.createdAt = new Date().toISOString();
  
  data.bookings.push(booking);
  writeData(data);
  
  res.json(booking);
});

// Delete a booking
app.delete('/api/bookings/:id', (req, res) => {
  const data = readData();
  const idToRemove = req.params.id;
  
  const initialLength = data.bookings.length;
  data.bookings = data.bookings.filter(b => b.id !== idToRemove);
  
  if (data.bookings.length < initialLength) {
    writeData(data);
    res.json({ success: true, message: 'Booking removed' });
  } else {
    res.status(404).json({ error: 'Booking not found' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n================================`);
  console.log(`Backend is running!`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`================================\n`);
});
