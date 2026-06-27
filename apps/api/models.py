import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Integer, Date, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "app_user"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # super_admin, staff, verifier
    password_hash = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    groups_created = relationship("CertificateGroup", back_populates="creator")
    batches_created = relationship("ImportBatch", back_populates="creator")
    audit_logs = relationship("AuditLog", back_populates="actor")


class Issuer(Base):
    __tablename__ = "issuer"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    organization = Column(String(255), nullable=False)
    logo_url = Column(Text, nullable=True)
    signature_image_url = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    groups = relationship("CertificateGroup", back_populates="issuer")
    certificates = relationship("Certificate", back_populates="issuer")


class Template(Base):
    __tablename__ = "template"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    html = Column(Text, nullable=False)
    css = Column(Text, nullable=True)
    version = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default="active")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    groups = relationship("CertificateGroup", back_populates="template")
    certificates = relationship("Certificate", back_populates="template")


class CertificateGroup(Base):
    __tablename__ = "certificate_group"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cover_image_url = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    level = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="draft")  # draft, active, archived
    visible_to_verifier = Column(Boolean, nullable=False, default=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("template.id"), nullable=False)
    issuer_id = Column(UUID(as_uuid=True), ForeignKey("issuer.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("app_user.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", back_populates="groups_created")
    template = relationship("Template", back_populates="groups")
    issuer = relationship("Issuer", back_populates="groups")
    certificates = relationship("Certificate", back_populates="group")
    import_batches = relationship("ImportBatch", back_populates="group")

    @property
    def certificate_count(self) -> int:
        return len(self.certificates)


class Certificate(Base):
    __tablename__ = "certificate"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    certificate_no = Column(String(100), unique=True, nullable=False, index=True)
    recipient_name = Column(String(255), nullable=False)
    recipient_email = Column(String(255), nullable=True, index=True)
    course = Column(String(255), nullable=False)
    issue_date = Column(Date, nullable=False)
    expire_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="pending")  # pending, valid, revoked, expired, failed
    verification_token = Column(String(255), unique=True, nullable=False, index=True)
    pdf_url = Column(Text, nullable=True)
    certificate_hash = Column(String(128), nullable=True)
    visible_to_verifier = Column(Boolean, nullable=False, default=True)
    group_id = Column(UUID(as_uuid=True), ForeignKey("certificate_group.id"), nullable=True)
    template_id = Column(UUID(as_uuid=True), ForeignKey("template.id"), nullable=False)
    issuer_id = Column(UUID(as_uuid=True), ForeignKey("issuer.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    group = relationship("CertificateGroup", back_populates="certificates")
    template = relationship("Template", back_populates="certificates")
    issuer = relationship("Issuer", back_populates="certificates")


class ImportBatch(Base):
    __tablename__ = "import_batch"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("certificate_group.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    total_rows = Column(Integer, nullable=False, default=0)
    valid_rows = Column(Integer, nullable=False, default=0)
    invalid_rows = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="uploaded")  # uploaded, validated, generating, completed, failed
    error_report_url = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("app_user.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    group = relationship("CertificateGroup", back_populates="import_batches")
    creator = relationship("User", back_populates="batches_created")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("app_user.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(Text, nullable=True)
    meta_data = Column(JSON, name="metadata", nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    actor = relationship("User", back_populates="audit_logs")

    @property
    def actor_email(self):
        return self.actor.email if self.actor else None

    @property
    def actor_name(self):
        return self.actor.full_name if self.actor else "ระบบ"


class WhitelistUser(Base):
    __tablename__ = "whitelist_user"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class SystemSetting(Base):
    __tablename__ = "system_setting"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=True)
