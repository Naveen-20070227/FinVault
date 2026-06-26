from fastapi import APIRouter
from app.api.v1.routers import (
    auth,
    users,
    categories,
    transactions,
    budgets,
    bills,
    goals,
    analytics,
    reports,
    notifications,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["Transactions"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
api_router.include_router(bills.router, prefix="/bills", tags=["Bills"])
api_router.include_router(goals.router, prefix="/goals", tags=["Savings Goals"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
