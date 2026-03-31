const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Professional SVGs replacing emojis
const svgBoardroom = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
const svgTraining = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
const svgPod = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
const svgCreative = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"></line></svg>`;
const svgLuxury = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
const svgSprint = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;

const defaultRooms = [
  { id:1, name:'Executive Boardroom', location:'Anna Nagar', area:'anna', type:'boardroom', capacity:12, price:1499, original:2999, discount:'50% OFF', emoji: svgBoardroom, amenities:['HD Projector','VC Setup','Whiteboard','AC'] },
  { id:2, name:'Innovation Hub', location:'Nungambakkam', area:'nungam', type:'training', capacity:20, price:1999, original:3499, discount:'43% OFF', emoji: svgCreative, amenities:['Smart TV','Flip Charts','AC','Wifi'] },
  { id:3, name:'Focus Pod Alpha', location:'T. Nagar', area:'tnagar', type:'pod', capacity:4, price:499, original:999, discount:'50% OFF', emoji: svgPod, amenities:['Monitor','AC','Wifi','Locker'] },
  { id:4, name:'Tech Conference Room', location:'OMR / IT Corridor', area:'omr', type:'boardroom', capacity:16, price:1799, original:2999, discount:'40% OFF', emoji: svgBoardroom, amenities:['Dual Screen','VC Ready','Whiteboard','Tea'] },
  { id:5, name:'Skyview Suite', location:'Nungambakkam', area:'nungam', type:'boardroom', capacity:8, price:1299, original:2499, discount:'48% OFF', emoji: svgLuxury, amenities:['Projector','AC','Lounge','Wifi'] },
  { id:6, name:'Sprint Room', location:'Guindy', area:'guindy', type:'pod', capacity:6, price:699, original:1299, discount:'46% OFF', emoji: svgSprint, amenities:['TV Screen','Whiteboard','AC','Wifi'] },
  { id:7, name:'Training Hall A', location:'Anna Nagar', area:'anna', type:'training', capacity:30, price:2499, original:4999, discount:'50% OFF', emoji: svgTraining, amenities:['Projector','Mics','AC','Stage'] },
  { id:8, name:'Adyar Collaborate', location:'Adyar', area:'adyar', type:'pod', capacity:6, price:599, original:999, discount:'40% OFF', emoji: svgPod, amenities:['TV','Sofa','AC','Wifi'] },
];

async function initDB() {
  try {
    // Drop old schema safely to perform migration to the new map architecture
    await pool.query(`DROP TABLE IF EXISTS bookings CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS rooms CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS users CASCADE`);

    // Users Table (We now just insert generic users automatically during booking)
    await pool.query(`CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT, -- Might be null since registration isn't required anymore
      role TEXT DEFAULT 'user'
    )`);

    // Rooms Table with completely new attributes based on your design map
    await pool.query(`CREATE TABLE rooms (
      id integer PRIMARY KEY,
      name TEXT,
      location TEXT,
      area TEXT,
      type TEXT,
      capacity INTEGER,
      price INTEGER,
      original_price INTEGER,
      discount TEXT,
      emoji TEXT,
      amenities TEXT
    )`);

    // Bookings Table
    await pool.query(`CREATE TABLE bookings (
      id SERIAL PRIMARY KEY,
      ref TEXT UNIQUE,
      room_id INTEGER REFERENCES rooms(id),
      user_id INTEGER REFERENCES users(id),
      title TEXT,
      date TEXT,
      start_time TEXT,
      end_time TEXT,
      duration INTEGER,
      attendees INTEGER,
      addons TEXT,
      total_cost INTEGER,
      payment_status TEXT DEFAULT 'Confirmed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Seed Rooms
    const roomCountRes = await pool.query("SELECT COUNT(*) as count FROM rooms");
    if (parseInt(roomCountRes.rows[0].count) === 0) {
      for (const r of defaultRooms) {
        await pool.query(
          "INSERT INTO rooms (id, name, location, area, type, capacity, price, original_price, discount, emoji, amenities) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
          [r.id, r.name, r.location, r.area, r.type, r.capacity, r.price, r.original, r.discount, r.emoji, JSON.stringify(r.amenities)]
        );
      }
    }
    
    console.log("Database schema reset and initialized with professional SVGs successfully.");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
}

initDB();

module.exports = pool;
