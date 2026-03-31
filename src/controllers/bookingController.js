const db = require('../db');

exports.getBookings = async (req, res) => {
  const { email } = req.query;
  let query = `
    SELECT b.*, r.name as "roomName", r.location as "location", r.emoji as "emoji"
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN users u ON b.user_id = u.id
  `;
  const params = [];
  
  if (email) {
    query += ` WHERE u.email = $1 ORDER BY b.created_at DESC`;
    params.push(email);
  } else {
    query += ` ORDER BY b.created_at DESC`;
  }

  try {
    const result = await db.query(query, params);
    const formatted = result.rows.map(r => ({
      id: r.id,
      ref: r.ref,
      roomId: r.room_id,
      room: r.roomName,
      location: r.location,
      emoji: r.emoji,
      date: r.date,
      time: r.start_time,
      hrs: r.duration,
      total: r.total_cost,
      status: r.payment_status
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.createBooking = async (req, res) => {
  const { ref, name, email, roomId, date, time, hrs, total } = req.body;
  
  if(!email || !name) return res.status(400).json({error: "Email and Name required"});

  try {
    let userResult = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    let userId;
    if (userResult.rows.length === 0) {
      const newU = await db.query("INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id", [name, email]);
      userId = newU.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    const query = `INSERT INTO bookings (ref, room_id, user_id, date, start_time, duration, total_cost) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
    
    const result = await db.query(query, [ref, roomId, userId, date, time, hrs, total]);
    res.json({ success: true, id: result.rows[0].id });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
