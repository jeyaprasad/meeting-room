import json
from datetime import datetime
from flask import request, jsonify
from db import get_connection

def get_all_rooms():
    """GET /rooms - Returns all rooms from the database."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM rooms ORDER BY id ASC")
        columns = [desc[0] for desc in cur.description]
        rooms = [dict(zip(columns, row)) for row in cur.fetchall()]
        for room in rooms:
            room["amenities"] = json.loads(room["amenities"])
        return jsonify(rooms)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

def get_available_rooms():
    """GET /rooms/available - Returns rooms not booked in given window."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM rooms ORDER BY id ASC")
        columns = [desc[0] for desc in cur.description]
        all_rooms = [dict(zip(columns, row)) for row in cur.fetchall()]
        for room in all_rooms:
            room["amenities"] = json.loads(room["amenities"])

        date, time_str, duration, loc_param = request.args.get("date"), request.args.get("time"), request.args.get("duration"), request.args.get("location")
        if date and time_str and duration:
            h, m = map(int, time_str.split(":"))
            filter_start, filter_end = h * 60 + m, (h * 60 + m) + int(duration) * 60
            filter_date = date
        else:
            now = datetime.now()
            filter_date = date or now.strftime("%Y-%m-%d")
            filter_start = now.hour * 60 + now.minute
            filter_end = filter_start + 60 

        cur.execute("SELECT room_id, start_time, duration FROM bookings WHERE date = %s", (filter_date,))
        unavailable_ids = {
            b[0] for b in cur.fetchall() if b[1] and b[2] and 
            filter_start < (int(b[1].split(":")[0]) * 60 + int(b[1].split(":")[1]) + int(b[2]) * 60) and 
            filter_end > (int(b[1].split(":")[0]) * 60 + int(b[1].split(":")[1]))
        }

        available_rooms = [r for r in all_rooms if r["id"] not in unavailable_ids]
        if loc_param:
            available_rooms = [r for r in available_rooms if r["location"].lower() == loc_param.lower()]

        return jsonify({"available_rooms_count": len(available_rooms), "available_rooms": available_rooms})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
