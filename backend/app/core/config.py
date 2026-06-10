import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SyncPulse API"
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173", 
        "http://localhost:3000", 
        "http://localhost:5174", 
        "http://127.0.0.1:5174",
        "http://localhost:8001",
        "http://127.0.0.1:8001"
    ]
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5174")
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8001")

    # OAuth Application credentials
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    GITEE_CLIENT_ID: str = os.getenv("GITEE_CLIENT_ID", "")
    GITEE_CLIENT_SECRET: str = os.getenv("GITEE_CLIENT_SECRET", "")

    # MySQL configurations
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_SERVER: str = os.getenv("MYSQL_SERVER", "localhost")
    MYSQL_PORT: str = os.getenv("MYSQL_PORT", "3306")
    MYSQL_DB: str = os.getenv("MYSQL_DB", "github_sync")

    @property
    def DATABASE_URI(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_SERVER}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    # Redis / Celery configurations
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

    class Config:
        env_file = ".env"

settings = Settings()
