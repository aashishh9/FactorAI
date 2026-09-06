from datetime import datetime, timedelta

from app.db.database import SessionLocal
from app.models.factory import Factory
from app.models.machine import Machine
from app.models.production import ProductionRecord
from app.models.quality import QualityRecord


def seed_database():

    db = SessionLocal()

    try:

        # -----------------------------------------
        # CLEAR EXISTING DATA
        # -----------------------------------------

        db.query(QualityRecord).delete()
        db.query(ProductionRecord).delete()
        db.query(Machine).delete()
        db.query(Factory).delete()

        db.commit()


        # -----------------------------------------
        # FACTORY
        # -----------------------------------------

        factory = Factory(
            name="FactorAI Manufacturing Plant",
            location="Kolhapur, Maharashtra"
        )

        db.add(factory)
        db.commit()
        db.refresh(factory)


        # -----------------------------------------
        # MACHINES
        # -----------------------------------------

        cnc01 = Machine(
            name="CNC-01",
            machine_type="CNC",
            status="active",
            factory_id=factory.id
        )

        cnc02 = Machine(
            name="CNC-02",
            machine_type="CNC",
            status="active",
            factory_id=factory.id
        )

        furnace01 = Machine(
            name="FURNACE-01",
            machine_type="Induction Furnace",
            status="active",
            factory_id=factory.id
        )

        press01 = Machine(
            name="PRESS-01",
            machine_type="Hydraulic Press",
            status="maintenance",
            factory_id=factory.id
        )

        db.add_all([
            cnc01,
            cnc02,
            furnace01,
            press01
        ])

        db.commit()

        db.refresh(cnc01)
        db.refresh(cnc02)
        db.refresh(furnace01)
        db.refresh(press01)


        # -----------------------------------------
        # PRODUCTION DATA
        # -----------------------------------------

        now = datetime.utcnow()

        production_records = [

            ProductionRecord(
                machine_id=cnc01.id,
                production_count=950,
                target_count=1000,
                recorded_at=now - timedelta(hours=4)
            ),

            ProductionRecord(
                machine_id=cnc01.id,
                production_count=920,
                target_count=1000,
                recorded_at=now - timedelta(hours=3)
            ),

            ProductionRecord(
                machine_id=cnc01.id,
                production_count=780,
                target_count=1000,
                recorded_at=now - timedelta(hours=2)
            ),

            ProductionRecord(
                machine_id=cnc01.id,
                production_count=650,
                target_count=1000,
                recorded_at=now - timedelta(hours=1)
            ),

            ProductionRecord(
                machine_id=cnc02.id,
                production_count=970,
                target_count=1000,
                recorded_at=now - timedelta(hours=1)
            ),

            ProductionRecord(
                machine_id=furnace01.id,
                production_count=880,
                target_count=900,
                recorded_at=now - timedelta(hours=1)
            ),
        ]

        db.add_all(production_records)


        # -----------------------------------------
        # QUALITY DATA
        # -----------------------------------------

        quality_records = [

            QualityRecord(
                machine_id=cnc01.id,
                inspected_count=1000,
                defect_count=20,
                recorded_at=now - timedelta(hours=4)
            ),

            QualityRecord(
                machine_id=cnc01.id,
                inspected_count=1000,
                defect_count=35,
                recorded_at=now - timedelta(hours=3)
            ),

            QualityRecord(
                machine_id=cnc01.id,
                inspected_count=1000,
                defect_count=70,
                recorded_at=now - timedelta(hours=2)
            ),

            QualityRecord(
                machine_id=cnc01.id,
                inspected_count=1000,
                defect_count=110,
                recorded_at=now - timedelta(hours=1)
            ),
        ]

        db.add_all(quality_records)

        db.commit()

        print("FactorAI database seeded successfully.")


    finally:

        db.close()


if __name__ == "__main__":
    seed_database()