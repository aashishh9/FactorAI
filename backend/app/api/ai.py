from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.machine import Machine
from app.models.production import ProductionRecord
from app.models.quality import QualityRecord
from app.services.ai_service import (
    analyze_production_issue,
    ask_factorai,
)

router = APIRouter(
    prefix="/ai",
    tags=["AI"],
)


class AIQuestion(BaseModel):
    question: str


def get_machine_context(
    machine: Machine,
    db: Session,
) -> str:
    """
    Collect production and quality evidence
    for a specific machine.
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

    context = f"""
Machine:
Name: {machine.name}
Type: {machine.machine_type}
Status: {machine.status}

Production records:
"""

    if production:
        for record in production:
            context += (
                f"- Production: {record.production_count} units, "
                f"Target: {record.target_count} units, "
                f"Time: {record.recorded_at}\n"
            )
    else:
        context += "- No production records available.\n"

    context += "\nQuality records:\n"

    if quality:
        for record in quality:
            context += (
                f"- Inspected: {record.inspected_count}, "
                f"Defects: {record.defect_count}, "
                f"Time: {record.recorded_at}\n"
            )
    else:
        context += "- No quality records available.\n"

    return context


@router.get("/analyze/{machine_id}")
def analyze_machine(
    machine_id: int,
    db: Session = Depends(get_db),
):
    """
    Generate structured AI analysis
    for a specific machine.
    """

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

    context = get_machine_context(
        machine,
        db,
    )

    analysis = analyze_production_issue(
        context
    )

    return {
        "machine": machine.name,
        "analysis": analysis,
    }


@router.post("/ask")
def ask_factorai(
    request: AIQuestion,
    db: Session = Depends(get_db),
):
    """
    Answer a manager's natural-language
    question using factory database evidence.
    """

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

    if not machines:
        return {
            "question": question,
            "machine": None,
            "answer": (
                "No machines are currently available "
                "in the factory database."
            ),
        }

    # -----------------------------------------------------
    # 1. MACHINE-SPECIFIC QUESTION
    # -----------------------------------------------------

    selected_machine = None

    for machine in machines:
        if machine.name.lower() in question_lower:
            selected_machine = machine
            break

    if selected_machine:

        context = get_machine_context(
            selected_machine,
            db,
        )

        prompt = f"""
Manager question:
{question}

{context}
"""

        answer = ask_factorai(prompt)

        return {
            "question": question,
            "machine": selected_machine.name,
            "answer": answer,
        }

    # -----------------------------------------------------
    # 2. MAINTENANCE QUESTION
    # -----------------------------------------------------

    if (
        "maintenance" in question_lower
        or "maintain" in question_lower
        or "repair" in question_lower
    ):

        maintenance_machines = (
            db.query(Machine)
            .filter(
                Machine.status == "maintenance"
            )
            .all()
        )

        context = """
Machines currently under maintenance:
"""

        if not maintenance_machines:

            context += (
                "- No machines are currently "
                "under maintenance.\n"
            )

        else:

            for machine in maintenance_machines:
                context += (
                    f"- {machine.name} "
                    f"(Type: {machine.machine_type}, "
                    f"Status: {machine.status})\n"
                )

        prompt = f"""
Manager question:
{question}

Factory evidence:
{context}
"""

        answer = ask_factorai(prompt)

        return {
            "question": question,
            "machine": None,
            "answer": answer,
        }

    # -----------------------------------------------------
    # 3. QUALITY / DEFECT QUESTION
    # -----------------------------------------------------

    if (
        "defect" in question_lower
        or "quality" in question_lower
    ):

        context = """
Machine quality performance:
"""

        for machine in machines:

            inspected = (
                db.query(
                    func.sum(
                        QualityRecord.inspected_count
                    )
                )
                .filter(
                    QualityRecord.machine_id
                    == machine.id
                )
                .scalar()
                or 0
            )

            defects = (
                db.query(
                    func.sum(
                        QualityRecord.defect_count
                    )
                )
                .filter(
                    QualityRecord.machine_id
                    == machine.id
                )
                .scalar()
                or 0
            )

            defect_rate = (
                (defects / inspected) * 100
                if inspected > 0
                else 0
            )

            context += (
                f"- {machine.name}: "
                f"{defects} defects / "
                f"{inspected} inspected = "
                f"{defect_rate:.2f}% defect rate\n"
            )

        prompt = f"""
Manager question:
{question}

Factory evidence:
{context}
"""

        answer = ask_factorai(prompt)

        return {
            "question": question,
            "machine": None,
            "answer": answer,
        }

    # -----------------------------------------------------
    # 4. GENERAL FACTORY QUESTION
    # -----------------------------------------------------

    context = """
Factory machine overview:
"""

    for machine in machines:

        production = (
            db.query(
                func.sum(
                    ProductionRecord.production_count
                )
            )
            .filter(
                ProductionRecord.machine_id
                == machine.id
            )
            .scalar()
            or 0
        )

        target = (
            db.query(
                func.sum(
                    ProductionRecord.target_count
                )
            )
            .filter(
                ProductionRecord.machine_id
                == machine.id
            )
            .scalar()
            or 0
        )

        inspected = (
            db.query(
                func.sum(
                    QualityRecord.inspected_count
                )
            )
            .filter(
                QualityRecord.machine_id
                == machine.id
            )
            .scalar()
            or 0
        )

        defects = (
            db.query(
                func.sum(
                    QualityRecord.defect_count
                )
            )
            .filter(
                QualityRecord.machine_id
                == machine.id
            )
            .scalar()
            or 0
        )

        production_rate = (
            (production / target) * 100
            if target > 0
            else 0
        )

        defect_rate = (
            (defects / inspected) * 100
            if inspected > 0
            else 0
        )

        context += (
            f"- {machine.name}: "
            f"Type={machine.machine_type}, "
            f"Status={machine.status}, "
            f"Production={production}/{target} "
            f"({production_rate:.2f}%), "
            f"Defects={defects}/{inspected} "
            f"({defect_rate:.2f}%)\n"
        )

    prompt = f"""
Manager question:
{question}

Factory evidence:
{context}
"""

    answer = ask_factorai(prompt)

    return {
        "question": question,
        "machine": None,
        "answer": answer,
    }