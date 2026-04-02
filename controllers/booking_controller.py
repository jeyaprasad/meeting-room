import json
from flask import request, jsonify
from db import get_connection


def get_bookings():
    """
    GET /bookings or /api/bookings
    Returns all bookings, optionally filtered by ?email=...
    Same as getBookings() in bookingController.js
    """
    email = request.args.get("email")

    conn = get_connection()
    cur = conn.cursor()

    try:
        if email:
            cur.execute("""
                SELECT b.id, b.ref, b.room_id, r.name AS room_name, r.location,
                       b.date, b.start_time, b.duration, b.total_cost, b.payment_status
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                JOIN users u ON b.user_id = u.id
                WHERE u.email = %s
                ORDER BY b.created_at DESC
            """, (email,))
        else:
            cur.execute("""
                SELECT b.id, b.ref, b.room_id, r.name AS room_name, r.location,
                       b.date, b.start_time, b.duration, b.total_cost, b.payment_status
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                JOIN users u ON b.user_id = u.id
                ORDER BY b.created_at DESC
            """)

        rows = cur.fetchall()

        # Format the result the same way as the JS controller
        result = []
        for row in rows:
            result.append({
                "id":       row[0],
                "ref":      row[1],
                "roomId":   row[2],
                "room":     row[3],
                "location": row[4],
                "date":     row[5],
                "time":     row[6],
                "hrs":      row[7],
                "total":    row[8],
                "status":   row[9],
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


def create_booking():
    """
    POST /bookings or /api/bookings
    Creates a new booking after finding or creating the user.
    Same as createBooking() in bookingController.js
    """
    data = request.get_json()

    ref     = data.get("ref")
    name    = data.get("name")
    email   = data.get("email")
    room_id = data.get("roomId")
    date    = data.get("date")
    time    = data.get("time")
    hrs     = data.get("hrs")
    total   = data.get("total")

    if not email or not name:
        return jsonify({"error": "Email and Name required"}), 400

    conn = get_connection()
    cur = conn.cursor()

    try:
        # Find or create the user
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cur.fetchone()

        if user is None:
            return jsonify({"error": "User authentication failed. Please sign in."}), 401
            
        user_id = user[0]

        # Insert the booking
        cur.execute("""
            INSERT INTO bookings (ref, room_id, user_id, date, start_time, duration, total_cost)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (ref, room_id, user_id, date, time, hrs, total))

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
    """
    DELETE /bookings/<id> or /api/bookings/<id>
    Cancels (deletes) a booking by ID.
    Same as deleteBooking() in bookingController.js
    """
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute(
            "DELETE FROM bookings WHERE id = %s RETURNING id",
            (booking_id,)
        )
        deleted = cur.fetchone()

        if deleted is None:
            return jsonify({"error": "Booking not found"}), 404

        conn.commit()
        return jsonify({"success": True, "message": "Booking deleted successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
