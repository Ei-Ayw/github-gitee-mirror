from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, RepositorySyncTask
from app.worker.tasks import sync_repository

router = APIRouter()

@router.post("/github/{user_id}")
async def github_webhook(user_id: int, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Webhook endpoint for receiving GitHub push events.
    """
    event_type = request.headers.get("X-GitHub-Event")
    
    if event_type != "push":
        return {"message": "Ignored non-push event"}

    # In a real-world scenario, you should verify the webhook signature here using X-Hub-Signature-256
    # To keep it simple, we trust the incoming webhook if user_id is valid.
    
    payload = await request.json()
    repository = payload.get("repository", {})
    github_repo_url = repository.get("clone_url")
    repo_name = repository.get("name")
    
    if not github_repo_url or not repo_name:
        raise HTTPException(status_code=400, detail="Invalid payload: missing repository details")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.github_access_token or not user.gitee_access_token:
        # Ignore if user not completely set up
        raise HTTPException(status_code=400, detail="User account not fully linked")

    # Check for existing pending/syncing task
    existing_task = db.query(RepositorySyncTask).filter(
        RepositorySyncTask.user_id == user.id,
        RepositorySyncTask.github_repo_url == github_repo_url,
        RepositorySyncTask.status.in_(["pending", "syncing"])
    ).first()
    
    if existing_task:
        return {"message": "Sync already in progress or queued"}

    task_record = RepositorySyncTask(
        user_id=user.id,
        github_repo_url=github_repo_url,
        gitee_repo_url=f"https://gitee.com/{user.gitee_username}/{repo_name}.git",
        trigger_source="webhook",
        status="pending"
    )
    db.add(task_record)
    db.commit()
    db.refresh(task_record)
    
    # Trigger celery task
    sync_repository.delay(
        task_id=task_record.id,
        github_repo_url=task_record.github_repo_url,
        gitee_repo_url=task_record.gitee_repo_url,
        github_pat=user.github_access_token,
        gitee_pat=user.gitee_access_token
    )

    return {"message": "Sync task queued from webhook", "task_id": task_record.id}
