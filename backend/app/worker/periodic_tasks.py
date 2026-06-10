from .celery_app import celery_app
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.user import User, RepositorySyncTask
from app.worker.tasks import sync_repository
import requests
import time

@celery_app.task
def auto_sync_all_users():
    """
    Periodic task to trigger sync for all users who have both GitHub and Gitee linked.
    """
    db: Session = SessionLocal()
    try:
        users = db.query(User).filter(User.github_access_token.isnot(None), User.gitee_access_token.isnot(None)).all()
        for user in users:
            # Fetch repos from github
            headers = {
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {user.github_access_token}",
                "X-GitHub-Api-Version": "2022-11-28"
            }
            try:
                response = requests.get(
                    "https://api.github.com/user/repos", 
                    headers=headers, 
                    params={"visibility": "all", "per_page": 100},
                    timeout=10
                )
                if response.status_code == 200:
                    repos = response.json()
                    for r in repos:
                        github_repo_url = r["clone_url"]
                        repo_name = r["name"]
                        
                        # Check existing active sync tasks
                        existing = db.query(RepositorySyncTask).filter(
                            RepositorySyncTask.user_id == user.id,
                            RepositorySyncTask.github_repo_url == github_repo_url,
                            RepositorySyncTask.status.in_(["pending", "syncing"])
                        ).first()
                        
                        if not existing:
                            task_record = RepositorySyncTask(
                                user_id=user.id,
                                github_repo_url=github_repo_url,
                                gitee_repo_url=f"https://gitee.com/{user.gitee_username}/{repo_name}.git",
                                trigger_source="cron",
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
            except Exception as e:
                print(f"Error syncing repos for user {user.id}: {e}")
            
            # Simple rate limiting per user to avoid hitting APIs too fast
            time.sleep(2)
            
    finally:
        db.close()
