const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const defaultRooms = [
  {id: 1, name: "Executive Boardroom", capacity: 20, icon: "🏛️", price: 5000, features: JSON.stringify(["4K Display", "Polycom System", "Catering"])},
  {id: 2, name: "Alpha Lab", capacity: 8, icon: "🔬", price: 1500, features: JSON.stringify(["Interactive Whiteboard", "Dual Monitors"])},
  {id: 3, name: "Beta Workspace", capacity: 10, icon: "📊", price: 2000, features: JSON.stringify(["Projector", "Conference Phone"])},
  {id: 4, name: "Focus Pod 1", capacity: 4, icon: "🎯", price: 500, features: JSON.stringify(["Soundproof", "Standing Desk"])},
  {id: 5, name: "Focus Pod 2", capacity: 4, icon: "🎯", price: 500, features: JSON.stringify(["Soundproof", "Natural Light"])},
  {id: 6, name: "War Room", capacity: 15, icon: "⚡", price: 3500, features: JSON.stringify(["Dual 4K Displays", "Video Call", "Whiteboards"])}
];

async function initDB() {
  try {
    // Users Table
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'employee'
    )`);

    // Rooms Table
    await pool.query(`CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      name TEXT,
      capacity INTEGER,
      icon TEXT,
      price INTEGER,
      features TEXT
    )`);

    // Check rooms
    const roomCountRes = await pool.query("SELECT COUNT(*) as count FROM rooms");
    if (parseInt(roomCountRes.rows[0].count) === 0) {
      for (const r of defaultRooms) {
        await pool.query(
          "INSERT INTO rooms (id, name, capacity, icon, price, features) VALUES ($1, $2, $3, $4, $5, $6)",
          [r.id, r.name, r.capacity, r.icon, r.price, r.features]
        );
      }
    }

    // Bookings Table
    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      room_id INTEGER REFERENCES rooms(id),
      user_id INTEGER REFERENCES users(id),
      title TEXT,
      date TEXT,
      start_time TEXT,
      end_time TEXT,
      attendees INTEGER,
      addons TEXT,
      payment_status TEXT DEFAULT 'Paid',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Default Admin User
    const adminRes = await pool.query("SELECT * FROM users WHERE email = $1", ['admin@meto.com']);
    if (adminRes.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
        ['System Admin', 'admin@meto.com', hash, 'admin']
      );
    }
    
    console.log("Database initialized successfully.");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}

initDB();

module.exports = pool;
