from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.machine import Machine
from app.models.production import ProductionRecord
from app.models.quality import QualityRecord


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    total_machines = db.query(Machine).count()

    active_machines = (
        db.query(Machine)
        .filter(Machine.status == "active")
        .count()
    )

    maintenance_machines = (
        db.query(Machine)
        .filter(Machine.status == "maintenance")
        .count()
    )

    total_production = (
        db.query(func.sum(ProductionRecord.production_count))
        .scalar()
        or 0
    )

    total_target = (
        db.query(func.sum(ProductionRecord.target_count))
        .scalar()
        or 0
    )

    total_inspected = (
        db.query(func.sum(QualityRecord.inspected_count))
        .scalar()
        or 0
    )

    total_defects = (
        db.query(func.sum(QualityRecord.defect_count))
        .scalar()
        or 0
    )

    production_achievement = (
        (total_production / total_target) * 100
        if total_target
        else 0
    )

    defect_rate = (
        (total_defects / total_inspected) * 100
        if total_inspected
        else 0
    )

    return {
        "total_machines": total_machines,
        "active_machines": active_machines,
        "maintenance_machines": maintenance_machines,
        "total_production": total_production,
        "total_target": total_target,
        "production_achievement": round(
            production_achievement,
            2,
        ),
        "total_inspected": total_inspected,
        "total_defects": total_defects,
        "defect_rate": round(
            defect_rate,
            2,
        ),
    }