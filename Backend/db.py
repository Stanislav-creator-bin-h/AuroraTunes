import os
from contextlib import contextmanager
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker


def build_database_url(
    *,
    user: str | None = None,
    password: str | None = None,
    host: str | None = None,
    port: str | None = None,
    database: str | None = None,
    driver: str | None = None,
) -> str:
    user = user or os.getenv("MSSQL_USER", "sa")
    password = password or os.getenv("MSSQL_PASSWORD", "ChangeMe_StrongPassword_123!@#")
    host = host or os.getenv("MSSQL_HOST", "localhost")
    port = port or os.getenv("MSSQL_PORT", "1433")
    database = database or os.getenv("MSSQL_DATABASE", "AuroraTunes")
    driver = driver or os.getenv("MSSQL_DRIVER", "ODBC Driver 17 for SQL Server")

    driver_encoded = quote_plus(driver)
    return (
        f"mssql+pyodbc://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{database}"
        f"?driver={driver_encoded}&TrustServerCertificate=yes"
    )


DATABASE_URL = os.getenv("DATABASE_URL") or build_database_url()

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = scoped_session(
    sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
)
Base = declarative_base()


@contextmanager
def get_db_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
