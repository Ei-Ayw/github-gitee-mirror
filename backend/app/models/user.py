from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(String(255), unique=True, index=True, nullable=True)
    github_username = Column(String(255), nullable=True)
    github_access_token = Column(String(255), nullable=True)
    
    gitee_id = Column(String(255), unique=True, index=True, nullable=True)
    gitee_username = Column(String(255), nullable=True)
    gitee_access_token = Column(String(255), nullable=True)

    # CI/CD API token for GitHub Actions authentication
    sync_api_token = Column(String(255), unique=True, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class RepositorySyncTask(Base):
    __tablename__ = "repository_sync_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    github_repo_url = Column(String(255), nullable=False)
    gitee_repo_url = Column(String(255), nullable=False)
    
    # pending, syncing, completed, failed
    status = Column(String(50), default="pending")

    # Trigger source: "manual", "webhook", "cron", "github_actions"
    trigger_source = Column(String(50), default="manual")

    error_message = Column(String(1024), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
