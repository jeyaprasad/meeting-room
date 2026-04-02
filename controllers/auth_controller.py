from flask import request, jsonify
from db import get_connection

def register():
    """POST /api/register - Saves user with plain password."""
    data = request.get_json()
    name, email, password = data.get("name"), data.get("email"), data.get("password")

    if not name or not email or not password:
        return jsonify({"error": "Name, Email, and Password are required"}), 400

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({"error": "Email is already registered"}), 409

        cur.execute("INSERT INTO users (name, email, password) VALUES (%s, %s, %s) RETURNING id, role", (name, email, password))
        new_user = cur.fetchone()
        conn.commit()
        return jsonify({"success": True, "user": {"id": new_user[0], "name": name, "email": email, "role": new_user[1]}})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

def login():
    """POST /api/login - Verifies plain password."""
    data = request.get_json()
    email, password = data.get("email"), data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and Password are required"}), 400

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, name, email, password, role FROM users WHERE email = %s", (email,))
        user_record = cur.fetchone()
        if user_record is None:
            return jsonify({"error": "Invalid email or password"}), 401
            
        stored_password = user_record[3]
        if not stored_password:
            return jsonify({"error": "This account was created without a password. Please register again."}), 401

        if stored_password == password:
            return jsonify({"success": True, "user": {"id": user_record[0], "name": user_record[1], "email": user_record[2], "role": user_record[4]}})
        else:
            return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
