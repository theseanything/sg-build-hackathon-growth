from typing import List, Optional

from pydantic import BaseModel


class GovUkOneLogin(BaseModel):
    sub: str
    email: str
    email_verified: bool
    phone_number: Optional[str] = None
    phone_verified: bool
    identity_verified: bool
    verification_level: str
    created_at: str


class UserProvided(BaseModel):
    trading_name: Optional[str] = None
    owner_age: Optional[int] = None


class RegisteredOfficeAddress(BaseModel):
    address_line_1: Optional[str] = None
    locality: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None


class Director(BaseModel):
    name: str
    appointed_on: str
    resigned_on: Optional[str] = None


class CompaniesHouseData(BaseModel):
    company_number: str
    legal_name: str
    company_status: str
    company_type: str
    incorporation_date: str
    sic_codes: List[str] = []
    sic_descriptions: List[str] = []
    registered_office_address: Optional[RegisteredOfficeAddress] = None
    directors: List[Director] = []


class SelfAssessment(BaseModel):
    tax_year: str
    turnover: float
    currency: str
    trading_start_date: Optional[str] = None


class PayeData(BaseModel):
    paye_reference: str
    employees_on_payroll: int


class HmrcData(BaseModel):
    utr: str
    mtd_income_source_id: str
    legal_structure: str
    vat_registered: bool
    vat_number: Optional[str] = None
    self_assessment: Optional[SelfAssessment] = None
    paye: Optional[PayeData] = None


class DerivedData(BaseModel):
    legal_structure: str
    sector: str
    region: str
    trading_age_years: float


class GoalPromptResponse(BaseModel):
    prompt: str
    response: str


class GoalExtracted(BaseModel):
    funding_amount: Optional[float] = None
    currency: Optional[str] = None
    intended_spend: List[str] = []
    preference: Optional[str] = None
    debt_averse: Optional[bool] = None
    growth_stage: Optional[str] = None
    open_to_small_amounts: Optional[bool] = None
    timeline_months: Optional[int] = None


class GoalSession(BaseModel):
    session_id: str
    timestamp: str
    raw: List[GoalPromptResponse] = []
    extracted: Optional[GoalExtracted] = None


class BusinessProfile(BaseModel):
    profile_id: str
    gov_uk_one_login: Optional[GovUkOneLogin] = None
    user_provided: Optional[UserProvided] = None
    companies_house: Optional[CompaniesHouseData] = None
    hmrc: Optional[HmrcData] = None
    derived: Optional[DerivedData] = None
    goals: List[GoalSession] = []


class BusinessProfileUpdate(BaseModel):
    owner_age: Optional[int] = None
    employee_count: Optional[int] = None
    annual_revenue: Optional[float] = None
    growth_goal: Optional[str] = None
    funding_goal: Optional[str] = None
    constraints: Optional[str] = None
