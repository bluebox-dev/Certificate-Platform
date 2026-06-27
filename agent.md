# AI Agent Developer Guide - E-Certificate Platform

Welcome! This guide is written to help you (the next AI agent) quickly understand the architecture, environment variables, responsive web design principles, testing workflow, and deployment procedures for the E-Certificate Platform.

---

## 1. Project Overview & Architecture

The E-Certificate Platform is a containerized multi-service web application designed to issue, manage, and verify digital A4 certificates (landscape) using unique cryptographic hashes and QR codes.

### Directory Structure
```
Certificate-Platform/
├── apps/
│   ├── api/                 # FastAPI Backend REST API
│   │   ├── main.py          # Application entrypoint, db, and routes
│   │   ├── models.py        # SQLAlchemy schema definitions (PostgreSQL)
│   │   └── schemas.py       # Pydantic validation schemas
│   └── web/                 # Vite + React Frontend Client
│       ├── src/
│       │   ├── App.jsx      # Main frontend router, views, and modals
│       │   ├── index.css    # Responsive styles and theme system
│       │   └── assets/      # Bundled branding assets (e.g. logo.png)
│       └── public/          # Static assets (favicons, logo.png)
├── nginx/
│   └── default.conf         # Production Nginx reverse proxy routes
├── workers/
│   └── pdf-worker/          # Playwright PDF generator worker
│       ├── worker.py        # Listens to Redis Queue and prints PDFs
│       └── package.json     # Node PDF worker dependencies (Playwright)
├── scripts/                 # System verification & admin CLI scripts
│   ├── verify_flow.py       # E2E integration test suite
│   ├── backup.sh            # Database & storage backup script
│   └── inspect_and_clean_users.py  # User account management utility
├── docker-compose.yml       # Production/Staging multi-container compose configuration
├── .env.example             # Clean template configuration values
└── .env.production          # Reference environment variables for production
```

---

## 2. Infrastructure Services

The application consists of 6 microservices orchestrated via `docker-compose.yml`:
1. **`postgres`**: Relational database storing credentials, templates, student batches, and certificate verification metadata.
2. **`redis`**: Key-value store and message broker managing asynchronous PDF printing jobs.
3. **`minio`**: Object storage hosting final rendered certificate PDF files.
4. **`api`**: FastAPI Python backend compiling routes for authentication, verification, and template rendering.
5. **`pdf-worker`**: Playwright headless Chromium agent listening to Redis queues and capturing A4 print templates into PDFs.
6. **`web`**: Nginx web server hosting static React client assets and proxying requests to backends under `/api` and storage under `/certificates`.

---

## 3. Environment Variables & Configurations

All services are parameterized in `docker-compose.yml` to load configuration settings from a local `.env` file:
* **`DOMAIN`**: Hostname of the website (e.g., `rai.kmitl.ac.th` in production). Used to calculate absolute verification QR code URLs.
* **`EXTERNAL_STORAGE_ENDPOINT`**: Publicly accessible base URL for certificate PDFs. (e.g. `https://rai.kmitl.ac.th/certificates` or `https://rai.kmitl.ac.th/certificate/certificates`).
* **`SECRET_KEY`**: JWT validation token secret.

---

## 4. Key UI/UX and Responsive Design Patterns

### 1. Stacking Context & Modals (React Portals)
* **Bug Alert**: Do not render global fixed overlays (like the certificate preview modal) nested deep in component trees where parent containers have CSS transitions, animations (e.g., `.animate-in`), or transforms. This forces a local stacking context and puts the overlay *behind* the sticky `.navbar` (which has `z-index: 1000`).
* **Fix**: Use `createPortal` from `react-dom` to render overlays directly under `document.body`:
  ```jsx
  {selectedCertForView && createPortal(
    <div className="cert-modal-backdrop">...</div>,
    document.body
  )}
  ```

### 2. A4 Landscape Certificate Previews on Mobile
* Certificate HTML print templates are designed for fixed-width landscape printing (e.g., `800px` wide).
* **Responsive Solution**: Set the iframe preview wrapper (`.cert-modal-preview-card`) to a fixed size of `800px x 565px` (A4 landscape ratio) and configure the modal body to scroll (`overflow: auto`). This allows mobile users to naturally swipe left/right to scroll the certificate without layout distortion or squishing.

### 3. Grid Layout Media Selectors
* Inline grid style properties in React render as kebab-case (`grid-template-columns`) in the DOM. Target elements using attribute selectors like `div[style*="grid-template-columns"]` rather than `gridTemplateColumns`.

---

## 5. Deployment & Hot Syncing (Remote Server: 10.100.16.104)

The remote server maps public HTTP routes to subpath `/certificate/` using an external reverse proxy (OpenResty) routing traffic to local port `80`.

### Deploying Updates to Production:
1. **Sync Files**: Sync updated source files to the remote workspace:
   ```bash
   scp apps/web/src/App.jsx apps/web/src/index.css ubuntu@10.100.16.104:/home/ubuntu/e-certificate-platform/apps/web/src/
   ```
2. **Rebuild Container**: Recompile and hot-reload the web service:
   ```bash
   ssh ubuntu@10.100.16.104 "cd e-certificate-platform && docker compose build web && docker compose up -d web"
   ```

---

## 6. Testing & Integrity Audits

Always run the integration suite to verify database seed, JWT generation, MinIO uploads, PDF compilation (via worker), and QR token verifications:
```bash
# Verify remote production route
BASE_URL="https://rai.kmitl.ac.th/certificate" python3 scripts/verify_flow.py

# Verify local container
BASE_URL="http://localhost:3000" python3 scripts/verify_flow.py
```
Ensure `=== ALL TESTS PASSED SUCCESSFULLY! ===` is printed before concluding any task.
