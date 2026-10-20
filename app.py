
from flask import Flask, render_template, request, jsonify
import sqlite3

app = Flask(__name__)
DATABASE = "tasks.db"


def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            priority TEXT NOT NULL DEFAULT 'Medium',
            due_date TEXT,
            completed INTEGER NOT NULL DEFAULT 0
        )
    """)

    conn.commit()
    conn.close()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM tasks ORDER BY id DESC"
    ).fetchall()
    conn.close()

    return jsonify([dict(row) for row in rows])


@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "").strip()
    priority = data.get("priority", "Medium")
    due_date = data.get("date") or None

    if not title:
        return jsonify({"error": "Task title is required"}), 400

    if priority not in ("Low", "Medium", "High"):
        return jsonify({"error": "Invalid priority"}), 400

    conn = get_db_connection()

    cursor = conn.execute(
        "INSERT INTO tasks (title, priority, due_date) VALUES (?, ?, ?)",
        (title, priority, due_date)
    )

    conn.commit()
    task_id = cursor.lastrowid
    conn.close()

    return jsonify({
        "id": task_id,
        "title": title,
        "priority": priority,
        "date": due_date,
        "completed": 0
    }), 201


@app.route("/api/tasks/<int:task_id>", methods=["PATCH"])
def update_task(task_id):
    data = request.get_json(silent=True) or {}

    if "completed" not in data or not isinstance(data["completed"], bool):
        return jsonify({"error": "A boolean completed value is required"}), 400

    conn = get_db_connection()

    cursor = conn.execute(
        "UPDATE tasks SET completed = ? WHERE id = ?",
        (int(data["completed"]), task_id)
    )

    conn.commit()
    changed = cursor.rowcount
    conn.close()

    if changed == 0:
        return jsonify({"error": "Task not found"}), 404

    return jsonify({"success": True})


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    conn = get_db_connection()

    cursor = conn.execute(
        "DELETE FROM tasks WHERE id = ?",
        (task_id,)
    )

    conn.commit()
    changed = cursor.rowcount
    conn.close()

    if changed == 0:
        return jsonify({"error": "Task not found"}), 404

    return jsonify({"success": True})


init_db()

if __name__ == "__main__":
    app.run(debug=True)
