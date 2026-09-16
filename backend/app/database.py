import os

import geoalchemy2.admin.dialects.sqlite as geo_sqlite
from geoalchemy2.types import Geometry, _GISType
from sqlalchemy import create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./darukaa.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
except Exception:
    engine = create_engine(
        "sqlite:///./darukaa.db", connect_args={"check_same_thread": False}
    )

if engine.dialect.name == "sqlite":

    @compiles(Geometry, "sqlite")
    def compile_geometry_sqlite(type_, compiler, **kw):
        return "GEOMETRY"

    geo_sqlite.after_create = lambda *args, **kwargs: None
    geo_sqlite.before_drop = lambda *args, **kwargs: None
    _GISType.bind_expression = lambda self, bindvalue: bindvalue
    _GISType.result_expression = lambda self, col, type_: col
    _GISType.column_expression = lambda self, col: col
    _GISType.result_processor = lambda self, dialect, coltype: lambda value: value

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
