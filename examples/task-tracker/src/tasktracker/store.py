"""All database access lives here. See docs/adr/0001-use-sqlite-for-storage.md."""

import sqlite3

SCHEMA_VERSION = 1


class TaskStore:
    def __init__(self, path):
        self._conn = sqlite3.connect(path)
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS tasks ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "title TEXT NOT NULL)"
        )
        self._conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        self._conn.commit()

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        self._conn.close()

    def add(self, title):
        """Store a task and return its ID."""
        cursor = self._conn.execute("INSERT INTO tasks (title) VALUES (?)", (title,))
        self._conn.commit()
        return cursor.lastrowid

    def all(self):
        """Return (id, title) for every task, in the order they were added."""
        return self._conn.execute("SELECT id, title FROM tasks ORDER BY id").fetchall()
