from sqlalchemy.orm import Session

from app.models.machine import Machine
from app.models.production import ProductionRecord
from app.models.quality import QualityRecord


def detect_machine_anomaly(
    machine: Machine,
    db: Session,
) -> dict:
    """
    Detect production and quality anomalies
    using historical machine data.
    """

    production = (
        db.query(ProductionRecord)
        .filter(
            ProductionRecord.machine_id == machine.id
        )
        .order_by(
            ProductionRecord.recorded_at
        )
        .all()
    )

    quality = (
        db.query(QualityRecord)
        .filter(
            QualityRecord.machine_id == machine.id
        )
        .order_by(
            QualityRecord.recorded_at
        )
        .all()
    )

    anomalies = []

    # -----------------------------------------
    # Production anomaly
    # -----------------------------------------

    if production:

        latest = production[-1]

        achievement = (
            latest.production_count
            / latest.target_count
            * 100
            if latest.target_count > 0
            else 0
        )

        if achievement < 80:
            anomalies.append({
                "type": "production",
                "severity": "high",
                "message": (
                    f"Production achievement is "
                    f"{achievement:.1f}% "
                    f"({latest.production_count}/"
                    f"{latest.target_count})."
                ),
            })

    # -----------------------------------------
    # Production deterioration
    # -----------------------------------------

    if len(production) >= 2:

        previous = production[-2]
        latest = production[-1]

        previous_rate = (
            previous.production_count
            / previous.target_count
            * 100
            if previous.target_count > 0
            else 0
        )

        latest_rate = (
            latest.production_count
            / latest.target_count
            * 100
            if latest.target_count > 0
            else 0
        )

        drop = previous_rate - latest_rate

        if drop >= 10:
            anomalies.append({
                "type": "production_drop",
                "severity": "high",
                "message": (
                    f"Production achievement dropped "
                    f"from {previous_rate:.1f}% "
                    f"to {latest_rate:.1f}%."
                ),
            })

    # -----------------------------------------
    # Quality anomaly
    # -----------------------------------------

    if quality:

        latest_quality = quality[-1]

        defect_rate = (
            latest_quality.defect_count
            / latest_quality.inspected_count
            * 100
            if latest_quality.inspected_count > 0
            else 0
        )

        if defect_rate >= 5:
            anomalies.append({
                "type": "quality",
                "severity": "high",
                "message": (
                    f"Defect rate increased to "
                    f"{defect_rate:.1f}%."
                ),
            })

    # -----------------------------------------
    # Result
    # -----------------------------------------

    return {
        "machine_id": machine.id,
        "machine": machine.name,
        "status": machine.status,
        "anomaly_detected": len(anomalies) > 0,
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
    }