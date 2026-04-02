import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def strip_finances():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    try:
        # Drop columns from ROOMS
        for col in ["price", "original_price", "discount", "amenities"]:
            try:
                cur.execute(f"ALTER TABLE rooms DROP COLUMN IF EXISTS {col}")
                print(f"Dropped {col} from rooms")
            except Exception as e:
                print(e)
                
        # Drop columns from BOOKINGS
        for col in ["total_cost", "payment_status"]:
            try:
                cur.execute(f"ALTER TABLE bookings DROP COLUMN IF EXISTS {col}")
                print(f"Dropped {col} from bookings")
            except Exception as e:
                print(e)

        conn.commit()
        print("Payment and legacy columns safely stripped from Postgres DB!")
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    strip_finances()
