from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BusinessUnitOut(BaseModel):
    id: int
    name: str
    address: Optional[str]
    lat: Optional[float]
    lon: Optional[float]

    class Config:
        from_attributes = True


class ManagerOut(BaseModel):
    id: int
    full_name: str
    position: Optional[str]
    office_name: Optional[str]
    skills: Optional[str]
    workload: int

    class Config:
        from_attributes = True


class TicketOut(BaseModel):
    id: int
    client_guid: str
    client_gender: Optional[str]
    segment: Optional[str]
    country: Optional[str]
    city: Optional[str]
    description: Optional[str]
    ticket_type: Optional[str]
    sentiment: Optional[str]
    priority: Optional[int]
    language: Optional[str]
    summary: Optional[str]
    geo_normalization: Optional[str]
    client_lat: Optional[float]
    client_lon: Optional[float]
    office_name: Optional[str]
    manager_id: Optional[int]
    created_at: Optional[datetime]
    processed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TicketDetail(TicketOut):
    assigned_manager: Optional[ManagerOut]
    office: Optional[BusinessUnitOut]

    class Config:
        from_attributes = True


class ProcessResponse(BaseModel):
    processed: int
    failed: int
    message: str


class StatsResponse(BaseModel):
    total_tickets: int
    processed_tickets: int
    by_type: dict
    by_sentiment: dict
    by_office: dict
    by_language: dict


class AIQueryRequest(BaseModel):
    query: str


class AIQueryResponse(BaseModel):
    answer: str
    chart_data: Optional[dict] = None


class UploadResponse(BaseModel):
    filename: str
    rows_total: int
    rows_imported: int
    message: str