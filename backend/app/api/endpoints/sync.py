from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, RepositorySyncTask
from app.schemas.sync import RepoInfo, SyncRequest, SyncResponse, BulkSyncRequest, BulkSyncResponse
from app.worker.tasks import sync_repository
import requests

from app.core.redis import get_redis
import json

router = APIRouter()

@router.get("/github/repos/{user_id}", response_model=list[RepoInfo])
def list_github_repos(user_id: int, refresh: bool = False, db: Session = Depends(get_db), redis = Depends(get_redis)):
    print(f"🚀 [DEBUG] API Hit: list_github_repos for user {user_id} (refresh={refresh})")
    cache_key = f"user:{user_id}:github_repos"
    
    if not refresh:
        cached_data = redis.get(cache_key)
        if cached_data:
            return [RepoInfo(**item) for item in json.loads(cached_data)]

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.github_access_token:
        raise HTTPException(status_code=400, detail="GitHub account not linked")
        
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {user.github_access_token}",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    response = requests.get(
        "https://api.github.com/user/repos", 
        headers=headers, 
        params={"visibility": "all", "per_page": 100},
        timeout=10
    )
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch repositories from GitHub")
        
    repos = response.json()
    
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Get sync tasks for this user (only last 30 days for activity map)
    sync_tasks = db.query(RepositorySyncTask).filter(
        RepositorySyncTask.user_id == user_id,
        RepositorySyncTask.created_at >= thirty_days_ago
    ).all()
    
    # Pre-process tasks into maps for efficiency
    status_map = {}
    activity_map = {} # Maps repo_url -> list of 21 counters

    for task in sync_tasks:
        url = task.github_repo_url
        status_map[url] = task.status
        
        # Calculate activity for heatmap (last 21 days)
        if url not in activity_map:
            activity_map[url] = [0] * 21
            
        created = task.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
            
        delta = now - created
        days_ago = delta.days
        if 0 <= days_ago < 21:
            index = 20 - days_ago
            activity_map[url][index] += 1

    repo_list = []
    for r in repos:
        info = RepoInfo(**r)
        url = info.clone_url
        info.sync_status = status_map.get(url)
        info.activity_data = activity_map.get(url, [0] * 21) # Default to 21 empty dots
        repo_list.append(info)
        
    # Cache the result for 30 minutes
    redis.setex(cache_key, 1800, json.dumps([r.model_dump() for r in repo_list]))
        
    return repo_list

@router.post("/trigger", response_model=SyncResponse)
def trigger_sync(req: SyncRequest, db: Session = Depends(get_db)):
    print(f"🔥 [DEBUG] API Hit: trigger_sync for repo {req.github_repo_url}")
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user or not user.github_access_token or not user.gitee_access_token:
        raise HTTPException(status_code=400, detail="Both GitHub and Gitee accounts must be linked")
    
    # Extract repo name from url (simplified)
    repo_name = req.github_repo_url.split("/")[-1]
    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]
        
    # Check if repo exists on Gitee, if not create it
    # This logic is simplified for now
    
    # 1. Create a task record in the DB
    task_record = RepositorySyncTask(
        user_id=user.id,
        github_repo_url=req.github_repo_url,
        gitee_repo_url=f"https://gitee.com/{user.gitee_username}/{repo_name}.git",
        trigger_source="manual",
        status="pending"
    )
    db.add(task_record)
    db.commit()
    db.refresh(task_record)
    
    # 2. Add to celery task queue
    # Extract PATs here to pass to the worker
    celery_task = sync_repository.delay(
        task_id=task_record.id,
        github_repo_url=task_record.github_repo_url,
        gitee_repo_url=task_record.gitee_repo_url,
        github_pat=user.github_access_token,
        gitee_pat=user.gitee_access_token
    )
    
    return SyncResponse(
        task_id=task_record.id,
        status="queued",
        message="Sync task has been added to the queue"
    )

@router.post("/trigger/all", response_model=BulkSyncResponse)
def trigger_sync_all(req: BulkSyncRequest, db: Session = Depends(get_db)):
    print(f"🔥 [DEBUG] API Hit: trigger_sync_all for user {req.user_id}")
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user or not user.github_access_token or not user.gitee_access_token:
        raise HTTPException(status_code=400, detail="Both GitHub and Gitee accounts must be linked")
        
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {user.github_access_token}",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    
    response = requests.get(
        "https://api.github.com/user/repos", 
        headers=headers, 
        params={"visibility": "all", "per_page": 100},
        timeout=10
    )
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Failed to fetch repositories from GitHub")
        
    repos = response.json()
    task_count = 0
    
    for r in repos:
        github_repo_url = r["clone_url"]
        repo_name = r["name"]
        
        # Check if a pending or syncing task already exists
        existing_task = db.query(RepositorySyncTask).filter(
            RepositorySyncTask.user_id == user.id,
            RepositorySyncTask.github_repo_url == github_repo_url,
            RepositorySyncTask.status.in_(["pending", "syncing"])
        ).first()
        
        if existing_task:
            continue
            
        task_record = RepositorySyncTask(
            user_id=user.id,
            github_repo_url=github_repo_url,
            gitee_repo_url=f"https://gitee.com/{user.gitee_username}/{repo_name}.git",
            trigger_source="manual",
            status="pending"
        )
        db.add(task_record)
        db.commit()
        db.refresh(task_record)
        
        sync_repository.delay(
            task_id=task_record.id,
            github_repo_url=task_record.github_repo_url,
            gitee_repo_url=task_record.gitee_repo_url,
            github_pat=user.github_access_token,
            gitee_pat=user.gitee_access_token
        )
        task_count += 1
        
    return BulkSyncResponse(
        message="Bulk sync triggered successfully",
        task_count=task_count
    )

@router.get("/dashboard/{user_id}")
def get_dashboard_stats(user_id: int, db: Session = Depends(get_db)):
    from sqlalchemy import func
    from datetime import datetime, timedelta, timezone

    # 1. Efficient counts using DB-side aggregation
    total = db.query(RepositorySyncTask).filter(RepositorySyncTask.user_id == user_id).count()
    active = db.query(RepositorySyncTask).filter(RepositorySyncTask.user_id == user_id, RepositorySyncTask.status == "syncing").count()
    queued = db.query(RepositorySyncTask).filter(RepositorySyncTask.user_id == user_id, RepositorySyncTask.status == "pending").count()
    failed = db.query(RepositorySyncTask).filter(RepositorySyncTask.user_id == user_id, RepositorySyncTask.status == "failed").count()
    
    # 2. Generate heatmap data only for the last 120 days
    days = 120
    heatmap_data = [0] * days
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)

    relevant_tasks = db.query(RepositorySyncTask.created_at).filter(
        RepositorySyncTask.user_id == user_id,
        RepositorySyncTask.created_at >= start_date
    ).all()
    
    for (created_at,) in relevant_tasks:
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
            
        delta = now - created_at
        days_ago = delta.days
        if 0 <= days_ago < days:
            index = (days - 1) - days_ago
            heatmap_data[index] += 1
                
    # 3. Compress counts to levels (0-4)
    for i in range(days):
        val = heatmap_data[i]
        if val == 0: heatmap_data[i] = 0
        elif val <= 2: heatmap_data[i] = 1
        elif val <= 5: heatmap_data[i] = 2
        elif val <= 10: heatmap_data[i] = 3
        else: heatmap_data[i] = 4

    return {
        "stats": {
            "total": total,
            "active": active,
            "queued": queued,
            "failed": failed,
        },
        "heatmapData": heatmap_data
    }
