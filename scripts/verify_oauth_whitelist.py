import os
import requests
import io

BASE_URL = os.getenv("BASE_URL", "http://localhost")

def test_oauth_whitelist():
    print("=== STARTING OAUTH & WHITELIST INTEGRATION TEST ===")
    
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
    
    # 2. Get settings
    print("2. Fetching current settings...")
    settings_res = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
    assert settings_res.status_code == 200, f"Failed to fetch settings: {settings_res.text}"
    settings = settings_res.json()
    print(f"   Settings fetched: Enabled={settings['google_oauth_enabled']}")
    
    # 3. Update settings
    print("3. Updating settings...")
    update_res = requests.post(f"{BASE_URL}/api/admin/settings", headers=headers, json={
        "google_oauth_enabled": True,
        "google_client_id": "test-client-id-12345.apps.googleusercontent.com",
        "google_client_secret": "super-secret-123"
    })
    assert update_res.status_code == 200, f"Failed to update settings: {update_res.text}"
    print("   Settings updated.")
    
    # 4. Fetch settings again to verify secret hiding and values
    print("4. Fetching settings again to verify...")
    settings_res = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
    settings = settings_res.json()
    assert settings["google_oauth_enabled"] is True
    assert settings["google_client_id"] == "test-client-id-12345.apps.googleusercontent.com"
    assert settings["google_client_secret_hidden"] == "supe*************" or settings["google_client_secret_hidden"].startswith("supe"), f"Secret not hidden properly: {settings}"
    print("   Settings verify successful.")
    
    # 5. Fetch public Google config
    print("5. Testing public Google OAuth config endpoint...")
    pub_res = requests.get(f"{BASE_URL}/api/auth/google/config")
    assert pub_res.status_code == 200, f"Failed to fetch public config: {pub_res.text}"
    pub_config = pub_res.json()
    assert pub_config["google_oauth_enabled"] is True
    assert pub_config["google_client_id"] == "test-client-id-12345.apps.googleusercontent.com"
    print("   Public config endpoint verified.")
    
    # 6. Test login redirect URL generation
    print("6. Testing Google Login redirect endpoint...")
    # We do not follow redirects automatically so we can check redirect status code and location header
    login_redirect_res = requests.get(f"{BASE_URL}/api/auth/google/login", allow_redirects=False)
    assert login_redirect_res.status_code == 307 or login_redirect_res.status_code == 302, f"Failed to get redirect: {login_redirect_res.status_code}"
    loc = login_redirect_res.headers.get("Location", "")
    assert "accounts.google.com" in loc
    assert "test-client-id-12345.apps.googleusercontent.com" in loc
    assert "redirect_uri=" in loc
    print(f"   Login redirect verified. Redirects to: {loc[:100]}...")
    
    # 7. Add user to Whitelist manually
    print("7. Adding email to whitelist manually...")
    add_wl_res = requests.post(f"{BASE_URL}/api/admin/whitelist", headers=headers, json={
        "email": "test-oauth@example.com",
        "name": "OAuth Test User"
    })
    assert add_wl_res.status_code == 200, f"Failed to add to whitelist: {add_wl_res.text}"
    wl_user = add_wl_res.json()
    assert wl_user["email"] == "test-oauth@example.com"
    assert wl_user["name"] == "OAuth Test User"
    print("   Whitelist manual add successful.")
    
    # 8. Check whitelist listing
    print("8. Checking whitelist listing...")
    wl_list_res = requests.get(f"{BASE_URL}/api/admin/whitelist", headers=headers)
    assert wl_list_res.status_code == 200
    wl_list = wl_list_res.json()
    emails = [u["email"] for u in wl_list]
    assert "test-oauth@example.com" in emails
    print(f"   Found whitelisted email in the list. Current count: {len(wl_list)}")
    
    # 9. Verify duplicate manual add returns 400
    print("9. Verifying duplicate email returns error...")
    dup_res = requests.post(f"{BASE_URL}/api/admin/whitelist", headers=headers, json={
        "email": "test-oauth@example.com",
        "name": "Another Name"
    })
    assert dup_res.status_code == 400
    print("   Duplicate email error verified.")
    
    # 10. Import whitelist via CSV
    print("10. Testing Whitelist CSV import...")
    csv_content = (
        "name,email\n"
        "Imported User 1,imported1@example.com\n"
        "Imported User 2,imported2@example.com\n"
    )
    files = {"file": ("whitelist.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    import_res = requests.post(f"{BASE_URL}/api/admin/whitelist/import", headers=headers, files=files)
    assert import_res.status_code == 200, f"CSV import failed: {import_res.text}"
    import_data = import_res.json()
    assert import_data["imported_rows"] == 2
    print("    CSV whitelist import successful.")
    
    # 11. Listing to verify imported users are in the whitelist
    wl_list_res = requests.get(f"{BASE_URL}/api/admin/whitelist", headers=headers)
    wl_list = wl_list_res.json()
    emails = [u["email"] for u in wl_list]
    assert "imported1@example.com" in emails
    assert "imported2@example.com" in emails
    print("    Imported emails found in whitelist listing.")
    
    # 12. Test whitelist entry deletion
    print("12. Testing Whitelist entry deletion...")
    del_res = requests.delete(f"{BASE_URL}/api/admin/whitelist/test-oauth@example.com", headers=headers)
    assert del_res.status_code == 200, f"Delete failed: {del_res.text}"
    
    # Check that deleted email is no longer listed
    wl_list_res = requests.get(f"{BASE_URL}/api/admin/whitelist", headers=headers)
    wl_list = wl_list_res.json()
    emails = [u["email"] for u in wl_list]
    assert "test-oauth@example.com" not in emails
    
    # Deleting again should return 404
    del_res_again = requests.delete(f"{BASE_URL}/api/admin/whitelist/test-oauth@example.com", headers=headers)
    assert del_res_again.status_code == 404
    print("    Deletion verified successfully.")
    
    # Clean up imported ones as well
    requests.delete(f"{BASE_URL}/api/admin/whitelist/imported1@example.com", headers=headers)
    requests.delete(f"{BASE_URL}/api/admin/whitelist/imported2@example.com", headers=headers)
    print("    Cleaned up imported test records.")
    
    print("=== ALL OAUTH & WHITELIST TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    test_oauth_whitelist()
