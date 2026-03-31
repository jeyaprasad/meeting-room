const db = require('../db');

exports.getAllRooms = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM rooms ORDER BY id ASC");
    const rooms = result.rows.map(r => ({ ...r, amenities: JSON.parse(r.amenities) }));
    res.json(rooms);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAvailableRooms = async (req, res) => {
  try {
    const { date, time, duration } = req.query;
    
    const result = await db.query("SELECT * FROM rooms ORDER BY id ASC");
    const allRooms = result.rows.map(r => ({ ...r, amenities: JSON.parse(r.amenities) }));

    let filterDate = date;
    let filterStart = null;
    let filterEnd = null;

    if (date && time && duration) {
      filterStart = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
      filterEnd = filterStart + parseInt(duration) * 60;
    } else {
      const now = new Date();
      filterDate = filterDate || now.toISOString().split('T')[0];
      const hours = now.getHours();
      const minutes = now.getMinutes();
      filterStart = hours * 60 + minutes;
      filterEnd = filterStart + 60; 
    }

    const bookingsRes = await db.query("SELECT room_id, start_time, duration FROM bookings WHERE date = $1", [filterDate]);
    const dayBookings = bookingsRes.rows;
    
    const unavailableRoomIds = new Set();
    
    dayBookings.forEach(b => {
      if(!b.start_time || !b.duration) return;
      const bStart = parseInt(b.start_time.split(':')[0]) * 60 + parseInt(b.start_time.split(':')[1]);
      const bEnd = bStart + parseInt(b.duration) * 60;
      
      if (filterStart < bEnd && filterEnd > bStart) {
        unavailableRoomIds.add(b.room_id);
      }
    });

    const availableRooms = allRooms.filter(r => !unavailableRoomIds.has(r.id));
    res.json({ available_rooms_count: availableRooms.length, available_rooms: availableRooms });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
};
