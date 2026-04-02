import os
import json
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# --- Database Seeding Defaults ---
DEFAULT_ROOMS = [
# --- Database Seeding Defaults ---
DEFAULT_ROOMS = [
# --- Database Seeding Defaults ---
DEFAULT_ROOMS = [
    { "id": 1,  "name": "Executive Boardroom",   "location": "Anna Nagar",       "type": "boardroom", "capacity": 12 },
    { "id": 2,  "name": "Innovation Hub",         "location": "Nungambakkam",     "type": "training",  "capacity": 20 },
    { "id": 3,  "name": "Focus Pod Alpha",         "location": "T. Nagar",         "type": "pod",       "capacity": 4 },
    { "id": 4,  "name": "Tech Conference Room",    "location": "OMR / IT Corridor","type": "boardroom", "capacity": 16 },
    { "id": 5,  "name": "Skyview Suite",           "location": "Nungambakkam",     "type": "boardroom", "capacity": 8 },
    { "id": 6,  "name": "Sprint Room",             "location": "Guindy",           "type": "pod",       "capacity": 6 }
]

def get_connection():
    """Create and return a new database connection."""
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def init_db():
    """Initialize database tables and seed if empty."""
    conn = get_connection()
    cur = conn.cursor()

    try:
        # Create users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT,
                email TEXT UNIQUE,
                password TEXT
            )
        """)

        # Create rooms table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY,
                name TEXT,
                location TEXT,
                type TEXT,
                capacity INTEGER
            )
        """)

        # Create bookings table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                ref TEXT UNIQUE,
                room_id INTEGER REFERENCES rooms(id),
                user_id INTEGER REFERENCES users(id),
                date TEXT,
                start_time TEXT,
                duration INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Seed rooms data
        cur.execute("SELECT COUNT(*) FROM rooms")
        count = cur.fetchone()[0]
        if count == 0:
            for r in DEFAULT_ROOMS:
                cur.execute(
                    """INSERT INTO rooms
                       (id, name, location, type, capacity)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (
                        r["id"], r["name"], r["location"], r["type"], r["capacity"]
                    )
                )

        conn.commit()
        print("✅ Database initialized successfully.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Database initialization failed: {e}")
    finally:
        cur.close()
        conn.close()
