import os
import requests
import sys

BASE_URL = os.getenv("BASE_URL", "http://localhost")

def test_whitelist_selection_import():
    print("=== STARTING WHITELIST SELECTION IMPORT TEST ===")
    
    # 1. Login as Super Admin
    print("1. Logging in as Super Admin...")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@example.com",
        "password": "admin123"
    })
    if r.status_code != 200:
        print(f"Error: Login failed: {r.text}")
        sys.exit(1)
    
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("   Login successful.")
    
    # 2. Get Whitelist
    print("2. Fetching Whitelist...")
    r = requests.get(f"{BASE_URL}/api/admin/whitelist", headers=headers)
    if r.status_code != 200:
        print(f"Error: Fetching whitelist failed: {r.text}")
        sys.exit(1)
        
    wl_users = r.json()
    print(f"   Found {len(wl_users)} whitelist users.")
    
    if len(wl_users) == 0:
        # Add a dummy user to whitelist
        print("   Whitelist is empty. Adding a test user...")
        r = requests.post(f"{BASE_URL}/api/admin/whitelist", headers=headers, json={
            "email": "test_selected_recipient@kmitl.ac.th",
            "name": "Test Selected User"
        })
        if r.status_code != 200:
            print(f"Error: Failed to add to whitelist: {r.text}")
            sys.exit(1)
        wl_users = [r.json()]
        print("   Test user added successfully.")
        
    # Get a list of IDs to import
    selected_ids = [u["id"] for u in wl_users[:2]]
    print(f"   Selected Whitelist IDs for import: {selected_ids}")
    
    # 3. Create a test Certificate Group
    print("3. Creating a test Certificate Group...")
    # Fetch a template and issuer first
    r = requests.get(f"{BASE_URL}/api/templates", headers=headers)
    template_id = r.json()[0]["id"]
    r = requests.get(f"{BASE_URL}/api/issuers", headers=headers)
    issuer_id = r.json()[0]["id"]
    
    r = requests.post(f"{BASE_URL}/api/certificate-groups", headers=headers, json={
        "name": "Test Course via Whitelist",
        "description": "Integration testing course",
        "category": "Testing",
        "level": "intermediate",
        "template_id": template_id,
        "issuer_id": issuer_id,
        "visible_to_verifier": True
    })
    if r.status_code != 200:
        print(f"Error: Group creation failed: {r.text}")
        sys.exit(1)
        
    group = r.json()
    group_id = group["id"]
    print(f"   Group created successfully. ID: {group_id}")
    
    # 4. Import from Whitelist Selection
    print("4. Triggering import from Whitelist selection...")
    r = requests.post(f"{BASE_URL}/api/certificate-groups/{group_id}/whitelist-import", headers=headers, json={
        "whitelist_ids": selected_ids,
        "course": "Test Course via Whitelist Special Title",
        "issue_date": "2026-06-27",
        "expire_date": None
    })
    if r.status_code != 200:
        print(f"Error: Whitelist selection import failed: {r.text}")
        sys.exit(1)
        
    result = r.json()
    print(f"   Import successful. valid_rows: {result['valid_rows']}, status: {result['status']}")
    
    # 5. Verify pending certificates
    print("5. Verifying pending certificates...")
    r = requests.get(f"{BASE_URL}/api/certificate-groups/{group_id}/preview", headers=headers)
    if r.status_code != 200:
        print(f"Error: Preview failed: {r.text}")
        sys.exit(1)
        
    preview = r.json()
    print(f"   Found {len(preview['preview_items'])} preview certificates.")
    for idx, c in enumerate(preview["preview_items"]):
        print(f"   Cert {idx+1}: Name={c['recipient_name']}, Email={c['recipient_email']}")
        
    # 6. Delete test group
    print("6. Cleaning up test Certificate Group...")
    r = requests.delete(f"{BASE_URL}/api/certificate-groups/{group_id}", headers=headers)
    if r.status_code != 200:
        print(f"Error: Cleanup deletion failed: {r.text}")
        sys.exit(1)
    print("   Test group deleted cleanly.")
    print("=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_whitelist_selection_import()
