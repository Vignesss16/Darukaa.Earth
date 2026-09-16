import geoalchemy2.admin.dialects.sqlite as geo_sqlite
import pytest
from fastapi.testclient import TestClient
from geoalchemy2.types import Geometry, _GISType
from sqlalchemy import create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


# Compile GeoAlchemy2 Geometry type to GEOMETRY column in SQLite DDL
@compiles(Geometry, "sqlite")
def compile_geometry_sqlite(type_, compiler, **kw):
    return "GEOMETRY"


# Disable SpatiaLite DDL operations & bind/result/column expression/result_processor for SQLite test environment
geo_sqlite.after_create = lambda *args, **kwargs: None
geo_sqlite.before_drop = lambda *args, **kwargs: None
_GISType.bind_expression = lambda self, bindvalue: bindvalue
_GISType.result_expression = lambda self, col, type_: col
_GISType.column_expression = lambda self, col: col
_GISType.result_processor = lambda self, dialect, coltype: lambda value: value

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    from app.database import Base

    # Create all tables for SQLite test session
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    from app.database import get_db
    from app.main import app

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
