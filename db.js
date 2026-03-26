const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'data_v2.sqlite');
const db = new sqlite3.Database(dbPath);

const defaultRooms = [
  {id: 1, name: "Executive Boardroom", capacity: 20, icon: "🏛️", price: 5000, features: JSON.stringify(["4K Display", "Polycom System", "Catering"])},
  {id: 2, name: "Alpha Lab", capacity: 8, icon: "🔬", price: 1500, features: JSON.stringify(["Interactive Whiteboard", "Dual Monitors"])},
  {id: 3, name: "Beta Workspace", capacity: 10, icon: "📊", price: 2000, features: JSON.stringify(["Projector", "Conference Phone"])},
  {id: 4, name: "Focus Pod 1", capacity: 4, icon: "🎯", price: 500, features: JSON.stringify(["Soundproof", "Standing Desk"])},
  {id: 5, name: "Focus Pod 2", capacity: 4, icon: "🎯", price: 500, features: JSON.stringify(["Soundproof", "Natural Light"])},
  {id: 6, name: "War Room", capacity: 15, icon: "⚡", price: 3500, features: JSON.stringify(["Dual 4K Displays", "Video Call", "Whiteboards"])}
];

db.serialize(() => {
  // Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'employee'
  )`);

  // Rooms Table
  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY,
    name TEXT,
    capacity INTEGER,
    icon TEXT,
    price INTEGER,
    features TEXT
  )`, (err) => {
    if (!err) {
      db.get("SELECT COUNT(*) as count FROM rooms", (err, row) => {
        if (row && row.count === 0) {
          const stmt = db.prepare("INSERT INTO rooms (id, name, capacity, icon, price, features) VALUES (?, ?, ?, ?, ?, ?)");
          defaultRooms.forEach(r => stmt.run(r.id, r.name, r.capacity, r.icon, r.price, r.features));
          stmt.finalize();
        }
      });
    }
  });

  // Bookings Table
  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER,
    user_id INTEGER,
    title TEXT,
    date TEXT,
    start_time TEXT,
    end_time TEXT,
    attendees INTEGER,
    addons TEXT,
    payment_status TEXT DEFAULT 'Paid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(room_id) REFERENCES rooms(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Default Admin User
  db.get("SELECT * FROM users WHERE email = 'admin@meto.com'", async (err, row) => {
    if (!row && !err) {
      const hash = await bcrypt.hash('admin123', 10);
      db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", 
        ['System Admin', 'admin@meto.com', hash, 'admin']);
    }
  });
});

module.exports = db;
