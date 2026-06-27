import os
import requests

BASE_URL = os.getenv("BASE_URL", "http://localhost")

def test_user_management():
    print("=== STARTING USER MANAGEMENT INTEGRATION TEST ===")
    
    # 1. Login as Super Admin
    print("1. Logging in as Super Admin...")
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@example.com",
        "password": "admin123"
    })
    assert login_res.status_code == 200, f"Super admin login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("   Super Admin login successful. Token acquired.")
    
    # 2. List users
    print("2. Fetching current users...")
    users_res = requests.get(f"{BASE_URL}/api/users", headers=headers)
    assert users_res.status_code == 200
    users = users_res.json()
    emails = [u["email"] for u in users]
    assert "admin@example.com" in emails
    print(f"   Found {len(users)} users.")
    
    # Find admin_id for testing self-deletion block
    admin_id = next(u["id"] for u in users if u["email"] == "admin@example.com")
    
    # 3. Create dummy user
    print("3. Registering a dummy user...")
    reg_res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": "test-user-mgmt@example.com",
        "full_name": "Test User Management",
        "password": "password123",
        "role": "staff"
    })
    assert reg_res.status_code == 200, f"Register failed: {reg_res.text}"
    dummy_user = reg_res.json()
    dummy_id = dummy_user["id"]
    print(f"   Dummy user created with ID: {dummy_id}")
    
    # 4. Update dummy user
    print("4. Updating dummy user (name, role, status)...")
    update_res = requests.put(f"{BASE_URL}/api/users/{dummy_id}", headers=headers, json={
        "full_name": "Updated Name",
        "role": "verifier",
        "status": "suspended"
    })
    assert update_res.status_code == 200, f"Update failed: {update_res.text}"
    updated = update_res.json()
    assert updated["full_name"] == "Updated Name"
    assert updated["role"] == "verifier"
    assert updated["status"] == "suspended"
    print("   Dummy user updated successfully.")
    
    # 5. Try self-deletion (should fail with 400)
    print("5. Attempting self-deletion (should fail)...")
    self_del_res = requests.delete(f"{BASE_URL}/api/users/{admin_id}", headers=headers)
    assert self_del_res.status_code == 400
    print("   Self-deletion block verified.")
    
    # 6. Delete dummy user
    print("6. Deleting dummy user...")
    del_res = requests.delete(f"{BASE_URL}/api/users/{dummy_id}", headers=headers)
    assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
    print("   Dummy user deleted successfully.")
    
    # 7. List users to verify dummy user is gone
    print("7. Verifying dummy user is removed from users list...")
    users_res = requests.get(f"{BASE_URL}/api/users", headers=headers)
    users = users_res.json()
    emails = [u["email"] for u in users]
    assert "test-user-mgmt@example.com" not in emails
    print("   Verification successful.")
    
    print("=== ALL USER MANAGEMENT TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_user_management()
