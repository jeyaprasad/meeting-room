import json
from flask import request, jsonify
from db import get_connection

def get_bookings():
    """GET /bookings - Returns all bookings, optionally filtered by ?email="""
    email = request.args.get("email")
    conn = get_connection()
    cur = conn.cursor()
    try:
        query = """
            SELECT b.id, b.room_id, r.name AS room_name, r.location,
                   b.date, b.start_time, b.duration
            FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN users u ON b.user_id = u.id
            {} ORDER BY b.created_at DESC
        """
        cur.execute(query.format("WHERE u.email = %s" if email else ""), (email,) if email else ())
        res = [
            {"id":r[0], "roomId":r[1], "room":r[2], "location":r[3], "date":r[4], 
             "time":r[5], "hrs":r[6]} for r in cur.fetchall()
        ]
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

def create_booking():
    """POST /bookings - Creates a booking."""
    data = request.get_json()
    name, email = data.get("name"), data.get("email")
    room_id, date, time = data.get("roomId"), data.get("date"), data.get("time")
    hrs = data.get("hrs")

    if not email or not name:
        return jsonify({"error": "Email and Name required"}), 400

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        if user is None:
            return jsonify({"error": "User authentication failed. Please sign in."}), 401
            
        cur.execute("INSERT INTO bookings (room_id, user_id, date, start_time, duration) VALUES (%s, %s, %s, %s, %s) RETURNING id", (room_id, user[0], date, time, hrs))
        new_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({"success": True, "id": new_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

def delete_booking(booking_id):
    """DELETE /bookings/<id> - Cancels a booking by ID."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM bookings WHERE id = %s RETURNING id", (booking_id,))
        if cur.fetchone() is None:
            return jsonify({"error": "Booking not found"}), 404
        conn.commit()
        return jsonify({"success": True, "message": "Booking deleted successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
