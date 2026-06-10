from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, RepositorySyncTask
from app.worker.tasks import sync_repository
import requests as http_requests

router = APIRouter()


@router.post("/trigger/{user_id}")
def ci_trigger_sync(
    user_id: int,
    x_sync_token: str = Header(..., description="CI/CD 认证 token"),
    github_repo_url: str = Query(None, description="GitHub 仓库完整 URL"),
    repo_name: str = Query(None, description="GitHub 仓库名（自动拼接完整 URL）"),
    db: Session = Depends(get_db),
):
    """
    GitHub Actions CI/CD 同步触发端点。
    通过 X-Sync-Token 头认证，支持单仓库或批量同步触发。
    """
    # 1. 验证 API token
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.sync_api_token or user.sync_api_token != x_sync_token:
        raise HTTPException(status_code=401, detail="Invalid sync API token")

    # 2. 检查账号绑定
    if not user.github_access_token or not user.gitee_access_token:
        raise HTTPException(
            status_code=400, detail="Both GitHub and Gitee accounts must be linked"
        )

    # 3. 批量同步模式：repo_name=all
    if repo_name == "all":
        task_count = 0
        gh_response = http_requests.get(
            "https://api.github.com/user/repos",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {user.github_access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            params={"visibility": "all", "per_page": 100},
        )

        if gh_response.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch GitHub repositories: {gh_response.text}",
            )

        repos = gh_response.json()
        for r in repos:
            github_repo_url_item = r.get("clone_url")
            repo_name_item = r.get("name")

            # Skip if already pending/syncing
            existing_task = (
                db.query(RepositorySyncTask)
                .filter(
                    RepositorySyncTask.user_id == user.id,
                    RepositorySyncTask.github_repo_url == github_repo_url_item,
                    RepositorySyncTask.status.in_(["pending", "syncing"]),
                )
                .first()
            )
            if existing_task:
                continue

            gitee_url = f"https://gitee.com/{user.gitee_username}/{repo_name_item}.git"
            task = RepositorySyncTask(
                user_id=user.id,
                github_repo_url=github_repo_url_item,
                gitee_repo_url=gitee_url,
                trigger_source="github_actions",
                status="pending",
            )
            db.add(task)
            db.commit()
            db.refresh(task)

            sync_repository.delay(
                task_id=task.id,
                github_repo_url=task.github_repo_url,
                gitee_repo_url=task.gitee_repo_url,
                github_pat=user.github_access_token,
                gitee_pat=user.gitee_access_token,
            )
            task_count += 1

        return {
            "message": "Bulk sync triggered from GitHub Actions",
            "task_count": task_count,
        }

    # 4. 单仓库同步模式
    if github_repo_url:
        repo_url = github_repo_url
    elif repo_name:
        repo_url = f"https://github.com/{user.github_username}/{repo_name}"
    else:
        raise HTTPException(
            status_code=400, detail="Must provide github_repo_url or repo_name"
        )

    # 5. 提取 repo 名并构造 Gitee URL
    name = repo_url.split("/")[-1].replace(".git", "")
    gitee_url = f"https://gitee.com/{user.gitee_username}/{name}.git"

    # 6. 去重检查（pending/syncing）
    existing = (
        db.query(RepositorySyncTask)
        .filter(
            RepositorySyncTask.user_id == user.id,
            RepositorySyncTask.github_repo_url == repo_url,
            RepositorySyncTask.status.in_(["pending", "syncing"]),
        )
        .first()
    )
    if existing:
        return {"message": "Sync already in progress", "task_id": existing.id}

    # 7. 创建任务
    task = RepositorySyncTask(
        user_id=user.id,
        github_repo_url=repo_url,
        gitee_repo_url=gitee_url,
        trigger_source="github_actions",
        status="pending",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # 8. 队列 Celery 任务
    sync_repository.delay(
        task_id=task.id,
        github_repo_url=task.github_repo_url,
        gitee_repo_url=task.gitee_repo_url,
        github_pat=user.github_access_token,
        gitee_pat=user.gitee_access_token,
    )

    return {
        "message": "Sync triggered from GitHub Actions",
        "task_id": task.id,
        "trigger_source": "github_actions",
    }