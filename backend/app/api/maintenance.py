from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies import get_current_user
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


class MaintenanceTicketStatusUpdate(BaseModel):
    status: str


@router.post("/")
def create_maintenance_ticket(
    request: MaintenanceTicketCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
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
    current_user=Depends(get_current_user),
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

        results.append({
            "id": ticket.id,
            "machine_id": ticket.machine_id,
            "machine": machine.name if machine else "Unknown",
            "title": ticket.title,
            "description": ticket.description,
            "priority": ticket.priority,
            "status": ticket.status,
            "created_at": ticket.created_at,
        })

    return {
        "count": len(results),
        "tickets": results,
    }


@router.patch("/{ticket_id}/status")
def update_ticket_status(
    ticket_id: int,
    request: MaintenanceTicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    allowed_statuses = {
        "open",
        "in progress",
        "resolved",
    }

    new_status = request.status.strip().lower()

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use: open, in progress, resolved.",
        )

    ticket = (
        db.query(MaintenanceTicket)
        .filter(MaintenanceTicket.id == ticket_id)
        .first()
    )

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Maintenance ticket not found",
        )

    ticket.status = new_status

    db.commit()
    db.refresh(ticket)

    return {
        "message": "Ticket status updated successfully",
        "ticket": {
            "id": ticket.id,
            "machine_id": ticket.machine_id,
            "title": ticket.title,
            "priority": ticket.priority,
            "status": ticket.status,
            "created_at": ticket.created_at,
        },
    }