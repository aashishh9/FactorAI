from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.machine import Machine
from app.models.maintenance import MaintenanceTicket

router = APIRouter(
    prefix="/maintenance",
    tags=["Maintenance"],
)


class MaintenanceTicketCreate(BaseModel):
    machine_id: int
    title: str
    description: str
    priority: str = "medium"


@router.post("/")
def create_maintenance_ticket(
    request: MaintenanceTicketCreate,
    db: Session = Depends(get_db),
):
    machine = (
        db.query(Machine)
        .filter(Machine.id == request.machine_id)
        .first()
    )

    if not machine:
        raise HTTPException(
            status_code=404,
            detail="Machine not found",
        )

    ticket = MaintenanceTicket(
        machine_id=request.machine_id,
        title=request.title,
        description=request.description,
        priority=request.priority,
        status="open",
    )

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return {
        "message": "Maintenance ticket created successfully",
        "ticket": {
            "id": ticket.id,
            "machine_id": ticket.machine_id,
            "machine": machine.name,
            "title": ticket.title,
            "description": ticket.description,
            "priority": ticket.priority,
            "status": ticket.status,
            "created_at": ticket.created_at,
        },
    }


@router.get("/")
def get_maintenance_tickets(
    db: Session = Depends(get_db),
):
    tickets = (
        db.query(MaintenanceTicket)
        .order_by(MaintenanceTicket.created_at.desc())
        .all()
    )

    results = []

    for ticket in tickets:
        machine = (
            db.query(Machine)
            .filter(Machine.id == ticket.machine_id)
            .first()
        )

        results.append(
            {
                "id": ticket.id,
                "machine_id": ticket.machine_id,
                "machine": machine.name if machine else "Unknown",
                "title": ticket.title,
                "description": ticket.description,
                "priority": ticket.priority,
                "status": ticket.status,
                "created_at": ticket.created_at,
            }
        )

    return {
        "count": len(results),
        "tickets": results,
    }