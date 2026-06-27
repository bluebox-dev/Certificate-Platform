import os
import sys
from sqlalchemy import create_engine, ForeignKey
from sqlalchemy.orm import sessionmaker

# Set database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://app:secret@localhost:5432/ecert")

# Define models
from sqlalchemy import Column, String, DateTime, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "app_user"
    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    role = Column(String(50), nullable=False)
    full_name = Column(String(255))

class WhitelistUser(Base):
    __tablename__ = "whitelist_user"
    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255))

class Certificate(Base):
    __tablename__ = "certificate"
    id = Column(UUID(as_uuid=True), primary_key=True)
    recipient_email = Column(String(255), nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(UUID(as_uuid=True), primary_key=True)
    actor_id = Column(UUID(as_uuid=True), nullable=True)

def inspect_and_clean():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()

    print("=== USERS IN APP_USER ===")
    users = session.query(User).all()
    for u in users:
        print(f"ID: {u.id} | Email: {u.email} | Name: {u.full_name} | Role: {u.role}")

    print("\n=== USERS IN WHITELIST ===")
    whitelist = session.query(WhitelistUser).all()
    for w in whitelist:
        print(f"ID: {w.id} | Email: {w.email} | Name: {w.name}")

    print("\nDeleting verifier users and non-essential whitelist entries...")
    
    for u in users:
        if u.role not in ["super_admin", "staff"]:
            print(f"Deleting user: {u.email} (Role: {u.role})")
            
            # Nullify audit log references
            session.query(AuditLog).filter(AuditLog.actor_id == u.id).update({AuditLog.actor_id: None})
            
            # Delete certificates belonging to this recipient email
            certs_deleted = session.query(Certificate).filter(Certificate.recipient_email == u.email).delete()
            print(f"  Deleted {certs_deleted} certificates.")
            
            session.delete(u)
            
    # Whitelist cleanup
    for w in whitelist:
        if w.email not in ["admin@example.com", "staff@example.com"]:
            print(f"Deleting whitelist user: {w.email}")
            session.delete(w)
            
    session.commit()
    print("\nCleanup completed successfully.")
    
    # Print remaining
    print("\n=== REMAINING USERS ===")
    users = session.query(User).all()
    for u in users:
        print(f"ID: {u.id} | Email: {u.email} | Name: {u.full_name} | Role: {u.role}")

    print("\n=== REMAINING WHITELIST ===")
    whitelist = session.query(WhitelistUser).all()
    for w in whitelist:
        print(f"ID: {w.id} | Email: {w.email} | Name: {w.name}")

if __name__ == "__main__":
    inspect_and_clean()
