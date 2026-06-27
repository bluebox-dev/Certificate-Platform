from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID

# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str  # super_admin, staff, verifier

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: str
    status: str
    created_at: datetime

    class Config:
        orm_mode = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str

# Issuer Schemas
class IssuerCreate(BaseModel):
    name: str
    organization: str
    logo_url: Optional[str] = None
    signature_image_url: Optional[str] = None

class IssuerResponse(BaseModel):
    id: UUID
    name: str
    organization: str
    logo_url: Optional[str] = None
    signature_image_url: Optional[str] = None

    class Config:
        orm_mode = True

# Template Schemas
class TemplateCreate(BaseModel):
    name: str
    html: str
    css: Optional[str] = None

class TemplateResponse(BaseModel):
    id: UUID
    name: str
    html: str
    css: Optional[str] = None
    version: int
    status: str

    class Config:
        orm_mode = True

# Certificate Group Schemas
class CertificateGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    template_id: UUID
    issuer_id: UUID
    visible_to_verifier: Optional[bool] = True

class CertificateGroupResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    status: str
    visible_to_verifier: bool
    template_id: UUID
    issuer_id: UUID
    certificate_count: Optional[int] = 0
    created_at: datetime

    class Config:
        orm_mode = True

class CertificateGroupVisibilityUpdate(BaseModel):
    visible_to_verifier: bool

# Certificate Schemas
class CertificateCreate(BaseModel):
    recipient_name: str
    recipient_email: Optional[EmailStr] = None
    course: str
    issue_date: date
    expire_date: Optional[date] = None
    group_id: Optional[UUID] = None
    template_id: UUID
    issuer_id: UUID
    visible_to_verifier: Optional[bool] = True

class CertificateResponse(BaseModel):
    id: UUID
    certificate_no: str
    recipient_name: str
    recipient_email: Optional[str] = None
    course: str
    issue_date: date
    expire_date: Optional[date] = None
    status: str
    verification_token: str
    pdf_url: Optional[str] = None
    certificate_hash: Optional[str] = None
    visible_to_verifier: bool
    group_id: Optional[UUID] = None
    template_id: UUID
    issuer_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

class CertificateVerifyResponse(BaseModel):
    status: str
    valid: bool
    certificate_no: str
    recipient_name: str
    course: str
    issue_date: date
    issuer: str

# Import Batch Schemas
class ImportBatchResponse(BaseModel):
    id: UUID
    group_id: UUID
    file_name: str
    total_rows: int
    valid_rows: int
    invalid_rows: int
    status: str
    error_report_url: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: UUID
    actor_id: Optional[UUID] = None
    actor_email: Optional[str] = None
    actor_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[UUID] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    meta_data: Optional[dict] = None
    created_at: datetime

    class Config:
        orm_mode = True


# Whitelist Schemas
class WhitelistUserCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class WhitelistUserUpdate(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class WhitelistBulkDeleteRequest(BaseModel):
    ids: List[UUID]

class WhitelistUserResponse(BaseModel):
    id: UUID
    email: str
    name: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class GoogleOauthConfigUpdate(BaseModel):
    google_oauth_enabled: bool
    google_client_id: str
    google_client_secret: str

class GoogleOauthConfigResponse(BaseModel):
    google_oauth_enabled: bool
    google_client_id: str
    google_client_secret_hidden: str


class WhitelistSelectionImportRequest(BaseModel):
    whitelist_ids: List[UUID]
    course: str
    issue_date: date
    expire_date: Optional[date] = None


