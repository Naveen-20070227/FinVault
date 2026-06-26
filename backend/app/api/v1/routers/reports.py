from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter()

@router.get("/monthly")
def get_monthly_report(
    month: str = Query(..., regex="^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report_service = ReportService(db)
    return report_service.get_monthly_report_data(current_user.id, month)

@router.get("/yearly")
def get_yearly_report(
    year: int = Query(..., ge=2000, le=2100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report_service = ReportService(db)
    return report_service.get_yearly_report_data(current_user.id, year)

@router.get("/export/csv")
def export_csv(
    month: str = Query(..., regex="^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report_service = ReportService(db)
    csv_file = report_service.export_csv(current_user.id, month)
    headers = {"Content-Disposition": f"attachment; filename=transactions_{month}.csv"}
    return StreamingResponse(csv_file, media_type="text/csv", headers=headers)

@router.get("/export/xlsx")
def export_xlsx(
    month: str = Query(..., regex="^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report_service = ReportService(db)
    xlsx_file = report_service.export_xlsx(current_user.id, month)
    media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    headers = {"Content-Disposition": f"attachment; filename=report_{month}.xlsx"}
    return StreamingResponse(xlsx_file, media_type=media_type, headers=headers)

@router.get("/export/pdf")
def export_pdf(
    month: str = Query(..., regex="^\d{4}-\d{2}$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report_service = ReportService(db)
    pdf_bytes = report_service.export_pdf(current_user.id, month)
    headers = {"Content-Disposition": f"attachment; filename=report_{month}.pdf"}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
