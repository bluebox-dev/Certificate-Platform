import os
import sys
import json
import time
import uuid
import base64
import io
import hashlib
import qrcode
import redis
import boto3
from botocore.client import Config
from sqlalchemy import create_engine, Column, String, Text, Boolean, Integer, Date, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from playwright.sync_api import sync_playwright

# Database config
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://app:secret@localhost:5432/ecert")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models duplicate (simplified for worker)
class User(Base):
    __tablename__ = "app_user"
    id = Column(String(50), primary_key=True)

class Issuer(Base):
    __tablename__ = "issuer"
    id = Column(String(50), primary_key=True)
    name = Column(String(255))
    organization = Column(String(255))
    logo_url = Column(Text)
    signature_image_url = Column(Text)

class Template(Base):
    __tablename__ = "template"
    id = Column(String(50), primary_key=True)
    name = Column(String(255))
    html = Column(Text)
    css = Column(Text)
    version = Column(Integer)

class Certificate(Base):
    __tablename__ = "certificate"
    id = Column(String(50), primary_key=True)
    certificate_no = Column(String(100))
    recipient_name = Column(String(255))
    recipient_email = Column(String(255))
    course = Column(String(255))
    issue_date = Column(Date)
    expire_date = Column(Date)
    status = Column(String(50))
    verification_token = Column(String(255))
    pdf_url = Column(Text)
    certificate_hash = Column(String(128))
    group_id = Column(String(50))
    template_id = Column(String(50))
    issuer_id = Column(String(50))

# S3 config
STORAGE_ENDPOINT = os.getenv("STORAGE_ENDPOINT", "http://localhost:9000")
ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "minio")
SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "miniosecret")
BUCKET_NAME = os.getenv("BUCKET_NAME", "certificates")
DOMAIN = os.getenv("DOMAIN", "localhost:3000") # host domain where frontend runs
EXTERNAL_STORAGE_ENDPOINT = os.getenv("EXTERNAL_STORAGE_ENDPOINT", f"http://{DOMAIN}/certificates")

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=STORAGE_ENDPOINT,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1"
    )

def get_external_domain_and_scheme():
    domain = DOMAIN
    scheme = "https"
    
    if "://" in domain:
        parts = domain.split("://", 1)
        scheme = parts[0]
        domain = parts[1]
    else:
        is_ip_or_local = False
        clean_domain = domain.split(":")[0]
        if clean_domain == "localhost" or clean_domain == "127.0.0.1":
            is_ip_or_local = True
        elif clean_domain.replace(".", "").isdigit():
            ip_parts = clean_domain.split(".")
            if len(ip_parts) == 4:
                first_octet = int(ip_parts[0])
                if first_octet in [10, 172, 192, 127]:
                    is_ip_or_local = True
        
        if is_ip_or_local:
            scheme = "http"
            
    return domain, scheme

def resolve_internal_image_url(url: str) -> str:
    if not url:
        return ""
    if url.startswith("http://") or url.startswith("https://"):
        if "/certificates/" in url:
            path = url.split("/certificates/", 1)[1]
            return f"http://minio:9000/certificates/{path}"
        return url
    if url.startswith("/certificates/"):
        path = url.split("/certificates/", 1)[1]
        return f"http://minio:9000/certificates/{path}"
    return url

def generate_qr_base64(token: str) -> str:
    domain, scheme = get_external_domain_and_scheme()
    path_suffix = ""
    if "/certificate" not in domain:
        path_suffix = "/certificate"
    clean_domain = domain.rstrip("/")
    verify_url = f"{scheme}://{clean_domain}{path_suffix}/verify/{token}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(verify_url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def process_job(certificate_id: str):
    db = SessionLocal()
    try:
        print(f"Processing certificate: {certificate_id}...")
        cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
        if not cert:
            print(f"Error: Certificate {certificate_id} not found.")
            return
        
        template = db.query(Template).filter(Template.id == cert.template_id).first()
        issuer = db.query(Issuer).filter(Issuer.id == cert.issuer_id).first()
        
        if not template or not issuer:
            print("Error: Template or Issuer not found.")
            cert.status = "failed"
            db.commit()
            return
        
        # 1. Generate QR Code
        qr_b64 = generate_qr_base64(cert.verification_token)
        
        # 2. Render HTML
        html_content = template.html
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
            "{{logo}}": resolve_internal_image_url(issuer.logo_url),
            "{{signature}}": resolve_internal_image_url(issuer.signature_image_url)
        }
        
        for placeholder, val in substitutions.items():
            html_content = html_content.replace(placeholder, val)
            
        full_html = f"""
        <html>
        <head>
        <style>
        {template.css or ""}
        body {{
            margin: 0;
            padding: 0;
            font-family: 'Helvetica', 'Arial', sans-serif;
            background-color: transparent;
        }}
        </style>
        </head>
        <body>
        {html_content}
        </body>
        </html>
        """
        
        # 3. Render PDF with Playwright
        pdf_bytes = None
        with sync_playwright() as p:
            # Run headless chromium
            browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-setuid-sandbox"])
            page = browser.new_page()
            # Set viewport to standard A4 landscape or portrait
            page.set_content(full_html)
            page.wait_for_load_state("networkidle")
            
            # Print to A4 landscape
            pdf_bytes = page.pdf(
                format="A4",
                landscape=True,
                print_background=True,
                margin={"top": "0mm", "bottom": "0mm", "left": "0mm", "right": "0mm"}
            )
            browser.close()
            
        if not pdf_bytes:
            print("Error generating PDF bytes.")
            cert.status = "failed"
            db.commit()
            return
            
        # 4. Generate SHA256 Hash
        sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
        
        # 5. Upload PDF to MinIO
        file_name = f"{cert.id}.pdf"
        s3 = get_s3_client()
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=file_name,
            Body=pdf_bytes,
            ContentType="application/pdf"
        )
        
        # 6. Update database record
        cert.status = "valid"
        cert.certificate_hash = sha256_hash
        cert.pdf_url = f"{EXTERNAL_STORAGE_ENDPOINT}/{file_name}"
        
        db.commit()
        print(f"Successfully processed certificate {certificate_id}. Hash: {sha256_hash}")
        
    except Exception as e:
        print(f"Exception processing certificate: {e}")
        try:
            cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
            if cert:
                cert.status = "failed"
                db.commit()
        except Exception as e2:
            print(f"Failed to set status to failed: {e2}")
    finally:
        db.close()

def main():
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    print(f"Connecting to Redis: {REDIS_URL}...")
    r = redis.from_url(REDIS_URL)
    
    print("PDF Worker started. Listening for jobs...")
    while True:
        try:
            # Blocking pop from Redis list
            job_data = r.blpop("certificate_pdf_queue", timeout=5)
            if job_data:
                # job_data is tuple: (queue_name, value)
                job = json.loads(job_data[1])
                certificate_id = job.get("certificate_id")
                if certificate_id:
                    process_job(certificate_id)
            else:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Worker shutting down.")
            break
        except Exception as e:
            print(f"Worker Loop Error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
