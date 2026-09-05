from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.production import ProductionRecord
from app.models.quality import QualityRecord
from app.services.ai_service import analyze_production_issue

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/analyze/{machine_id}")
def analyze_machine(machine_id: int, db: Session = Depends(get_db)):

    production = (
        db.query(ProductionRecord)
        .filter(ProductionRecord.machine_id == machine_id)
        .order_by(ProductionRecord.recorded_at)
        .all()
    )

    quality = (
        db.query(QualityRecord)
        .filter(QualityRecord.machine_id == machine_id)
        .order_by(QualityRecord.recorded_at)
        .all()
    )

    context = f"""
Machine ID: {machine_id}

Production records:
"""

    for record in production:
        context += f"""
Production: {record.production_count}
Target: {record.target_count}
Time: {record.recorded_at}
"""

    context += """

Quality records:
"""

    for record in quality:
        context += f"""
Inspected: {record.inspected_count}
Defects: {record.defect_count}
Time: {record.recorded_at}
"""

    analysis = analyze_production_issue(context)

    return {
        "machine_id": machine_id,
        "analysis": analysis
    }