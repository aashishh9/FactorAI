from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.production import ProductionRecord
from app.models.quality import QualityRecord


router = APIRouter(
    prefix="/production",
    tags=["Production"],
)


@router.get("/")
def get_production_records(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    records = db.query(ProductionRecord).all()

    return [
        {
            "id": record.id,
            "machine_id": record.machine_id,
            "production_count": record.production_count,
            "target_count": record.target_count,
            "recorded_at": record.recorded_at,
        }
        for record in records
    ]


@router.get("/quality")
def get_quality_records(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    records = db.query(QualityRecord).all()

    return [
        {
            "id": record.id,
            "machine_id": record.machine_id,
            "inspected_count": record.inspected_count,
            "defect_count": record.defect_count,
            "recorded_at": record.recorded_at,
        }
        for record in records
    ]