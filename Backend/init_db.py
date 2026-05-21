"""
Create AuroraTunes database (if missing) and application tables.

Usage (from Backend folder):
  python init_db.py
"""

from sqlalchemy import create_engine, text

from db import Base, build_database_url, engine
from models import CustomBackground, ListeningHistory, PlayerState, User  # noqa: F401


def ensure_database_exists() -> None:
    database_name = engine.url.database
    if not database_name:
        return

    master_url = build_database_url(database="master")
    master = create_engine(master_url, isolation_level="AUTOCOMMIT", future=True)
    with master.connect() as connection:
        connection.execute(
            text(
                f"IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'{database_name}') "
                f"CREATE DATABASE [{database_name}]"
            )
        )
    master.dispose()
    print(f"Database '{database_name}' is ready.")


def create_tables() -> None:
    Base.metadata.create_all(bind=engine)
    print("Tables created (or already exist).")


if __name__ == "__main__":
    ensure_database_exists()
    create_tables()
    print("Done.")
