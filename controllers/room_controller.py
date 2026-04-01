import json
from datetime import datetime
from flask import request, jsonify
from db import get_connection


def get_all_rooms():
    """
    GET /rooms or /api/rooms
    Returns all rooms from the database.
    Same as getAllRooms() in roomController.js
    """
    conn = get_connection()
    cur = conn.cursor()

    try:
        cur.execute("SELECT * FROM rooms ORDER BY id ASC")
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]

        rooms = []
        for row in rows:
            room = dict(zip(columns, row))
            # Parse amenities from JSON string back to a list
            room["amenities"] = json.loads(room["amenities"])
            rooms.append(room)

        return jsonify(rooms)

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


def get_available_rooms():
    """
    GET /rooms/available or /api/rooms/available
    Returns rooms that are NOT booked at the given date/time/duration.
    Same as getAvailableRooms() in roomController.js

    Query params: ?date=YYYY-MM-DD&time=HH:MM&duration=N
    """
    date     = request.args.get("date")
    time_str = request.args.get("time")
    duration = request.args.get("duration")

    conn = get_connection()
    cur = conn.cursor()

    try:
        # Fetch all rooms
        cur.execute("SELECT * FROM rooms ORDER BY id ASC")
        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
        all_rooms = []
        for row in rows:
            room = dict(zip(columns, row))
            room["amenities"] = json.loads(room["amenities"])
            all_rooms.append(room)

        # Figure out the filter window (in minutes since midnight)
        if date and time_str and duration:
            h, m = map(int, time_str.split(":"))
            filter_start = h * 60 + m
            filter_end   = filter_start + int(duration) * 60
            filter_date  = date
        else:
            now = datetime.now()
            filter_date  = date or now.strftime("%Y-%m-%d")
            filter_start = now.hour * 60 + now.minute
            filter_end   = filter_start + 60  # default: 1 hour window

        # Find bookings on that date
        cur.execute(
            "SELECT room_id, start_time, duration FROM bookings WHERE date = %s",
            (filter_date,)
        )
        day_bookings = cur.fetchall()

        # Collect IDs of rooms that overlap with the requested window
        unavailable_ids = set()
        for booking in day_bookings:
            b_room_id, b_start_str, b_duration = booking
            if not b_start_str or not b_duration:
                continue
            bh, bm = map(int, b_start_str.split(":"))
            b_start = bh * 60 + bm
            b_end   = b_start + int(b_duration) * 60

            # Overlap check (same logic as JS)
            if filter_start < b_end and filter_end > b_start:
                unavailable_ids.add(b_room_id)

        available_rooms = [r for r in all_rooms if r["id"] not in unavailable_ids]

        return jsonify({
            "available_rooms_count": len(available_rooms),
            "available_rooms": available_rooms
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
