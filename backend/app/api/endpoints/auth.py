from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.user import TokenLinkRequest, UserResponse, PlatformStatus
import requests
import secrets

router = APIRouter()

@router.post("/link", response_model=UserResponse)
def link_account(req: TokenLinkRequest, db: Session = Depends(get_db)):
    # Very basic user fetching/creation logic for POC
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        user = User(id=req.user_id)
        db.add(user)
    
    if req.platform == "github":
        user.github_username = req.username
        user.github_access_token = req.access_token # Should be encrypted in production
    elif req.platform == "gitee":
        user.gitee_username = req.username
        user.gitee_access_token = req.access_token
    else:
        raise HTTPException(status_code=400, detail="Invalid platform")
        
    db.commit()
    db.refresh(user)
    
    return user

@router.delete("/unlink/{user_id}/{platform}")
def unlink_account(user_id: int, platform: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if platform == "github":
        user.github_username = None
        user.github_access_token = None
    elif platform == "gitee":
        user.gitee_username = None
        user.gitee_access_token = None
    else:
        raise HTTPException(status_code=400, detail="Invalid platform")
        
    db.commit()
    return {"status": "success", "message": f"Unlinked {platform} account"}

@router.get("/status/{user_id}", response_model=PlatformStatus)
def get_link_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return PlatformStatus(github_linked=False, gitee_linked=False)
        
    return PlatformStatus(
        github_linked=bool(user.github_access_token),
        gitee_linked=bool(user.gitee_access_token),
        github_username=user.github_username,
        gitee_username=user.gitee_username
    )

@router.get("/oauth/github/login")
def github_login(user_id: int):
    client_id = settings.GITHUB_CLIENT_ID
    redirect_uri = f"{settings.API_BASE_URL}/api/v1/auth/oauth/github/callback?user_id={user_id}"
    return RedirectResponse(f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=repo")

@router.get("/oauth/github/callback")
def github_callback(code: str, user_id: int, db: Session = Depends(get_db)):
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    payload = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code
    }
    res = requests.post(token_url, json=payload, headers=headers)
    token_data = res.json()
    access_token = token_data.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to retrieve GitHub access token")

    # Get user info to fetch username
    user_res = requests.get("https://api.github.com/user", headers={"Authorization": f"Bearer {access_token}"})
    username = user_res.json().get("login")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id)
        db.add(user)
    
    user.github_username = username
    user.github_access_token = access_token
    db.commit()

    return RedirectResponse(f"{settings.FRONTEND_URL}/settings")

@router.get("/oauth/gitee/login")
def gitee_login(user_id: int):
    client_id = settings.GITEE_CLIENT_ID
    redirect_uri = f"{settings.API_BASE_URL}/api/v1/auth/oauth/gitee/callback?user_id={user_id}"
    return RedirectResponse(f"https://gitee.com/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=user_info%20projects")

@router.get("/oauth/gitee/callback")
def gitee_callback(code: str, user_id: int, db: Session = Depends(get_db)):
    token_url = "https://gitee.com/oauth/token"
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": settings.GITEE_CLIENT_ID,
        "client_secret": settings.GITEE_CLIENT_SECRET,
        "redirect_uri": f"{settings.API_BASE_URL}/api/v1/auth/oauth/gitee/callback?user_id={user_id}"
    }
    res = requests.post(token_url, data=payload)
    token_data = res.json()
    access_token = token_data.get("access_token")

    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to retrieve Gitee access token")

    user_res = requests.get(f"https://gitee.com/api/v5/user?access_token={access_token}")
    username = user_res.json().get("login")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id)
        db.add(user)

    user.gitee_username = username
    user.gitee_access_token = access_token
    db.commit()

    return RedirectResponse(f"{settings.FRONTEND_URL}/settings")


@router.post("/generate-sync-token/{user_id}")
def generate_sync_token(user_id: int, db: Session = Depends(get_db)):
    """为 CI/CD 生成认证 token，用于 GitHub Actions 调用同步 API"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.github_access_token or not user.gitee_access_token:
        raise HTTPException(status_code=400, detail="Both accounts must be linked before generating sync token")

    token = secrets.token_urlsafe(32)
    user.sync_api_token = token
    db.commit()

    return {"sync_api_token": token, "user_id": user_id}
