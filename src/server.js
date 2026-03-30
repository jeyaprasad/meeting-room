const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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
  res.sendFile(path.join(__dirname, '../public', 'bookings.html'));
});

// Auth Routes
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
      [name, email, hash]
    );
    const newId = result.rows[0].id;
      
    const token = jwt.sign({ id: newId, email, name, role: 'employee' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: newId, name, email, role: 'employee' } });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch(err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Rooms Routes
app.get('/api/rooms', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM rooms");
    const rooms = result.rows.map(r => ({ ...r, features: JSON.parse(r.features) }));
    res.json(rooms);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Bookings Routes (Public Read)
app.get('/api/bookings', async (req, res) => {
  const query = `
    SELECT b.*, r.name as "roomName", r.price as price, u.name as name
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN users u ON b.user_id = u.id
  `;
  try {
    const result = await db.query(query);
    const formatted = result.rows.map(r => ({
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Booking (Protected)
app.post('/api/bookings', authenticateToken, async (req, res) => {
  const { roomId, title, date, startTime, endTime, attendees, addons, paymentStatus } = req.body;
  const userId = req.user.id;
  
  const query = `INSERT INTO bookings (room_id, user_id, title, date, start_time, end_time, attendees, addons, payment_status) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`;
                 
  const addonsStr = addons ? JSON.stringify(addons) : '[]';
  const status = paymentStatus || 'Paid';

  try {
    const result = await db.query(query, [roomId, userId, title, date, startTime, endTime, attendees, addonsStr, status]);
    res.json({ id: result.rows[0].id });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Booking (Protected)
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  const bookingId = req.params.id;
  
  try {
    const checkUser = await db.query("SELECT user_id FROM bookings WHERE id = $1", [bookingId]);
    const row = checkUser.rows[0];
    if (!row) return res.status(404).json({ error: 'Booking not found' });
    
    if (row.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await db.query("DELETE FROM bookings WHERE id = $1", [bookingId]);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n================================`);
  console.log(`Backend is running!`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`================================\n`);
});
