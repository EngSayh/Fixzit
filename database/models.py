from dataclasses import dataclass
from datetime import datetime, date
from typing import Optional
from decimal import Decimal


@dataclass
class User:
    id: int
    first_name: str
    last_name: str
    email: str
    phone: str
    national_id: str
    role: str
    language: str = "en"
    is_verified: bool = False
    location_lat: Optional[Decimal] = None
    location_lng: Optional[Decimal] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Property:
    id: int
    name: str
    address: str
    property_type: str
    total_units: int = 1
    manager_id: Optional[int] = None
    location_lat: Optional[Decimal] = None
    location_lng: Optional[Decimal] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Unit:
    id: int
    property_id: int
    unit_number: str
    unit_type: str
    size_sqm: Optional[Decimal] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    monthly_rent: Optional[Decimal] = None
    status: str = "available"
    created_at: Optional[datetime] = None


@dataclass
class Contract:
    id: int
    contract_number: str
    tenant_id: int
    property_id: int
    unit_id: int
    start_date: date
    end_date: date
    monthly_rent: Decimal
    security_deposit: Optional[Decimal] = None
    status: str = "active"
    contract_file_path: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Ticket:
    id: int
    title: str
    description: str
    category: str
    priority: str = "medium"
    status: str = "open"
    submitter_id: int
    assigned_to: Optional[int] = None
    property_id: Optional[int] = None
    unit_id: Optional[int] = None
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    scheduled_date: Optional[date] = None
    completed_date: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Payment:
    id: int
    contract_id: int
    amount: Decimal
    payment_type: str
    due_date: date
    paid_date: Optional[date] = None
    status: str = "pending"
    payment_method: Optional[str] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Contractor:
    id: int
    name: str
    company: Optional[str] = None
    phone: str = ""
    email: Optional[str] = None
    specialization: Optional[str] = None
    rating: Decimal = Decimal("0.00")
    is_active: bool = True
    created_at: Optional[datetime] = None
