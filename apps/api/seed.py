import uuid
from datetime import date
from database import SessionLocal, engine
import models
import auth

# Sample HTML and CSS templates
SAMPLE_HTML = """
<div class="certificate-container">
    <div class="border-outer">
        <div class="border-inner">
            <!-- Header -->
            <div class="header">
                <span class="org-title">{{organization}}</span>
                <div class="academy-logo">🎓</div>
            </div>

            <!-- Title -->
            <h1 class="main-title">CERTIFICATE OF COMPLETION</h1>
            <p class="subtitle">This is proudly presented to</p>

            <!-- Name -->
            <h2 class="recipient-name">{{recipient_name}}</h2>
            
            <p class="accomplishment">
                for successfully completing the specialized certificate program in
            </p>
            <h3 class="course-name">{{course}}</h3>
            
            <p class="verification-info">
                Credential ID: {{certificate_no}} | Date of Issue: {{issue_date}}
            </p>

            <!-- Bottom Section (Signatures & QR) -->
            <div class="footer-section">
                <div class="signature-block">
                    <div class="sig-line"></div>
                    <p class="sig-name">{{issuer_name}}</p>
                    <p class="sig-title">Academic Director, {{organization}}</p>
                </div>
                
                <div class="qr-block">
                    <img class="qr-code-img" src="{{qr_code}}" alt="QR Code Verify" />
                    <p style="font-size: 10px; margin-top: 4px; color: #64748b;">Scan to Verify</p>
                </div>
            </div>
        </div>
    </div>
</div>
"""

SAMPLE_CSS = """
.certificate-container {
    width: 100%;
    height: 100vh;
    padding: 30px;
    background-color: #0b0f19;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #f8fafc;
}
.border-outer {
    border: 15px solid #1e293b;
    width: 100%;
    height: 100%;
    padding: 10px;
    box-sizing: border-box;
    position: relative;
    background: radial-gradient(circle, #131b2e 0%, #0b0f19 100%);
}
.border-inner {
    border: 3px double #3b82f6;
    width: 100%;
    height: 100%;
    padding: 40px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
}
.header {
    display: flex;
    flex-direction: column;
    align-items: center;
}
.org-title {
    font-size: 18px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #94a3b8;
    font-weight: 600;
}
.academy-logo {
    font-size: 40px;
    margin-top: 10px;
}
.main-title {
    font-size: 42px;
    font-weight: 800;
    letter-spacing: 1px;
    color: #3b82f6;
    margin: 10px 0;
    text-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
}
.subtitle {
    font-size: 16px;
    font-style: italic;
    color: #94a3b8;
}
.recipient-name {
    font-size: 38px;
    font-weight: 700;
    color: #ffffff;
    margin: 10px 0;
    border-bottom: 2px solid rgba(255,255,255,0.1);
    padding-bottom: 5px;
    min-width: 300px;
    text-align: center;
}
.accomplishment {
    font-size: 14px;
    color: #94a3b8;
    max-width: 500px;
    text-align: center;
}
.course-name {
    font-size: 24px;
    font-weight: 600;
    color: #3b82f6;
    margin-top: 5px;
}
.verification-info {
    font-size: 12px;
    color: #64748b;
    margin-top: 10px;
}
.footer-section {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 20px;
}
.signature-block {
    text-align: left;
}
.sig-line {
    width: 200px;
    height: 1px;
    background-color: #64748b;
    margin-bottom: 8px;
}
.sig-name {
    font-size: 14px;
    font-weight: 600;
    color: #f8fafc;
}
.sig-title {
    font-size: 12px;
    color: #94a3b8;
}
.qr-block {
    text-align: center;
}
.qr-code-img {
    width: 90px;
    height: 90px;
    border: 4px solid white;
    border-radius: 4px;
}
"""

def seed_database():
    db = SessionLocal()
    try:
        # Check if users already exist
        admin = db.query(models.User).filter(models.User.email == "admin@example.com").first()
        if admin:
            print("Database already seeded.")
            return

        print("Seeding database with default accounts...")
        
        # Create Super Admin
        admin = models.User(
            id=uuid.uuid4(),
            email="admin@example.com",
            full_name="System Super Admin",
            role="super_admin",
            password_hash=auth.get_password_hash("admin123"),
            status="active"
        )
        db.add(admin)

        # Create Staff
        staff = models.User(
            id=uuid.uuid4(),
            email="staff@example.com",
            full_name="Academic Staff Member",
            role="staff",
            password_hash=auth.get_password_hash("staff123"),
            status="active"
        )
        db.add(staff)

        # Create Verifier
        verifier = models.User(
            id=uuid.uuid4(),
            email="verifier@example.com",
            full_name="Somchai Jaidee",
            role="verifier",
            password_hash=auth.get_password_hash("verifier123"),
            status="active"
        )
        db.add(verifier)

        # Create Issuer
        issuer = models.Issuer(
            id=uuid.uuid4(),
            name="Dr. Jane Smith",
            organization="Example University",
            logo_url="🎓",
            signature_image_url=""
        )
        db.add(issuer)

        # Create Template
        template = models.Template(
            id=uuid.uuid4(),
            name="Dark Mode Elegant Certificate Template",
            html=SAMPLE_HTML,
            css=SAMPLE_CSS,
            version=1,
            status="active"
        )
        db.add(template)

        db.commit()
        print("Database seeded successfully!")
        print("Accounts created:")
        print("  - Super Admin: admin@example.com / admin123")
        print("  - Staff Member: staff@example.com / staff123")
        print("  - Verifier Student: verifier@example.com / verifier123")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
