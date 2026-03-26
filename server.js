const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const JWT_SECRET = 'super-secret-meto-key';

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'bookings.html'));
});

// Auth Routes
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hash], function(err) {
      if (err) return res.status(400).json({ error: 'Email already exists' });
      
      const token = jwt.sign({ id: this.lastID, email, name, role: 'employee' }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: this.lastID, name, email, role: 'employee' } });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
});

// Rooms Routes
app.get('/api/rooms', (req, res) => {
  db.all("SELECT * FROM rooms", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const rooms = rows.map(r => ({ ...r, features: JSON.parse(r.features) }));
    res.json(rooms);
  });
});

// Bookings Routes (Public Read)
app.get('/api/bookings', (req, res) => {
  const query = `
    SELECT b.*, r.name as roomName, r.price as price, u.name as name
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN users u ON b.user_id = u.id
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const formatted = rows.map(r => ({
      id: r.id,
      roomId: r.room_id,
      userId: r.user_id,
      roomName: r.roomName,
      price: r.price,
      name: r.name,
      title: r.title,
      date: r.date,
      startTime: r.start_time,
      endTime: r.end_time,
      attendees: r.attendees,
      addons: r.addons ? JSON.parse(r.addons) : [],
      paymentStatus: r.payment_status,
      createdAt: r.created_at
    }));
    res.json(formatted);
  });
});

// Create Booking (Protected)
app.post('/api/bookings', authenticateToken, (req, res) => {
  const { roomId, title, date, startTime, endTime, attendees, addons, paymentStatus } = req.body;
  const userId = req.user.id;
  
  const query = `INSERT INTO bookings (room_id, user_id, title, date, start_time, end_time, attendees, addons, payment_status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                 
  const addonsStr = addons ? JSON.stringify(addons) : '[]';
  const status = paymentStatus || 'Paid';

  db.run(query, [roomId, userId, title, date, startTime, endTime, attendees, addonsStr, status], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

// Delete Booking (Protected)
app.delete('/api/bookings/:id', authenticateToken, (req, res) => {
  const bookingId = req.params.id;
  
  db.get("SELECT user_id FROM bookings WHERE id = ?", [bookingId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Booking not found' });
    
    if (row.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    db.run("DELETE FROM bookings WHERE id = ?", [bookingId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n================================`);
  console.log(`Backend is running!`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`================================\n`);
});
