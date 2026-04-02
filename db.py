import os
import json
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# --- Database Seeding Defaults ---
DEFAULT_ROOMS = [
    { "id": 1,  "name": "Executive Boardroom",   "location": "Anna Nagar",       "area": "anna",    "type": "boardroom", "capacity": 12, "price": 1499, "original_price": 2999, "discount": "50% OFF", "amenities": ["HD Projector", "VC Setup", "Whiteboard", "AC"] },
    { "id": 2,  "name": "Innovation Hub",         "location": "Nungambakkam",     "area": "nungam",  "type": "training",  "capacity": 20, "price": 1999, "original_price": 3499, "discount": "43% OFF", "amenities": ["Smart TV", "Flip Charts", "AC", "Wifi"] },
    { "id": 3,  "name": "Focus Pod Alpha",         "location": "T. Nagar",         "area": "tnagar",  "type": "pod",       "capacity": 4,  "price": 499,  "original_price": 999,  "discount": "50% OFF", "amenities": ["Monitor", "AC", "Wifi", "Locker"] },
    { "id": 4,  "name": "Tech Conference Room",    "location": "OMR / IT Corridor","area": "omr",     "type": "boardroom", "capacity": 16, "price": 1799, "original_price": 2999, "discount": "40% OFF", "amenities": ["Dual Screen", "VC Ready", "Whiteboard", "Tea"] },
    { "id": 5,  "name": "Skyview Suite",           "location": "Nungambakkam",     "area": "nungam",  "type": "boardroom", "capacity": 8,  "price": 1299, "original_price": 2499, "discount": "48% OFF", "amenities": ["Projector", "AC", "Lounge", "Wifi"] },
    { "id": 6,  "name": "Sprint Room",             "location": "Guindy",           "area": "guindy",  "type": "pod",       "capacity": 6,  "price": 699,  "original_price": 1299, "discount": "46% OFF", "amenities": ["TV Screen", "Whiteboard", "AC", "Wifi"] }
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
                password TEXT,
                role TEXT DEFAULT 'user'
            )
        """)

        # Create rooms table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY,
                name TEXT,
                location TEXT,
                area TEXT,
                type TEXT,
                capacity INTEGER,
                price INTEGER,
                original_price INTEGER,
                discount TEXT,
                amenities TEXT
            )
        """)

        # Create bookings table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
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
            )
        """)

        # Seed rooms data
        cur.execute("SELECT COUNT(*) FROM rooms")
        count = cur.fetchone()[0]
        if count == 0:
            for r in DEFAULT_ROOMS:
                cur.execute(
                    """INSERT INTO rooms
                       (id, name, location, area, type, capacity, price, original_price, discount, amenities)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                    (
                        r["id"], r["name"], r["location"], r["area"], r["type"],
                        r["capacity"], r["price"], r["original_price"], r["discount"],
                        json.dumps(r["amenities"])
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
