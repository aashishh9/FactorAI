from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.machine import Machine
from app.services.anomaly_service import detect_machine_anomaly


router = APIRouter(
    prefix="/anomalies",
    tags=["Anomalies"],
)


@router.get("/machine/{machine_id}")
def get_machine_anomaly(
    machine_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    machine = (
        db.query(Machine)
        .filter(Machine.id == machine_id)
        .first()
    )

    if not machine:
        return {
            "error": "Machine not found"
        }

    return detect_machine_anomaly(
        machine,
        db,
    )


@router.get("/")
def get_all_anomalies(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    machines = (
        db.query(Machine)
        .order_by(Machine.id)
        .all()
    )

    results = []

    for machine in machines:
        result = detect_machine_anomaly(
            machine,
            db,
        )

        if result["anomaly_detected"]:
            results.append(result)

    return {
        "count": len(results),
        "anomalies": results,
    }