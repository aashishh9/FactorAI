from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class QualityRecord(Base):
    __tablename__ = "quality_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    machine_id: Mapped[int] = mapped_column(
        ForeignKey("machines.id")
    )

    inspected_count: Mapped[int] = mapped_column(Integer)
    defect_count: Mapped[int] = mapped_column(Integer)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )