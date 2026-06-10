from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SyncLogResponse(BaseModel):
    id: int
    github_repo_url: str
    gitee_repo_url: str
    status: str
    trigger_source: str  # "manual", "webhook", "cron", "github_actions"
    error_message: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
