from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.factory import Factory
from app.models.machine import Machine


router = APIRouter(
    prefix="/factory",
    tags=["Factory"]
)


@router.get("/")
def get_factories(
    db: Session = Depends(get_db)
):
    factories = db.query(Factory).all()

    return [
        {
            "id": factory.id,
            "name": factory.name,
            "location": factory.location
        }
        for factory in factories
    ]


@router.get("/{factory_id}/machines")
def get_factory_machines(
    factory_id: int,
    db: Session = Depends(get_db)
):
    machines = (
        db.query(Machine)
        .filter(Machine.factory_id == factory_id)
        .all()
    )

    return [
        {
            "id": machine.id,
            "name": machine.name,
            "machine_type": machine.machine_type,
            "status": machine.status,
            "factory_id": machine.factory_id
        }
        for machine in machines
    ]