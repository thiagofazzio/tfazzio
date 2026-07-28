"""Camada de acesso ao SQLite. Nenhuma regra de negócio mora aqui."""
import sqlite3
import os
import uuid
import json

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def connect(db_path: str, fresh: bool = False) -> sqlite3.Connection:
    if fresh and os.path.exists(db_path):
        os.remove(db_path)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    if fresh:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()
    return conn


def dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, sort_keys=True)


def loads(text: str):
    return json.loads(text) if text else None
