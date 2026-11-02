from app.routers.cameras import router as cameras_router
from app.routers.faces import router as faces_router
from app.routers.expressions import router as expressions_router
from app.routers.analytics import router as analytics_router

__all__ = [
    "cameras_router",
    "faces_router",
    "expressions_router",
    "analytics_router"
]
