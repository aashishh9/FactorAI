from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class MaintenanceTicket(Base):
    __tablename__ = "maintenance_tickets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    machine_id: Mapped[int] = mapped_column(
        ForeignKey("machines.id")
    )

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)

    priority: Mapped[str] = mapped_column(
        String(50),
        default="medium"
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="open"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )