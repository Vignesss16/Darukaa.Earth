import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Darukaa.Earth API"
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "darukaa_super_secret_jwt_key_change_in_production_2026"
    )
    REFRESH_SECRET_KEY: str = os.getenv(
        "REFRESH_SECRET_KEY", "darukaa_super_secret_refresh_jwt_key_2026"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./darukaa.db")

    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    )

    @property
    def cors_origins(self) -> list[str]:
        if not self.ALLOWED_ORIGINS:
            return [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ]
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

    model_config = SettingsConfigDict(case_sensitive=True)


settings = Settings()
