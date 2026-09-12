from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.machine import Machine
from app.models.production import ProductionRecord
from app.models.quality import QualityRecord
from app.services.ai_service import ask_factorai


router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)


class AIQuestion(BaseModel):
    question: str


# =============================================================
# MACHINE METRICS
# =============================================================

def get_machine_metrics(machine: Machine, db: Session):
    production = (
        db.query(ProductionRecord)
        .filter(ProductionRecord.machine_id == machine.id)
        .order_by(ProductionRecord.recorded_at)
        .all()
    )

    quality = (
        db.query(QualityRecord)
        .filter(QualityRecord.machine_id == machine.id)
        .order_by(QualityRecord.recorded_at)
        .all()
    )

    # ---------------------------------------------------------
    # Production metrics
    # ---------------------------------------------------------

    if production:
        first_production = production[0]
        latest_production = production[-1]

        initial_achievement = (
            first_production.production_count
            / first_production.target_count
            * 100
            if first_production.target_count
            else 0
        )

        latest_achievement = (
            latest_production.production_count
            / latest_production.target_count
            * 100
            if latest_production.target_count
            else 0
        )

        production_change = (
            (
                latest_production.production_count
                - first_production.production_count
            )
            / first_production.production_count
            * 100
            if first_production.production_count
            else 0
        )

    else:
        first_production = None
        latest_production = None
        initial_achievement = 0
        latest_achievement = 0
        production_change = 0

    # ---------------------------------------------------------
    # Quality metrics
    # ---------------------------------------------------------

    if quality:
        first_quality = quality[0]
        latest_quality = quality[-1]

        initial_defect_rate = (
            first_quality.defect_count
            / first_quality.inspected_count
            * 100
            if first_quality.inspected_count
            else 0
        )

        latest_defect_rate = (
            latest_quality.defect_count
            / latest_quality.inspected_count
            * 100
            if latest_quality.inspected_count
            else 0
        )

        defect_rate_change = (
            latest_defect_rate - initial_defect_rate
        )

    else:
        first_quality = None
        latest_quality = None
        initial_defect_rate = 0
        latest_defect_rate = 0
        defect_rate_change = 0

    return {
        "production": production,
        "quality": quality,
        "first_production": first_production,
        "latest_production": latest_production,
        "first_quality": first_quality,
        "latest_quality": latest_quality,
        "initial_achievement": initial_achievement,
        "latest_achievement": latest_achievement,
        "production_change": production_change,
        "initial_defect_rate": initial_defect_rate,
        "latest_defect_rate": latest_defect_rate,
        "defect_rate_change": defect_rate_change,
    }


# =============================================================
# MACHINE CONTEXT FOR LOCAL AI
# =============================================================

def get_machine_context(machine: Machine, db: Session) -> str:
    metrics = get_machine_metrics(machine, db)

    first_production = metrics["first_production"]
    latest_production = metrics["latest_production"]

    context = f"""
Machine:
Name: {machine.name}
Type: {machine.machine_type}
Status: {machine.status}

Verified production metrics:
- Number of production records: {len(metrics["production"])}
- Initial production: {
    first_production.production_count
    if first_production
    else 0
} units
- Latest production: {
    latest_production.production_count
    if latest_production
    else 0
} units
- Initial achievement: {metrics["initial_achievement"]:.1f}%
- Latest achievement: {metrics["latest_achievement"]:.1f}%
- Production change: {metrics["production_change"]:+.1f}%

Verified quality metrics:
- Number of quality records: {len(metrics["quality"])}
- Initial defect rate: {metrics["initial_defect_rate"]:.1f}%
- Latest defect rate: {metrics["latest_defect_rate"]:.1f}%
- Defect rate change: {metrics["defect_rate_change"]:+.1f} percentage points

Important:
These values come directly from the factory database.

Data limitation:
Production and quality data alone cannot prove the exact mechanical,
equipment, operator, or operational root cause.
"""

    return context


# =============================================================
# AI MACHINE ANALYSIS
# =============================================================

@router.get("/analyze/{machine_id}")
def analyze_machine(
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
        raise HTTPException(
            status_code=404,
            detail="Machine not found",
        )

    metrics = get_machine_metrics(
        machine,
        db,
    )

    production = metrics["production"]
    quality = metrics["quality"]

    first_production = metrics["first_production"]
    latest_production = metrics["latest_production"]

    initial_achievement = metrics["initial_achievement"]
    latest_achievement = metrics["latest_achievement"]

    production_change = metrics["production_change"]

    initial_defect_rate = metrics["initial_defect_rate"]
    latest_defect_rate = metrics["latest_defect_rate"]

    defect_rate_change = metrics["defect_rate_change"]

    # =========================================================
    # INSUFFICIENT PRODUCTION HISTORY
    # =========================================================

    if len(production) < 2:

        if len(production) == 1:
            production_details = f"""
- One production record is available.
- Production: {latest_production.production_count} units.
- Target: {latest_production.target_count} units.
- Production achievement: {latest_achievement:.1f}%.
"""
        else:
            production_details = """
- No production records are currently available.
"""

        if len(quality) == 1:
            quality_details = f"""
- One quality record is available.
- Defect rate: {latest_defect_rate:.1f}%.
"""
        elif len(quality) == 0:
            quality_details = """
- No quality records are currently available.
"""
        else:
            quality_details = ""

        analysis = f"""What happened:
There is insufficient historical production data to determine whether {machine.name} experienced a production decline.

Evidence:
{production_details}
{quality_details}

Likely cause:
A production trend cannot be established because fewer than two production records are available.

Recommended action:
Collect additional production and quality records before determining whether machine performance is deteriorating.

Confidence:
High confidence that the available data is insufficient to establish a production trend.
"""

        return {
            "machine_id": machine.id,
            "machine": machine.name,
            "analysis": analysis,
        }

    # =========================================================
    # DETERMINE TREND
    # =========================================================

    production_declining = (
        latest_production.production_count
        < first_production.production_count
    )

    defects_increasing = (
        latest_defect_rate
        > initial_defect_rate
    )

    # =========================================================
    # DETERIORATING MACHINE
    # =========================================================

    if production_declining or defects_increasing:

        explanation = ask_factorai(
            get_machine_context(
                machine,
                db,
            )
        )

        analysis = f"""What happened:
{machine.name} shows a deterioration in production and/or quality performance over the observed period.

Evidence:
- Production changed from {first_production.production_count} to {latest_production.production_count} units ({production_change:+.1f}%).
- Production achievement changed from {initial_achievement:.1f}% to {latest_achievement:.1f}%.
- Defect rate changed from {initial_defect_rate:.1f}% to {latest_defect_rate:.1f}%.
- Defect rate changed by {defect_rate_change:+.1f} percentage points.

Likely explanation:
{explanation}

Important limitation:
The available production and quality data can identify a performance pattern, but cannot prove the exact mechanical or operational root cause.

Recommended action:
Inspect the machine's process and quality conditions and review recent maintenance or operating changes.

Confidence:
High confidence in the observed trend.
Low-to-medium confidence in the suspected root cause.
"""

    # =========================================================
    # NO SIGNIFICANT DETERIORATION
    # =========================================================

    else:

        analysis = f"""What happened:
No significant deterioration is evident in the available records for {machine.name}.

Evidence:
- Production changed from {first_production.production_count} to {latest_production.production_count} units ({production_change:+.1f}%).
- Production achievement changed from {initial_achievement:.1f}% to {latest_achievement:.1f}%.
- Defect rate changed from {initial_defect_rate:.1f}% to {latest_defect_rate:.1f}%.
- Defect rate changed by {defect_rate_change:+.1f} percentage points.

Recommended action:
Continue monitoring production and quality performance.

Confidence:
High
"""

    return {
        "machine_id": machine.id,
        "machine": machine.name,
        "analysis": analysis,
    }


# =============================================================
# ASK FACTORAI
# =============================================================

@router.post("/ask")
def ask_ai(
    request: AIQuestion,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    question_lower = question.lower()

    machines = (
        db.query(Machine)
        .order_by(Machine.id)
        .all()
    )

    # =========================================================
    # 1. MAINTENANCE QUESTIONS
    # =========================================================

    maintenance_keywords = [
        "maintenance",
        "under maintenance",
        "machines in maintenance",
        "machine in maintenance",
    ]

    if any(
        keyword in question_lower
        for keyword in maintenance_keywords
    ):

        maintenance_machines = [
            machine
            for machine in machines
            if machine.status.lower() == "maintenance"
        ]

        if maintenance_machines:

            machine_names = ", ".join(
                machine.name
                for machine in maintenance_machines
            )

            answer = f"""Assessment:
The following machines are currently marked as under maintenance:

Evidence:
- {machine_names}

Likely explanation:
These machines have a maintenance status recorded in the factory database.

Recommended action:
Review their maintenance tickets and confirm their expected return-to-service time.

Confidence:
High
"""

        else:

            answer = """Assessment:
No machines are currently marked as under maintenance.

Evidence:
- The factory database contains no machines with maintenance status.

Recommended action:
Continue monitoring machine status and maintenance tickets.

Confidence:
High
"""

        return {
            "question": question,
            "answer": answer,
        }

    # =========================================================
    # 2. IDENTIFY MACHINE
    # =========================================================

    selected_machine = None

    for machine in machines:

        if machine.name.lower() in question_lower:
            selected_machine = machine
            break

    # =========================================================
    # 3. NO MACHINE IDENTIFIED
    # =========================================================

    if selected_machine is None:

        answer = """Assessment:
I could not identify a specific machine from your question.

Evidence:
- The factory database contains multiple machines.
- A machine name is required for machine-specific analysis.

Recommended action:
Ask about a specific machine, for example:

"Why did CNC-01 production decline?"

"What is the quality issue with CNC-01?"

"What is the status of PRESS-01?"

Confidence:
High
"""

        return {
            "question": question,
            "answer": answer,
        }

    # =========================================================
    # 4. MACHINE METRICS
    # =========================================================

    metrics = get_machine_metrics(
        selected_machine,
        db,
    )

    production = metrics["production"]
    quality = metrics["quality"]

    first_production = metrics["first_production"]
    latest_production = metrics["latest_production"]

    initial_achievement = metrics["initial_achievement"]
    latest_achievement = metrics["latest_achievement"]

    production_change = metrics["production_change"]

    initial_defect_rate = metrics["initial_defect_rate"]
    latest_defect_rate = metrics["latest_defect_rate"]

    defect_rate_change = metrics["defect_rate_change"]

    # =========================================================
    # 5. QUESTION TYPE
    # =========================================================

    production_question = any(
        keyword in question_lower
        for keyword in [
            "production",
            "produce",
            "producing",
            "output",
            "units",
            "target",
            "productivity",
        ]
    )

    quality_question = any(
        keyword in question_lower
        for keyword in [
            "quality",
            "defect",
            "defects",
            "rejection",
            "reject",
        ]
    )

    status_question = any(
        keyword in question_lower
        for keyword in [
            "status",
            "state",
            "condition",
            "working",
            "active",
        ]
    )

    # =========================================================
    # 6. STATUS QUESTION
    # =========================================================

    if status_question:

        answer = f"""Assessment:
{selected_machine.name} is currently marked as {selected_machine.status}.

Evidence:
- Machine type: {selected_machine.machine_type}
- Current status: {selected_machine.status}

Recommended action:
Review production, quality, and maintenance records for additional operational context.

Confidence:
High
"""

        return {
            "question": question,
            "answer": answer,
        }

    # =========================================================
    # 7. PRODUCTION QUESTION WITH INSUFFICIENT HISTORY
    # =========================================================

    if production_question and len(production) < 2:

        if len(production) == 1:

            production_info = f"""- One production record is available.
- Production: {latest_production.production_count} units.
- Target: {latest_production.target_count} units.
- Production achievement: {latest_achievement:.1f}%."""

        else:

            production_info = (
                "- No production records are currently available."
            )

        if len(quality) == 1:

            quality_info = (
                f"- One quality record is available.\n"
                f"- Defect rate: {latest_defect_rate:.1f}%."
            )

        elif len(quality) == 0:

            quality_info = (
                "- No quality records are currently available."
            )

        else:

            quality_info = ""

        answer = f"""Assessment:
There is insufficient historical data to determine whether {selected_machine.name} has experienced a production decline.

Evidence:
{production_info}
{quality_info}

Likely explanation:
A production trend cannot be established because at least two production records are required for comparison.

Recommended action:
Collect additional production and quality records for {selected_machine.name} before determining whether its performance is deteriorating.

Confidence:
High confidence that the available data is insufficient to establish a production decline.
"""

        return {
            "question": question,
            "answer": answer,
        }

    # =========================================================
    # 8. QUALITY QUESTION WITH INSUFFICIENT HISTORY
    # =========================================================

    if quality_question and len(quality) < 2:

        if len(quality) == 1:

            answer = f"""Assessment:
{selected_machine.name} has a recorded defect rate of {latest_defect_rate:.1f}% based on the available quality record.

Evidence:
- Inspected units: {quality[-1].inspected_count}
- Defective units: {quality[-1].defect_count}
- Defect rate: {latest_defect_rate:.1f}%

Likely explanation:
There is not enough historical quality data to determine whether the defect rate is increasing or decreasing.

Recommended action:
Collect additional quality records and investigate any defects currently being observed.

Confidence:
High confidence in the reported defect rate; low confidence in any historical trend.
"""

        else:

            answer = f"""Assessment:
No quality data is currently available for {selected_machine.name}.

Evidence:
- No quality records were found in the factory database.

Likely explanation:
The quality condition cannot be assessed without inspection data.

Recommended action:
Add quality inspection records for {selected_machine.name}.

Confidence:
Low
"""

        return {
            "question": question,
            "answer": answer,
        }

    # =========================================================
    # 9. NORMAL TREND ANALYSIS
    # =========================================================

    production_declining = (
        latest_production.production_count
        < first_production.production_count
    )

    defects_increasing = (
        latest_defect_rate
        > initial_defect_rate
    )

    if production_declining or defects_increasing:

        context = get_machine_context(
            selected_machine,
            db,
        )

        explanation = ask_factorai(
            context
        )

        answer = f"""Assessment:
{selected_machine.name} shows a change in production and/or quality performance over the observed period.

Evidence:
- Production changed from {first_production.production_count} to {latest_production.production_count} units ({production_change:+.1f}%).
- Production achievement changed from {initial_achievement:.1f}% to {latest_achievement:.1f}%.
- Defect rate changed from {initial_defect_rate:.1f}% to {latest_defect_rate:.1f}%.
- Defect rate changed by {defect_rate_change:+.1f} percentage points.

Likely explanation:
{explanation}

Important limitation:
The available production and quality data can identify a performance pattern, but cannot prove the exact mechanical or operational root cause.

Recommended action:
Inspect the machine's process and quality conditions and review recent maintenance or operating changes.

Confidence:
High confidence in the observed trend.
Low-to-medium confidence in the suspected root cause.
"""

    else:

        answer = f"""Assessment:
No significant deterioration is evident in the available records for {selected_machine.name}.

Evidence:
- Production changed from {first_production.production_count} to {latest_production.production_count} units ({production_change:+.1f}%).
- Production achievement changed from {initial_achievement:.1f}% to {latest_achievement:.1f}%.
- Defect rate changed from {initial_defect_rate:.1f}% to {latest_defect_rate:.1f}%.
- Defect rate changed by {defect_rate_change:+.1f} percentage points.

Recommended action:
Continue monitoring production and quality performance.

Confidence:
High
"""

    return {
        "question": question,
        "answer": answer,
    }