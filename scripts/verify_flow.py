import os
import time
import requests
import io

BASE_URL = os.getenv("BASE_URL", "http://localhost")

def test_full_flow():
    print("=== STARTING INTEGRATION TEST ===")
    
    # 1. Login as Staff
    print("1. Logging in as Staff...")
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "staff@example.com",
        "password": "staff123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_data = login_res.json()
    token = login_data["access_token"]
    print("   Login successful. Token acquired.")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 0. Clean up existing temp verifier if any (done early to prevent cascading deletion of newly generated certs)
    adm_headers = {}
    adm_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@example.com",
        "password": "admin123"
    })
    if adm_login.status_code == 200:
        adm_token = adm_login.json()["access_token"]
        adm_headers = {"Authorization": f"Bearer {adm_token}"}
        users_res = requests.get(f"{BASE_URL}/api/users", headers=adm_headers)
        if users_res.status_code == 200:
            for u in users_res.json():
                if u["email"] == "temp_verifier_test@example.com":
                    requests.delete(f"{BASE_URL}/api/users/{u['id']}", headers=adm_headers)
    
    # 2. Get templates and issuers
    print("2. Fetching default template and issuer...")
    temp_res = requests.get(f"{BASE_URL}/api/templates", headers=headers)
    assert temp_res.status_code == 200
    templates = temp_res.json()
    assert len(templates) > 0
    template_id = templates[0]["id"]
    print(f"   Found template: {templates[0]['name']} (ID: {template_id})")
    
    iss_res = requests.get(f"{BASE_URL}/api/issuers", headers=headers)
    assert iss_res.status_code == 200
    issuers = iss_res.json()
    assert len(issuers) > 0
    issuer_id = issuers[0]["id"]
    print(f"   Found issuer: {issuers[0]['name']} (ID: {issuer_id})")
    
    # 3. Create Certificate Group
    print("3. Creating new Certificate Group...")
    group_res = requests.post(f"{BASE_URL}/api/certificate-groups", headers=headers, json={
        "name": "Google Data Analytics Certificate Program 2026",
        "description": "Professional certificate cohort.",
        "category": "Data",
        "level": "beginner",
        "template_id": template_id,
        "issuer_id": issuer_id,
        "visible_to_verifier": True
    })
    assert group_res.status_code == 200, f"Group creation failed: {group_res.text}"
    group_data = group_res.json()
    group_id = group_data["id"]
    print(f"   Group created successfully. ID: {group_id}")
    
    # 4. Import recipient list CSV
    print("4. Importing CSV recipient list...")
    # csv file containing 2 recipients:
    # 1. temp_verifier_test@example.com (so he can see it in his profile!)
    # 2. guest@example.com (standalone)
    csv_content = (
        "recipient_name,recipient_email,course,issue_date,expire_date\n"
        "Somchai Jaidee,temp_verifier_test@example.com,Google Data Analytics Basics,2026-06-27,2028-06-27\n"
        "Anong Dev,guest@example.com,Google Advanced SQL,2026-06-27,\n"
    )
    
    files = {"file": ("recipients.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    import_res = requests.post(f"{BASE_URL}/api/certificate-groups/{group_id}/import", headers=headers, files=files)
    assert import_res.status_code == 200, f"Import failed: {import_res.text}"
    import_data = import_res.json()
    assert import_data["status"] == "validated"
    assert import_data["total_rows"] == 2
    print("   CSV imported and validated successfully. Batch created.")
    
    # 5. Fetch preview
    print("5. Testing preview items...")
    prev_res = requests.get(f"{BASE_URL}/api/certificate-groups/{group_id}/preview", headers=headers)
    assert prev_res.status_code == 200
    prev_data = prev_res.json()
    assert len(prev_data["preview_items"]) == 2
    print(f"   Preview items retrieved. Preview URL sample: {prev_data['preview_items'][0]['preview_url']}")
    
    # 6. Trigger bulk generation
    print("6. Triggering bulk certificate generation...")
    gen_res = requests.post(f"{BASE_URL}/api/certificate-groups/{group_id}/generate", headers=headers)
    assert gen_res.status_code == 200, f"Generation trigger failed: {gen_res.text}"
    gen_data = gen_res.json()
    assert gen_data["status"] == "generating"
    print("   Queued jobs published to Redis successfully.")
    
    # 7. Wait for PDF worker to process jobs
    print("7. Waiting 10 seconds for Playwright PDF Worker to process...")
    time.sleep(10)
    
    # 8. List certificates as Staff to verify they are processed
    print("8. Listing certificates as Staff to verify status...")
    certs_res = requests.get(f"{BASE_URL}/api/certificates", headers=headers)
    assert certs_res.status_code == 200
    certs = certs_res.json()
    group_certs = [c for c in certs if c["group_id"] == group_id]
    assert len(group_certs) == 2, f"Expected 2 certificates, found {len(group_certs)}"
    
    for c in group_certs:
        print(f"   Certificate No: {c['certificate_no']} | Status: {c['status']} | Hash: {c['certificate_hash']}")
        assert c["status"] == "valid", f"Certificate {c['certificate_no']} failed to process (status: {c['status']})"
        assert c["pdf_url"] is not None
        assert c["certificate_hash"] is not None
    
    target_cert = [c for c in group_certs if c["recipient_name"] == "Somchai Jaidee"][0]
    token_to_verify = target_cert["verification_token"]
    
    # 9. Log in as Verifier and check wallet
    print("9. Registering/Logging in as Verifier...")

    reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": "temp_verifier_test@example.com",
        "password": "verifier123",
        "full_name": "Somchai Jaidee",
        "role": "verifier"
    })
    assert reg_res.status_code == 200
    temp_verifier_id = reg_res.json()["id"]

    v_login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "temp_verifier_test@example.com",
        "password": "verifier123"
    })
    assert v_login_res.status_code == 200
    v_token = v_login_res.json()["access_token"]
    v_headers = {"Authorization": f"Bearer {v_token}"}
    
    print("10. Fetching Verifier Wallet...")
    wallet_res = requests.get(f"{BASE_URL}/api/me/certificate-groups", headers=v_headers)
    assert wallet_res.status_code == 200
    wallet = wallet_res.json()
    assert len(wallet["groups"]) > 0, "No certificate groups returned for verifier"
    print(f"    Wallet matching successful. Found {len(wallet['groups'])} program(s) for verifier.")
    
    # 11. Public token verification
    print("11. Testing Public Verification via Token...")
    verify_res = requests.get(f"{BASE_URL}/api/verify/{token_to_verify}")
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["status"] == "valid"
    assert verify_data["recipient_name"] == "Somchai Jaidee"
    print(f"    Verification output: Name: {verify_data['recipient_name']} | Course: {verify_data['course']}")
    
    # 12. Public PDF integrity verification
    print("12. Testing Public Verification via PDF upload...")
    # First, let's fetch the actual PDF from MinIO using the authorized download endpoint
    download_res = requests.get(f"{BASE_URL}/api/certificates/{target_cert['id']}/download", headers=headers)
    assert download_res.status_code == 200, f"Failed to get presigned URL: {download_res.text}"
    presigned_url = download_res.json()["download_url"]
    if presigned_url.startswith("/"):
        presigned_url = f"{BASE_URL}{presigned_url}"
        
    pdf_download_res = requests.get(presigned_url)
    assert pdf_download_res.status_code == 200, f"Failed to download PDF: {pdf_download_res.status_code}"
    pdf_bytes = pdf_download_res.content
    
    # Upload PDF bytes to verify
    pdf_files = {"file": ("certificate.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    pdf_verify_res = requests.post(f"{BASE_URL}/api/verify/pdf", files=pdf_files)
    assert pdf_verify_res.status_code == 200, f"PDF upload verification failed: {pdf_verify_res.text}"
    pdf_verify_data = pdf_verify_res.json()
    assert pdf_verify_data["status"] == "valid"
    assert pdf_verify_data["certificate_no"] == target_cert["certificate_no"]
    print("    PDF upload verification successful! Integrity check matches.")
    
    # 13. Clean up temporary verifier
    print("13. Cleaning up temporary verifier...")
    if adm_headers:
        del_res = requests.delete(f"{BASE_URL}/api/users/{temp_verifier_id}", headers=adm_headers)
        assert del_res.status_code == 200, f"Temp verifier cleanup failed: {del_res.text}"
        print("    Temp verifier deleted successfully.")
        
    print("=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_full_flow()
