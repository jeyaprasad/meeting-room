"""
app.py — Main Flask application
This replaces server.js

How to run:
    python app.py

The app will start on http://localhost:3000
"""

from flask import Flask, send_from_directory
from flask_cors import CORS
import os

from db import init_db
from controllers.auth_controller import register, login
from controllers.booking_controller import get_bookings, create_booking, delete_booking
from controllers.room_controller import get_all_rooms, get_available_rooms

# --- App Setup ---
app = Flask(__name__, static_folder="public", static_url_path="")
CORS(app)  # Allow the HTML frontend to call our API (like cors() in Express)


# --- Serve the HTML frontend ---
@app.route("/")
def index():
    """Serve bookings.html as the main page (same as app.get('/', ...) in server.js)"""
    return send_from_directory("public", "bookings.html")


# --- Room Routes (replaces roomRoutes.js) ---
@app.route("/register", methods=["POST"])
@app.route("/api/register", methods=["POST"])
def api_register():
    return register()


@app.route("/login", methods=["POST"])
@app.route("/api/login", methods=["POST"])
def api_login():
    return login()


# --- Room Routes (replaces roomRoutes.js) ---
@app.route("/rooms", methods=["GET"])
@app.route("/api/rooms", methods=["GET"])
def rooms():
    return get_all_rooms()


@app.route("/rooms/available", methods=["GET"])
@app.route("/api/rooms/available", methods=["GET"])
def rooms_available():
    return get_available_rooms()


# --- Booking Routes (replaces bookingRoutes.js) ---
@app.route("/bookings", methods=["GET"])
@app.route("/api/bookings", methods=["GET"])
def bookings_get():
    return get_bookings()


@app.route("/bookings", methods=["POST"])
@app.route("/api/bookings", methods=["POST"])
def bookings_create():
    return create_booking()


@app.route("/bookings/<int:booking_id>", methods=["DELETE"])
@app.route("/api/bookings/<int:booking_id>", methods=["DELETE"])
def bookings_delete(booking_id):
    return delete_booking(booking_id)


# --- Start the Server ---
if __name__ == "__main__":
    print("\n================================")
    print("Backend is running with Flask (Python)!")

    # Initialize database on startup (same as initDB() call in db.js)
    init_db()

    PORT = int(os.getenv("PORT", 3000))
    print(f"Listening on http://localhost:{PORT}")
    print("================================\n")

    app.run(port=PORT, debug=True)
