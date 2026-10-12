from fastapi import APIRouter
from app.api.v1.datasets import router as datasets_router
from app.api.v1.feedback import router as feedback_router
from app.api.v1.analysis import router as analysis_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.issues import router as issues_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.reports import router as reports_router
from app.api.v1.adaption import router as adaption_router

api_v1_router = APIRouter()

api_v1_router.include_router(datasets_router, tags=["Datasets & Imports"])
api_v1_router.include_router(feedback_router, tags=["Feedback"])
api_v1_router.include_router(analysis_router, tags=["Analysis"])
api_v1_router.include_router(dashboard_router, tags=["Dashboard"])
api_v1_router.include_router(issues_router, tags=["Issues"])
api_v1_router.include_router(recommendations_router, tags=["Recommendations"])
api_v1_router.include_router(reports_router, tags=["Reports"])
api_v1_router.include_router(adaption_router, tags=["Adaption Integration"])
