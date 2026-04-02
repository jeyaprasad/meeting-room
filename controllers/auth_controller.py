from flask import request, jsonify
from db import get_connection

def register():
    """
    POST /api/register
    Expects { "name": "...", "email": "...", "password": "..." }
    Saves the user with a plain password.
    """
    data = request.get_json()

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not name or not email or not password:
        return jsonify({"error": "Name, Email, and Password are required"}), 400

    conn = get_connection()
    cur = conn.cursor()

    try:
        # Check if email is already registered
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({"error": "Email is already registered"}), 409

        cur.execute(
            "INSERT INTO users (name, email, password) VALUES (%s, %s, %s) RETURNING id, role",
            (name, email, password)
        )
        new_user = cur.fetchone()
        conn.commit()

        # Return the new user info (without password)
        return jsonify({
            "success": True,
            "user": {
                "id": new_user[0],
                "name": name,
                "email": email,
                "role": new_user[1]
            }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


def login():
    """
    POST /api/login
    Expects { "email": "...", "password": "..." }
    Verifies the plain password.
    """
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and Password are required"}), 400

    conn = get_connection()
    cur = conn.cursor()

    try:
        # Retrieve user record matching the email
        cur.execute("SELECT id, name, email, password, role FROM users WHERE email = %s", (email,))
        user_record = cur.fetchone()

        if user_record is None:
            return jsonify({"error": "Invalid email or password"}), 401
            
        stored_password = user_record[3]

        # In old versions, password might be NULL since registration wasn't required
        if not stored_password:
            return jsonify({"error": "This account was created without a password. Please register again."}), 401

        # Check password plainly
        if stored_password == password:
            return jsonify({
                "success": True,
                "user": {
                    "id": user_record[0],
                    "name": user_record[1],
                    "email": user_record[2],
                    "role": user_record[4]
                }
            })
        else:
            return jsonify({"error": "Invalid email or password"}), 401

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
