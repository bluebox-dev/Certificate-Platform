import os
import csv
import io
import uuid
import hashlib
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from database import engine, get_db, Base
import models
import schemas
import auth
import audit
import storage
import queue_utils

# Create tables
Base.metadata.create_all(bind=engine)
# Ensure MinIO bucket exists
storage.ensure_bucket_exists()

app = FastAPI(title="E-Certificate Platform API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to generate certificate number
def generate_cert_no(db: Session) -> str:
    year = datetime.now().year
    # Format: CERT-2026-XXXXXX where XXXXXX is random hex
    while True:
        rand_suffix = uuid.uuid4().hex[:6].upper()
        cert_no = f"CERT-{year}-{rand_suffix}"
        # Check uniqueness
        exists = db.query(models.Certificate).filter(models.Certificate.certificate_no == cert_no).first()
        if not exists:
            return cert_no

# Helper function to generate verification token
def generate_verification_token() -> str:
    # nano-id style short token
    return "c_" + uuid.uuid4().hex[:12]

# --- ROOT ---
@app.get("/")
def read_root():
    return {"message": "Welcome to E-Certificate API Platform"}

# --- AUTH ---
@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    # Check if email exists
    exists = db.query(models.User).filter(models.User.email == user_in.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.User(
        id=uuid.uuid4(),
        email=user_in.email,
        full_name=user_in.full_name,
        role="verifier",
        password_hash=auth.get_password_hash(user_in.password),
        status="active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login")
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_in.email).first()
    if not user or not auth.verify_password(login_in.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    if user.status != "active":
        raise HTTPException(status_code=400, detail="Account is inactive")
    
    access_token = auth.create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "email": user.email
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# --- ISSUERS ---
@app.post("/api/issuers", response_model=schemas.IssuerResponse)
def create_issuer(
    issuer_in: schemas.IssuerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    issuer = models.Issuer(
        id=uuid.uuid4(),
        name=issuer_in.name,
        organization=issuer_in.organization,
        logo_url=issuer_in.logo_url,
        signature_image_url=issuer_in.signature_image_url
    )
    db.add(issuer)
    db.commit()
    db.refresh(issuer)
    return issuer

@app.get("/api/issuers", response_model=List[schemas.IssuerResponse])
def list_issuers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    return db.query(models.Issuer).all()

@app.get("/api/issuers/{issuer_id}", response_model=schemas.IssuerResponse)
def get_issuer(
    issuer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    issuer = db.query(models.Issuer).filter(models.Issuer.id == issuer_id).first()
    if not issuer:
        raise HTTPException(status_code=404, detail="Issuer not found")
    return issuer

@app.put("/api/issuers/{issuer_id}", response_model=schemas.IssuerResponse)
def update_issuer(
    issuer_id: uuid.UUID,
    issuer_in: schemas.IssuerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    issuer = db.query(models.Issuer).filter(models.Issuer.id == issuer_id).first()
    if not issuer:
        raise HTTPException(status_code=404, detail="Issuer not found")
    
    issuer.name = issuer_in.name
    issuer.organization = issuer_in.organization
    issuer.logo_url = issuer_in.logo_url
    issuer.signature_image_url = issuer_in.signature_image_url
    
    db.commit()
    db.refresh(issuer)
    return issuer

@app.delete("/api/issuers/{issuer_id}")
def delete_issuer(
    issuer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    issuer = db.query(models.Issuer).filter(models.Issuer.id == issuer_id).first()
    if not issuer:
        raise HTTPException(status_code=404, detail="Issuer not found")
        
    referenced = db.query(models.CertificateGroup).filter(models.CertificateGroup.issuer_id == issuer_id).first()
    if referenced:
        raise HTTPException(status_code=400, detail="Cannot delete issuer: it is referenced by active certificate programs.")
        
    db.delete(issuer)
    db.commit()
    return {"message": "ลบผู้ออกใบรับรองเรียบร้อยแล้ว"}

# --- TEMPLATES ---
@app.post("/api/templates", response_model=schemas.TemplateResponse)
def create_template(
    template_in: schemas.TemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    template = models.Template(
        id=uuid.uuid4(),
        name=template_in.name,
        html=template_in.html,
        css=template_in.css,
        version=1,
        status="active"
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

@app.get("/api/templates", response_model=List[schemas.TemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    return db.query(models.Template).all()

@app.get("/api/templates/{template_id}", response_model=schemas.TemplateResponse)
def get_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@app.put("/api/templates/{template_id}", response_model=schemas.TemplateResponse)
def update_template(
    template_id: uuid.UUID,
    template_in: schemas.TemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template.name = template_in.name
    template.html = template_in.html
    template.css = template_in.css
    template.version += 1
    
    db.commit()
    db.refresh(template)
    return template

@app.delete("/api/templates/{template_id}")
def delete_template(
    template_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    template = db.query(models.Template).filter(models.Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
        
    referenced = db.query(models.CertificateGroup).filter(models.CertificateGroup.template_id == template_id).first()
    if referenced:
        raise HTTPException(status_code=400, detail="Cannot delete template: it is referenced by active certificate programs.")
        
    db.delete(template)
    db.commit()
    return {"message": "ลบเทมเพลตใบรับรองเรียบร้อยแล้ว"}

# --- CERTIFICATE GROUPS ---
@app.post("/api/certificate-groups", response_model=schemas.CertificateGroupResponse)
def create_certificate_group(
    request: Request,
    group_in: schemas.CertificateGroupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    group = models.CertificateGroup(
        id=uuid.uuid4(),
        name=group_in.name,
        description=group_in.description,
        cover_image_url=group_in.cover_image_url,
        category=group_in.category,
        level=group_in.level,
        status="draft",
        visible_to_verifier=group_in.visible_to_verifier,
        template_id=group_in.template_id,
        issuer_id=group_in.issuer_id,
        created_by=current_user.id
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    audit.log_action(db, "create_certificate_group", "certificate_group", group.id, current_user.id, request)
    return group

@app.get("/api/certificate-groups", response_model=List[schemas.CertificateGroupResponse])
def list_certificate_groups(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    return db.query(models.CertificateGroup).all()

@app.get("/api/certificate-groups/{group_id}", response_model=schemas.CertificateGroupResponse)
def get_certificate_group(
    group_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    group = db.query(models.CertificateGroup).filter(models.CertificateGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@app.patch("/api/certificate-groups/{group_id}/visibility", response_model=schemas.CertificateGroupResponse)
def update_group_visibility(
    request: Request,
    group_id: uuid.UUID,
    visibility: schemas.CertificateGroupVisibilityUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    group = db.query(models.CertificateGroup).filter(models.CertificateGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group.visible_to_verifier = visibility.visible_to_verifier
    
    # Also update all certificates in the group
    db.query(models.Certificate).filter(models.Certificate.group_id == group_id).update(
        {models.Certificate.visible_to_verifier: visibility.visible_to_verifier},
        synchronize_session=False
    )
    
    db.commit()
    db.refresh(group)
    audit.log_action(db, "change_verifier_visibility", "certificate_group", group.id, current_user.id, request, {"visible": visibility.visible_to_verifier})
    return group

@app.delete("/api/certificate-groups/{group_id}")
def delete_certificate_group(
    group_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    group = db.query(models.CertificateGroup).filter(models.CertificateGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # Delete referenced import batches first
    db.query(models.ImportBatch).filter(models.ImportBatch.group_id == group_id).delete(synchronize_session=False)
    
    # Delete referenced certificates
    db.query(models.Certificate).filter(models.Certificate.group_id == group_id).delete(synchronize_session=False)
    
    db.delete(group)
    db.commit()
    return {"message": "ลบโปรแกรมใบรับรองเรียบร้อยแล้ว"}

@app.post("/api/certificate-groups/{group_id}/import")
async def import_recipients(
    request: Request,
    group_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    group = db.query(models.CertificateGroup).filter(models.CertificateGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    contents = await file.read()
    decoded = contents.decode("utf-8-sig")
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    # Validate headers
    required_headers = ["recipient_name", "recipient_email", "course", "issue_date"]
    headers = csv_reader.fieldnames
    if not headers or not all(h in headers for h in required_headers):
        raise HTTPException(status_code=400, detail=f"Invalid CSV format. Required headers: {', '.join(required_headers)}")
    
    rows = list(csv_reader)
    valid_rows = []
    errors = []
    
    for idx, row in enumerate(rows, start=1):
        name = row.get("recipient_name")
        email = row.get("recipient_email")
        course = row.get("course")
        issue_date_str = row.get("issue_date")
        expire_date_str = row.get("expire_date")
        
        row_errors = []
        if not name:
            row_errors.append("recipient_name is required")
        if not email:
            row_errors.append("recipient_email is required")
        if not course:
            row_errors.append("course is required")
        if not issue_date_str:
            row_errors.append("issue_date is required")
            
        parsed_issue_date = None
        parsed_expire_date = None
        if issue_date_str:
            try:
                parsed_issue_date = datetime.strptime(issue_date_str, "%Y-%m-%d").date()
            except ValueError:
                row_errors.append("issue_date must be in YYYY-MM-DD format")
                
        if expire_date_str:
            try:
                parsed_expire_date = datetime.strptime(expire_date_str, "%Y-%m-%d").date()
            except ValueError:
                row_errors.append("expire_date must be in YYYY-MM-DD format")
                
        if row_errors:
            errors.append({"row": idx, "errors": row_errors})
        else:
            valid_rows.append({
                "recipient_name": name,
                "recipient_email": email,
                "course": course,
                "issue_date": parsed_issue_date,
                "expire_date": parsed_expire_date
            })
            
    if errors:
        # Create failed batch
        batch = models.ImportBatch(
            id=uuid.uuid4(),
            group_id=group_id,
            file_name=file.filename,
            total_rows=len(rows),
            valid_rows=len(valid_rows),
            invalid_rows=len(errors),
            status="failed",
            created_by=current_user.id
        )
        db.add(batch)
        db.commit()
        return {
            "import_batch_id": batch.id,
            "status": "failed",
            "total_rows": len(rows),
            "valid_rows": len(valid_rows),
            "invalid_rows": len(errors),
            "errors": errors
        }
    
    # Save valid batch
    batch = models.ImportBatch(
        id=uuid.uuid4(),
        group_id=group_id,
        file_name=file.filename,
        total_rows=len(rows),
        valid_rows=len(valid_rows),
        invalid_rows=0,
        status="validated",
        created_by=current_user.id
    )
    db.add(batch)
    db.commit()
    
    # Pre-populate certificates as 'pending'
    for r in valid_rows:
        cert_no = generate_cert_no(db)
        token = generate_verification_token()
        
        cert = models.Certificate(
            id=uuid.uuid4(),
            certificate_no=cert_no,
            recipient_name=r["recipient_name"],
            recipient_email=r["recipient_email"],
            course=r["course"],
            issue_date=r["issue_date"],
            expire_date=r["expire_date"],
            status="pending",
            verification_token=token,
            visible_to_verifier=group.visible_to_verifier,
            group_id=group_id,
            template_id=group.template_id,
            issuer_id=group.issuer_id
        )
        db.add(cert)
    
    db.commit()
    audit.log_action(db, "bulk_import", "import_batch", batch.id, current_user.id, request, {"total_rows": len(rows)})
    return {
        "import_batch_id": batch.id,
        "status": "validated",
        "total_rows": len(rows),
        "valid_rows": len(valid_rows),
        "invalid_rows": 0,
        "can_generate": True
    }

@app.post("/api/certificate-groups/{group_id}/whitelist-import")
def import_from_whitelist(
    request: Request,
    group_id: uuid.UUID,
    payload: schemas.WhitelistSelectionImportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    group = db.query(models.CertificateGroup).filter(models.CertificateGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="ไม่พบโปรแกรมใบรับรองนี้")
        
    if not payload.whitelist_ids:
        raise HTTPException(status_code=400, detail="กรุณาเลือกผู้สมัครจาก Whitelist")
        
    wl_users = db.query(models.WhitelistUser).filter(models.WhitelistUser.id.in_(payload.whitelist_ids)).all()
    if not wl_users:
        raise HTTPException(status_code=400, detail="ไม่พบข้อมูลผู้สมัครที่เลือกใน Whitelist")
        
    batch = models.ImportBatch(
        id=uuid.uuid4(),
        group_id=group_id,
        file_name="Whitelist Selection",
        total_rows=len(wl_users),
        valid_rows=len(wl_users),
        invalid_rows=0,
        status="validated",
        created_by=current_user.id
    )
    db.add(batch)
    
    for u in wl_users:
        cert_no = generate_cert_no(db)
        token = generate_verification_token()
        
        recipient_name = u.name if u.name else u.email.split("@")[0]
        
        cert = models.Certificate(
            id=uuid.uuid4(),
            certificate_no=cert_no,
            recipient_name=recipient_name,
            recipient_email=u.email,
            course=payload.course,
            issue_date=payload.issue_date,
            expire_date=payload.expire_date,
            status="pending",
            verification_token=token,
            visible_to_verifier=group.visible_to_verifier,
            group_id=group_id,
            template_id=group.template_id,
            issuer_id=group.issuer_id
        )
        db.add(cert)
        
    db.commit()
    audit.log_action(db, "whitelist_import", "import_batch", batch.id, current_user.id, request, {"total_rows": len(wl_users)})
    return {
        "import_batch_id": batch.id,
        "status": "validated",
        "total_rows": len(wl_users),
        "valid_rows": len(wl_users),
        "invalid_rows": 0,
        "can_generate": True
    }

@app.get("/api/certificate-groups/{group_id}/preview")
def preview_group_certificates(
    group_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    group = db.query(models.CertificateGroup).filter(models.CertificateGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    certs = db.query(models.Certificate).filter(models.Certificate.group_id == group_id).limit(5).all()
    preview_items = []
    for c in certs:
        preview_items.append({
            "recipient_name": c.recipient_name,
            "recipient_email": c.recipient_email,
            "certificate_no": c.certificate_no,
            "preview_url": f"/api/certificates/{c.id}/print"
        })
        
    html_preview = ""
    if certs:
        first_cert = certs[0]
        template = db.query(models.Template).filter(models.Template.id == first_cert.template_id).first()
        issuer = db.query(models.Issuer).filter(models.Issuer.id == first_cert.issuer_id).first()
        if template and issuer:
            html_content = template.html
            substitutions = {
                "{{name}}": first_cert.recipient_name,
                "{{recipient_name}}": first_cert.recipient_name,
                "{{course}}": first_cert.course,
                "{{issue_date}}": str(first_cert.issue_date),
                "{{expire_date}}": str(first_cert.expire_date) if first_cert.expire_date else "N/A",
                "{{certificate_no}}": first_cert.certificate_no,
                "{{issuer_name}}": issuer.name,
                "{{organization}}": issuer.organization,
                "{{qr_code}}": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", # dummy 1x1 black pixel
                "{{logo}}": issuer.logo_url or "",
                "{{signature}}": issuer.signature_image_url or ""
            }
            for placeholder, val in substitutions.items():
                html_content = html_content.replace(placeholder, str(val))
            
            html_preview = f"""
            <style>
            {template.css or ""}
            </style>
            {html_content}
            """
            
    return {
        "group_id": group_id,
        "sample_count": len(preview_items),
        "preview_items": preview_items,
        "html_preview": html_preview
    }

@app.post("/api/certificate-groups/{group_id}/generate")
def generate_group_certificates(
    request: Request,
    group_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    group = db.query(models.CertificateGroup).filter(models.CertificateGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    certs = db.query(models.Certificate).filter(
        models.Certificate.group_id == group_id,
        models.Certificate.status == "pending"
    ).all()
    
    if not certs:
        raise HTTPException(status_code=400, detail="No pending certificates to generate in this group.")
        
    # Mark group as active
    group.status = "active"
    db.commit()
    
    # Enqueue tasks in Redis
    cert_ids = [c.id for c in certs]
    queue_utils.push_bulk_pdf_jobs(cert_ids)
    
    audit.log_action(db, "generate_certificate_group", "certificate_group", group.id, current_user.id, request, {"count": len(cert_ids)})
    
    return {
        "group_id": group_id,
        "status": "generating",
        "total_jobs": len(cert_ids),
        "message": "Certificate generation jobs have been queued."
    }

# --- CERTIFICATES ---
@app.post("/api/certificates", response_model=schemas.CertificateResponse)
def create_single_certificate(
    request: Request,
    cert_in: schemas.CertificateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    cert_no = generate_cert_no(db)
    token = generate_verification_token()
    
    cert = models.Certificate(
        id=uuid.uuid4(),
        certificate_no=cert_no,
        recipient_name=cert_in.recipient_name,
        recipient_email=cert_in.recipient_email,
        course=cert_in.course,
        issue_date=cert_in.issue_date,
        expire_date=cert_in.expire_date,
        status="pending",
        verification_token=token,
        visible_to_verifier=cert_in.visible_to_verifier,
        group_id=cert_in.group_id,
        template_id=cert_in.template_id,
        issuer_id=cert_in.issuer_id
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    
    # Push single job to queue
    queue_utils.push_pdf_job(cert.id)
    
    audit.log_action(db, "create_certificate", "certificate", cert.id, current_user.id, request)
    return cert

@app.get("/api/certificates", response_model=List[schemas.CertificateResponse])
def list_certificates(
    group_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role in ["super_admin", "staff"]:
        query = db.query(models.Certificate)
        if group_id:
            query = query.filter(models.Certificate.group_id == group_id)
        return query.all()
    else:
        query = db.query(models.Certificate).filter(
            models.Certificate.recipient_email == current_user.email,
            models.Certificate.visible_to_verifier == True
        )
        if group_id:
            query = query.filter(models.Certificate.group_id == group_id)
        return query.all()

@app.delete("/api/certificates/{cert_id}")
def delete_certificate(
    cert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    cert = db.query(models.Certificate).filter(models.Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
        
    db.delete(cert)
    db.commit()
    return {"message": "ลบใบรับรองเรียบร้อยแล้ว"}

@app.get("/api/certificates/{cert_id}", response_model=schemas.CertificateResponse)
def get_certificate(
    cert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    cert = db.query(models.Certificate).filter(models.Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
        
    # Check permissions
    if current_user.role not in ["super_admin", "staff"]:
        if cert.recipient_email != current_user.email or not cert.visible_to_verifier:
            raise HTTPException(status_code=403, detail="Not authorized to view this certificate")
            
    return cert

@app.get("/api/certificates/{cert_id}/download")
def download_certificate(
    request: Request,
    cert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    cert = db.query(models.Certificate).filter(models.Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
        
    # Check permissions
    if current_user.role not in ["super_admin", "staff"]:
        if cert.recipient_email != current_user.email or not cert.visible_to_verifier:
            raise HTTPException(status_code=403, detail="Not authorized to download this certificate")
            
    if cert.status != "valid" or not cert.pdf_url:
        raise HTTPException(status_code=400, detail="Certificate PDF is not generated yet.")
        
    # Generate presigned URL using internal S3 client
    s3 = storage.get_s3_client()
    file_name = f"{cert.id}.pdf"
    
    try:
        raw_presigned = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': storage.BUCKET_NAME, 'Key': file_name},
            ExpiresIn=900
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {e}")
        
    # Determine the public domain and scheme dynamically
    host = request.headers.get("host", os.getenv("DOMAIN", "localhost"))
    proto = request.headers.get("x-forwarded-proto", "http")
    
    import urllib.parse
    parsed = urllib.parse.urlparse(raw_presigned)
    
    referer = request.headers.get("referer", "")
    if "/certificate" in referer or "/certificate" in request.url.path:
        public_path = f"/certificate/certificates/{file_name}"
    else:
        public_path = f"/certificates/{file_name}"
        
    # Construct the final public presigned URL
    public_url = urllib.parse.urlunparse((
        proto,
        host,
        public_path,
        parsed.params,
        parsed.query,
        parsed.fragment
    ))
    
    audit.log_action(db, "download_pdf", "certificate", cert.id, current_user.id, request)
    return {"download_url": public_url}

@app.get("/api/certificates/{cert_id}/file")
def get_certificate_file(
    cert_id: uuid.UUID,
    token: str,
    db: Session = Depends(get_db)
):
    # Verify temporary token
    try:
        payload = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        token_cert_id = payload.get("sub")
        token_type = payload.get("type")
        if token_type != "file_download" or token_cert_id != str(cert_id):
            raise HTTPException(status_code=403, detail="Invalid download token")
    except Exception:
        raise HTTPException(status_code=403, detail="Invalid or expired download token")
        
    cert = db.query(models.Certificate).filter(models.Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
        
    s3 = storage.get_s3_client()
    file_name = f"{cert.id}.pdf"
    
    try:
        from fastapi.responses import StreamingResponse
        response = s3.get_object(Bucket=storage.BUCKET_NAME, Key=file_name)
        return StreamingResponse(
            response["Body"],
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={cert.certificate_no}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving PDF from storage: {e}")

@app.get("/api/certificates/{cert_id}/print")
def print_certificate(
    request: Request,
    cert_id: uuid.UUID,
    hide_btn: bool = False,
    db: Session = Depends(get_db)
):
    # Print route does not require token auth directly (can be accessed via print link or verification URL)
    # Check if certificate exists
    cert = db.query(models.Certificate).filter(models.Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
        
    # Serve basic print/HTML response containing the HTML content compiled with the recipient information
    # We can fetch the template and compile it.
    template = db.query(models.Template).filter(models.Template.id == cert.template_id).first()
    issuer = db.query(models.Issuer).filter(models.Issuer.id == cert.issuer_id).first()
    
    import qrcode
    import io
    import base64

    # Determine external hostname and scheme for QR code
    host = request.headers.get("host", os.getenv("DOMAIN", "localhost"))
    proto = request.headers.get("x-forwarded-proto", "http")
    
    verify_url = f"{proto}://{host}/certificate/verify/{cert.verification_token}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(verify_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    try:
        img.save(buffered, format="PNG")
    except TypeError:
        img.save(buffered)
    qr_b64 = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode()}"

    def resolve_ext_img(url_path: str) -> str:
        if not url_path:
            return ""
        if url_path.startswith("http://") or url_path.startswith("https://"):
            return url_path
        if url_path.startswith("/"):
            return f"{proto}://{host}{url_path}"
        return f"{proto}://{host}/{url_path}"

    html_content = template.html
    # Basic Jinja2-like substitution
    substitutions = {
        "{{name}}": cert.recipient_name,
        "{{recipient_name}}": cert.recipient_name,
        "{{course}}": cert.course,
        "{{issue_date}}": str(cert.issue_date),
        "{{expire_date}}": str(cert.expire_date) if cert.expire_date else "N/A",
        "{{certificate_no}}": cert.certificate_no,
        "{{issuer_name}}": issuer.name,
        "{{organization}}": issuer.organization,
        "{{qr_code}}": qr_b64,
        "{{logo}}": resolve_ext_img(issuer.logo_url),
        "{{signature}}": resolve_ext_img(issuer.signature_image_url)
    }
    
    for placeholder, val in substitutions.items():
        html_content = html_content.replace(placeholder, val)
        
    hide_btn_style = ".print-btn { display: none !important; }" if hide_btn else ""
    
    # Wrap in CSS
    print_html = f"""
    <html>
    <head>
    <style>
    {template.css or ""}
    {hide_btn_style}
    @media print {{
        body {{ margin: 0; }}
        .print-btn {{ display: none !important; }}
    }}
    </style>
    </head>
    <body>
    <div style="text-align: center; margin: 10px;" class="print-btn">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Print Certificate</button>
    </div>
    {html_content}
    </body>
    </html>
    """
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=print_html)

@app.post("/api/certificates/{cert_id}/revoke", response_model=schemas.CertificateResponse)
def revoke_certificate(
    request: Request,
    cert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    cert = db.query(models.Certificate).filter(models.Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
        
    cert.status = "revoked"
    db.commit()
    db.refresh(cert)
    
    audit.log_action(db, "revoke_certificate", "certificate", cert.id, current_user.id, request)
    return cert

# --- VERIFIER PROFILE ---
@app.get("/api/me/certificate-groups")
def get_verifier_groups(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["verifier"]))
):
    # Match certificates by recipient_email, where visible_to_verifier = True
    certs = db.query(models.Certificate).filter(
        models.Certificate.recipient_email == current_user.email,
        models.Certificate.visible_to_verifier == True
    ).all()
    
    # Group certificates by CertificateGroup
    groups_dict = {}
    for cert in certs:
        g = db.query(models.CertificateGroup).filter(models.CertificateGroup.id == cert.group_id).first()
        g_id = str(g.id) if g else "standalone"
        g_name = g.name if g else "Individual Certificates"
        g_category = g.category if g else "General"
        g_level = g.level if g else ""
        g_issuer = db.query(models.Issuer).filter(models.Issuer.id == cert.issuer_id).first().name
        
        if g_id not in groups_dict:
            groups_dict[g_id] = {
                "group_id": g_id,
                "name": g_name,
                "category": g_category,
                "level": g_level,
                "issuer": g_issuer,
                "certificate_count": 0,
                "certificates": []
            }
            
        groups_dict[g_id]["certificates"].append({
            "id": cert.id,
            "certificate_no": cert.certificate_no,
            "course": cert.course,
            "status": cert.status,
            "issue_date": cert.issue_date,
            "print_url": f"/api/certificates/{cert.id}/print",
            "download_url": f"/api/certificates/{cert.id}/download"
        })
        groups_dict[g_id]["certificate_count"] += 1
        
    return {
        "email": current_user.email,
        "groups": list(groups_dict.values())
    }

# --- PUBLIC VERIFICATION ---
@app.get("/api/verify/{token}", response_model=schemas.CertificateVerifyResponse)
def verify_certificate_token(
    token: str,
    db: Session = Depends(get_db)
):
    cert = db.query(models.Certificate).filter(
        (models.Certificate.verification_token == token) |
        (models.Certificate.certificate_no == token)
    ).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
        
    issuer = db.query(models.Issuer).filter(models.Issuer.id == cert.issuer_id).first()
    
    is_valid = cert.status in ["valid", "generated"]
    return {
        "status": cert.status,
        "valid": is_valid,
        "certificate_no": cert.certificate_no,
        "recipient_name": cert.recipient_name,
        "course": cert.course,
        "issue_date": cert.issue_date,
        "issuer": issuer.name if issuer else "N/A"
    }

@app.post("/api/verify/pdf")
async def verify_certificate_pdf(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    # Compute SHA256 of upload PDF file
    sha256_hash = hashlib.sha256(contents).hexdigest()
    
    cert = db.query(models.Certificate).filter(models.Certificate.certificate_hash == sha256_hash).first()
    if not cert:
        raise HTTPException(status_code=404, detail="PDF hash does not match any certificate in our records.")
        
    is_verified = cert.status in ["valid", "generated"]
    return {
        "status": cert.status,
        "verified": is_verified,
        "message": "PDF hash matches the original certificate.",
        "certificate_no": cert.certificate_no,
        "recipient_name": cert.recipient_name,
        "course": cert.course,
        "issue_date": cert.issue_date
    }

# --- AUDIT LOGS ---
@app.get("/api/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    return db.query(models.AuditLog).options(joinedload(models.AuditLog.actor)).order_by(models.AuditLog.created_at.desc()).all()

@app.delete("/api/audit-logs")
def clear_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    db.query(models.AuditLog).delete()
    db.commit()
    return {"message": "ล้างบันทึกกิจกรรมเรียบร้อยแล้ว"}

# --- USER MANAGEMENT ---
@app.get("/api/users", response_model=List[schemas.UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()

@app.put("/api/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: uuid.UUID,
    user_in: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้นี้")
    
    # Validation: If changing role and user is the last super_admin, prevent it.
    if user_in.role and user_in.role != user.role and user.role == "super_admin":
        super_admin_count = db.query(models.User).filter(models.User.role == "super_admin").count()
        if super_admin_count <= 1:
            raise HTTPException(status_code=400, detail="ไม่สามารถเปลี่ยนบทบาทของผู้ดูแลระบบคนสุดท้ายได้")

    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.role is not None:
        user.role = user_in.role
    if user_in.status is not None:
        user.status = user_in.status
    if user_in.password is not None and user_in.password.strip() != "":
        user.hashed_password = auth.get_password_hash(user_in.password.strip())
        
    db.commit()
    db.refresh(user)
    return user

@app.delete("/api/users/{user_id}")
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้นี้")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="ไม่สามารถลบตัวเองออกจากระบบได้")
        
    if user.role == "super_admin":
        super_admin_count = db.query(models.User).filter(models.User.role == "super_admin").count()
        if super_admin_count <= 1:
            raise HTTPException(status_code=400, detail="ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้")

    # Clean up referenced actor_id in AuditLog
    db.query(models.AuditLog).filter(models.AuditLog.actor_id == user_id).update({models.AuditLog.actor_id: None}, synchronize_session=False)

    # Clean up referenced created_by in CertificateGroup
    db.query(models.CertificateGroup).filter(models.CertificateGroup.created_by == user_id).update({models.CertificateGroup.created_by: None}, synchronize_session=False)

    # Clean up referenced created_by in ImportBatch
    db.query(models.ImportBatch).filter(models.ImportBatch.created_by == user_id).update({models.ImportBatch.created_by: None}, synchronize_session=False)

    # Delete all certificates belonging to this user's email regardless of their role
    db.query(models.Certificate).filter(models.Certificate.recipient_email == user.email).delete(synchronize_session=False)

    db.delete(user)
    db.commit()
    return {"message": "ลบผู้ใช้รายนี้ออกจากระบบเรียบร้อยแล้ว"}

# --- FILE UPLOAD ---
@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="ไฟล์ต้องเป็นรูปภาพเท่านั้น (PNG, JPG, JPEG)")
    
    contents = await file.read()
    file_extension = os.path.splitext(file.filename)[1]
    if not file_extension:
        file_extension = ".png"
        
    unique_filename = f"uploads/{uuid.uuid4()}{file_extension}"
    
    url = storage.upload_file_bytes(contents, unique_filename, content_type=file.content_type)
    
    relative_url = f"/certificates/{unique_filename}"
    
    return {"url": relative_url}


# --- GOOGLE OAUTH & WHITELIST ENDPOINTS ---
import json
import urllib.request
import urllib.parse
from datetime import timedelta

def get_callback_url(request: Request):
    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.url.netloc)
    if not host:
        host = request.url.netloc
    if "rai.kmitl.ac.th" in host:
        scheme = "https"
    return f"{scheme}://{host}/certificate/api/auth/google/callback"

@app.get("/api/auth/google/config")
def get_google_config(db: Session = Depends(get_db)):
    enabled = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_oauth_enabled").first()
    client_id = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_client_id").first()
    
    is_enabled = (enabled.value == "true") if enabled else False
    c_id = client_id.value if client_id else ""
    return {
        "google_oauth_enabled": is_enabled,
        "google_client_id": c_id
    }

@app.get("/api/auth/google/login")
def google_login(request: Request, db: Session = Depends(get_db)):
    enabled = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_oauth_enabled").first()
    client_id = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_client_id").first()
    
    is_enabled = (enabled.value == "true") if enabled else False
    c_id = client_id.value if client_id else ""
    
    if not is_enabled or not c_id:
        raise HTTPException(status_code=400, detail="Google OAuth is not configured or disabled")
        
    redirect_uri = get_callback_url(request)
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urllib.parse.urlencode({
            "response_type": "code",
            "client_id": c_id,
            "redirect_uri": redirect_uri,
            "scope": "openid email profile",
            "prompt": "select_account"
        })
    )
    return RedirectResponse(url=google_auth_url)

@app.get("/api/auth/google/callback")
async def google_callback(request: Request, code: str, db: Session = Depends(get_db)):
    enabled = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_oauth_enabled").first()
    client_id = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_client_id").first()
    client_secret = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_client_secret").first()
    
    is_enabled = (enabled.value == "true") if enabled else False
    c_id = client_id.value.strip() if client_id else ""
    c_secret = client_secret.value.strip() if client_secret else ""
    
    if not is_enabled or not c_id or not c_secret:
        return RedirectResponse(url="/certificate/?error=google_oauth_disabled")
        
    redirect_uri = get_callback_url(request)
    
    # Exchange code for tokens via urllib
    token_url = "https://oauth2.googleapis.com/token"
    post_data = urllib.parse.urlencode({
        "code": code,
        "client_id": c_id,
        "client_secret": c_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }).encode("utf-8")
    
    try:
        req = urllib.request.Request(
            token_url,
            data=post_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            token_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        err_msg = str(e)
        if hasattr(e, "read"):
            err_msg = e.read().decode("utf-8")
        return RedirectResponse(url=f"/certificate/?error=google_token_failed&detail={urllib.parse.quote(err_msg)}")
        
    access_token = token_data.get("access_token")
    if not access_token:
        return RedirectResponse(url="/certificate/?error=google_access_token_missing")
        
    # Get user profile from Google
    userinfo_url = f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={access_token}"
    try:
        req = urllib.request.Request(userinfo_url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            profile_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        err_msg = str(e)
        if hasattr(e, "read"):
            err_msg = e.read().decode("utf-8")
        return RedirectResponse(url=f"/certificate/?error=google_profile_failed&detail={urllib.parse.quote(err_msg)}")
        
    email = profile_data.get("email")
    full_name = profile_data.get("name", email.split("@")[0])
    
    if not email:
        return RedirectResponse(url="/certificate/?error=google_email_missing")
        
    # Check Whitelist
    whitelisted = db.query(models.WhitelistUser).filter(models.WhitelistUser.email == email).first()
    if not whitelisted:
        return RedirectResponse(url=f"/certificate/?error=not_in_whitelist&email={urllib.parse.quote(email)}")
        
    # Check if user already exists in User table
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Auto-create user with role "verifier"
        user = models.User(
            id=uuid.uuid4(),
            email=email,
            full_name=full_name,
            role="verifier",
            password_hash=auth.get_password_hash(str(uuid.uuid4())),
            status="active"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
    # Log action
    audit.log_action(db, "google_login", "user", user.id, user.id, request, {"email": email})
    
    # Create Access Token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    # Redirect to frontend dashboard with credentials
    return RedirectResponse(url=f"/certificate/?token={jwt_token}&role={user.role}&email={user.email}")


# --- SETTINGS MANAGEMENT ---
@app.get("/api/admin/settings", response_model=schemas.GoogleOauthConfigResponse)
def get_admin_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    enabled = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_oauth_enabled").first()
    client_id = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_client_id").first()
    client_secret = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_client_secret").first()
    
    is_enabled = (enabled.value == "true") if enabled else False
    c_id = client_id.value if client_id else ""
    c_secret = client_secret.value if client_secret else ""
    
    hidden_secret = ""
    if c_secret:
        hidden_secret = c_secret[:4] + "*" * (len(c_secret) - 4) if len(c_secret) > 4 else "****"
        
    return {
        "google_oauth_enabled": is_enabled,
        "google_client_id": c_id,
        "google_client_secret_hidden": hidden_secret
    }

@app.post("/api/admin/settings")
def update_admin_settings(
    config: schemas.GoogleOauthConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    enabled = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_oauth_enabled").first()
    if not enabled:
        enabled = models.SystemSetting(key="google_oauth_enabled")
        db.add(enabled)
    enabled.value = "true" if config.google_oauth_enabled else "false"
    
    client_id = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_client_id").first()
    if not client_id:
        client_id = models.SystemSetting(key="google_client_id")
        db.add(client_id)
    client_id.value = config.google_client_id.strip()
    
    secret_input = config.google_client_secret.strip() if config.google_client_secret else ""
    if secret_input and not secret_input.endswith("*****") and not all(c in "•* " for c in secret_input):
        client_secret = db.query(models.SystemSetting).filter(models.SystemSetting.key == "google_client_secret").first()
        if not client_secret:
            client_secret = models.SystemSetting(key="google_client_secret")
            db.add(client_secret)
        client_secret.value = secret_input
        
    db.commit()
    return {"message": "บันทึกการตั้งค่าเรียบร้อยแล้ว"}


# --- WHITELIST MANAGEMENT ---
@app.get("/api/admin/whitelist", response_model=List[schemas.WhitelistUserResponse])
def get_whitelist(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin", "staff"]))
):
    return db.query(models.WhitelistUser).order_by(models.WhitelistUser.created_at.desc()).all()

@app.post("/api/admin/whitelist", response_model=schemas.WhitelistUserResponse)
def add_to_whitelist(
    user_in: schemas.WhitelistUserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    existing = db.query(models.WhitelistUser).filter(models.WhitelistUser.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="อีเมลนี้อยู่ใน Whitelist เรียบร้อยแล้ว")
        
    whitelisted = models.WhitelistUser(
        id=uuid.uuid4(),
        email=user_in.email,
        name=user_in.name
    )
    db.add(whitelisted)
    db.commit()
    db.refresh(whitelisted)
    return whitelisted

@app.post("/api/admin/whitelist/import")
async def import_whitelist(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    contents = await file.read()
    decoded = contents.decode("utf-8-sig")
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    headers = csv_reader.fieldnames
    if not headers or "email" not in [h.lower() for h in headers]:
        raise HTTPException(status_code=400, detail="รูปแบบ CSV ไม่ถูกต้อง ต้องมีคอลัมน์ email")
        
    email_key = next(h for h in headers if h.lower() == "email")
    name_key = next((h for h in headers if h.lower() == "name"), None)
    
    total = 0
    added = 0
    errors = []
    
    for idx, row in enumerate(csv_reader, start=1):
        email = row.get(email_key, "").strip()
        name = row.get(name_key, "").strip() if name_key else None
        
        if not email:
            errors.append(f"แถวที่ {idx}: ไม่พบอีเมล")
            continue
            
        existing = db.query(models.WhitelistUser).filter(models.WhitelistUser.email == email).first()
        if existing:
            continue
            
        whitelisted = models.WhitelistUser(
            id=uuid.uuid4(),
            email=email,
            name=name
        )
        db.add(whitelisted)
        added += 1
        total += 1
        
    db.commit()
    return {
        "total_rows": total,
        "imported_rows": added,
        "errors": errors
    }

@app.delete("/api/admin/whitelist/{email}")
def delete_from_whitelist(
    email: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    user = db.query(models.WhitelistUser).filter(models.WhitelistUser.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้นี้ใน Whitelist")
        
    app_user = db.query(models.User).filter(models.User.email == email, models.User.role == "verifier").first()
    if app_user:
        db.query(models.Certificate).filter(models.Certificate.recipient_email == email).delete(synchronize_session=False)
        db.delete(app_user)
        
    db.delete(user)
    db.commit()
    return {"message": "ลบชื่อผู้ใช้ออกจากระบบและ Whitelist เรียบร้อยแล้ว"}

@app.put("/api/admin/whitelist/{user_id}", response_model=schemas.WhitelistUserResponse)
def update_whitelist_user(
    user_id: uuid.UUID,
    user_in: schemas.WhitelistUserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    wl_user = db.query(models.WhitelistUser).filter(models.WhitelistUser.id == user_id).first()
    if not wl_user:
        raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้นี้ใน Whitelist")
        
    new_email = user_in.email.strip().lower()
    existing = db.query(models.WhitelistUser).filter(
        models.WhitelistUser.email == new_email,
        models.WhitelistUser.id != user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="อีเมลนี้อยู่ใน Whitelist เรียบร้อยแล้ว")
        
    old_email = wl_user.email
    wl_user.email = new_email
    wl_user.name = user_in.name.strip() if user_in.name else None
    
    if old_email != new_email:
        app_user = db.query(models.User).filter(models.User.email == old_email, models.User.role == "verifier").first()
        if app_user:
            conflict_user = db.query(models.User).filter(models.User.email == new_email).first()
            if conflict_user:
                raise HTTPException(status_code=400, detail="มีผู้ใช้ที่ใช้อีเมลนี้อยู่ในระบบแล้ว ไม่สามารถแก้ไขได้")
            app_user.email = new_email
            if wl_user.name:
                app_user.full_name = wl_user.name
                
            db.query(models.Certificate).filter(
                models.Certificate.recipient_email == old_email
            ).update({models.Certificate.recipient_email: new_email}, synchronize_session=False)

    db.commit()
    db.refresh(wl_user)
    return wl_user

@app.post("/api/admin/whitelist/bulk-delete")
def bulk_delete_from_whitelist(
    req: schemas.WhitelistBulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role(["super_admin"]))
):
    deleted_count = 0
    for user_id in req.ids:
        wl_user = db.query(models.WhitelistUser).filter(models.WhitelistUser.id == user_id).first()
        if not wl_user:
            continue
            
        email = wl_user.email
        app_user = db.query(models.User).filter(models.User.email == email, models.User.role == "verifier").first()
        if app_user:
            db.query(models.Certificate).filter(models.Certificate.recipient_email == email).delete(synchronize_session=False)
            db.delete(app_user)
            
        db.delete(wl_user)
        deleted_count += 1
        
    db.commit()
    return {"message": f"ลบผู้ใช้ออกจาก Whitelist สำเร็จทั้งหมด {deleted_count} รายการ"}
