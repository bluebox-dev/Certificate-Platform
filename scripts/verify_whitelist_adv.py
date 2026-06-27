import os
import requests

BASE_URL = os.getenv("BASE_URL", "http://localhost")

def test_whitelist_adv():
    print("=== STARTING ADVANCED WHITELIST INTEGRATION TEST ===")
    
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
    
    # 2. Add manual entries
    print("2. Adding manual entry for editing test...")
    add_wl_res = requests.post(f"{BASE_URL}/api/admin/whitelist", headers=headers, json={
        "email": "test-edit@example.com",
        "name": "Original Name"
    })
    assert add_wl_res.status_code == 200, f"Failed to add to whitelist: {add_wl_res.text}"
    user1 = add_wl_res.json()
    user1_id = user1["id"]
    print(f"   Manual entry added. ID: {user1_id}")

    # Add second entry to test conflicts
    print("3. Adding second manual entry to test conflicts...")
    add_wl_res2 = requests.post(f"{BASE_URL}/api/admin/whitelist", headers=headers, json={
        "email": "test-conflict@example.com",
        "name": "Conflict Name"
    })
    assert add_wl_res2.status_code == 200, f"Failed to add to whitelist: {add_wl_res2.text}"
    user2 = add_wl_res2.json()
    user2_id = user2["id"]
    print(f"   Second entry added. ID: {user2_id}")
    
    # 4. Edit user1
    print("4. Editing first entry (name and email)...")
    edit_res = requests.put(f"{BASE_URL}/api/admin/whitelist/{user1_id}", headers=headers, json={
        "email": "test-edit-updated@example.com",
        "name": "Updated Name"
    })
    assert edit_res.status_code == 200, f"Failed to update whitelist user: {edit_res.text}"
    updated_user = edit_res.json()
    assert updated_user["email"] == "test-edit-updated@example.com"
    assert updated_user["name"] == "Updated Name"
    print("   Update successful.")
    
    # 5. Verify email conflict
    print("5. Verifying duplicate email check on edit...")
    edit_res_conflict = requests.put(f"{BASE_URL}/api/admin/whitelist/{user1_id}", headers=headers, json={
        "email": "test-conflict@example.com",
        "name": "Should Fail"
    })
    assert edit_res_conflict.status_code == 400, "Conflict check failed, duplicate email allowed!"
    print("   Conflict check passed. Duplicate email rejected.")
    
    # 6. Bulk delete
    print("6. Testing bulk delete on both test entries...")
    bulk_del_res = requests.post(f"{BASE_URL}/api/admin/whitelist/bulk-delete", headers=headers, json={
        "ids": [user1_id, user2_id]
    })
    assert bulk_del_res.status_code == 200, f"Bulk delete failed: {bulk_del_res.text}"
    print(f"   Bulk delete response: {bulk_del_res.json()['message']}")
    
    # 7. Listing to verify deletion
    print("7. Verifying entries are no longer present in whitelist...")
    wl_list_res = requests.get(f"{BASE_URL}/api/admin/whitelist", headers=headers)
    wl_list = wl_list_res.json()
    ids = [u["id"] for u in wl_list]
    assert user1_id not in ids, "User 1 still present after bulk delete!"
    assert user2_id not in ids, "User 2 still present after bulk delete!"
    print("   Verification successful. Both entries removed.")
    
    print("=== ALL ADVANCED WHITELIST TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_whitelist_adv()
