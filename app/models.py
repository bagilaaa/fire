from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey, ARRAY
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.ext.asyncio import AsyncAttrs
from datetime import datetime


class Base(AsyncAttrs, DeclarativeBase):
    pass


class BusinessUnit(Base):
    __tablename__ = "business_units"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)
    address = Column(Text)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)

    managers = relationship("Manager", back_populates="business_unit")
    tickets = relationship("Ticket", back_populates="office")


class Manager(Base):
    __tablename__ = "managers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    position = Column(String(100))  # Специалист, Ведущий специалист, Главный специалист
    office_name = Column(String(255), ForeignKey("business_units.name"))
    skills = Column(Text)  # stored as comma-separated: VIP, ENG, KZ
    workload = Column(Integer, default=0)
    round_robin_index = Column(Integer, default=0)  # for RR tracking

    business_unit = relationship("BusinessUnit", back_populates="managers")
    tickets = relationship("Ticket", back_populates="assigned_manager")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_guid = Column(String(100), unique=True, nullable=False)
    client_gender = Column(String(20))
    client_dob = Column(String(30))
    description = Column(Text)
    attachment = Column(String(500))
    segment = Column(String(50))  # Mass, VIP, Priority
    country = Column(String(100))
    region = Column(String(200))
    city = Column(String(200))
    street = Column(String(200))
    house = Column(String(50))

    # AI analysis results
    ticket_type = Column(String(100))
    sentiment = Column(String(50))
    priority = Column(Integer)
    language = Column(String(10))
    summary = Column(Text)
    geo_normalization = Column(Text)
    client_lat = Column(Float, nullable=True)
    client_lon = Column(Float, nullable=True)

    # Assignment
    office_name = Column(String(255), ForeignKey("business_units.name"), nullable=True)
    manager_id = Column(Integer, ForeignKey("managers.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    office = relationship("BusinessUnit", back_populates="tickets")
    assigned_manager = relationship("Manager", back_populates="tickets")