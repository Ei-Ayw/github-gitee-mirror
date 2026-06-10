from pydantic import BaseModel
from typing import List, Optional

class RepoInfo(BaseModel):
    name: str
    full_name: str
    html_url: str
    description: Optional[str]
    private: bool
    clone_url: str
    sync_status: Optional[str] = None
    activity_data: Optional[list[int]] = None

class SyncRequest(BaseModel):
    user_id: int
    github_repo_url: str

class SyncResponse(BaseModel):
    task_id: int
    status: str
    message: str
    trigger_source: str = "manual"

class BulkSyncRequest(BaseModel):
    user_id: int

class BulkSyncResponse(BaseModel):
    message: str
    task_count: int
