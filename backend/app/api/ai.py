from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
from app.models.machine import Machine
from app.models.production import ProductionRecord
from app.models.quality import QualityRecord
from app.services.ai_service import (
    ask_factorai,
    analyze_production_issue,
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

    for record in production:
        context += (
            f"- {record.recorded_at}: "
            f"{record.production_count}/"
            f"{record.target_count} units\n"
        )

    context += "\nQuality records:\n"

    for record in quality:
        context += (
            f"- {record.recorded_at}: "
            f"{record.defect_count} defects "
            f"out of {record.inspected_count} inspected\n"
        )

    return context


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

    context = get_machine_context(
        machine,
        db,
    )

    analysis = analyze_production_issue(
        context
    )

    return {
        "machine_id": machine.id,
        "machine": machine.name,
        "analysis": analysis,
    }


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

    # Try to identify a machine mentioned in the question.
    machines = (
        db.query(Machine)
        .order_by(Machine.id)
        .all()
    )

    selected_machine = None

    question_lower = question.lower()

    for machine in machines:
        if machine.name.lower() in question_lower:
            selected_machine = machine
            break

    # If no specific machine was mentioned,
    # use the machine with the strongest current anomaly.
    if selected_machine is None:
        for machine in machines:
            if machine.status == "maintenance":
                selected_machine = machine
                break

    if selected_machine is None and machines:
        selected_machine = machines[0]

    if selected_machine:
        context = get_machine_context(
            selected_machine,
            db,
        )

        context = f"""
User question:
{question}

Selected machine:
{selected_machine.name}

{context}
"""
    else:
        context = f"""
User question:
{question}

No machine data is currently available.
"""

    answer = ask_factorai(
        context
    )

    return {
        "question": question,
        "answer": answer,
    }