from app.routers.auth import router as auth_router
from app.routers.findings import router as findings_router
from app.routers.reports import router as reports_router
from app.routers.scans import router as scans_router
from app.routers.settings import router as settings_router
from app.routers.sites import router as sites_router
from app.routers.users import router as users_router

__all__ = [
    "auth_router",
    "users_router",
    "scans_router",
    "findings_router",
    "sites_router",
    "reports_router",
    "settings_router",
]
