# NexDerm

NexDerm is a skin-condition screening app with:

- A `FastAPI` backend for auth, prediction, reports, and doctor review flows
- An `Expo` / React Native frontend
- PyTorch-based model artifacts stored in the backend repository

This repository is for development and coursework use. It is not a medical device and must not be treated as diagnostic software.

## Stack

- Backend: Python, FastAPI, SQLAlchemy, pytest
- Frontend: Expo, React Native, TypeScript, Jest
- External services used by the app: Supabase, PostgreSQL, AWS S3, Resend, Google Maps
- ML libraries: PyTorch, torchvision, scikit-learn

## Repository Layout

```text
NexDerm/
|-- backend/
|   |-- app/
|   |-- tests/
|   |-- requirements.txt
|   |-- requirements-test.txt
|   `-- pytest.ini
|-- frontend/
|   |-- src/
|   |-- __tests__/
|   `-- package.json
`-- README.md
```

## Prerequisites

Install these before working on the project:

- Python 3.11 or newer
- Node.js 18 or newer
- npm
- Git

Recommended development environment:

- Linux or macOS is recommended for the smoothest setup and tooling experience
- Windows works, but use PowerShell and a virtual environment

Recommended on Windows:

- Use the repo virtual environment at `.venv`, or create one with `python -m venv .venv`
- Use PowerShell

Recommended on Linux or macOS:

- Create and activate a virtual environment with `python3 -m venv .venv` and `source .venv/bin/activate`
- Use a standard shell such as `bash` or `zsh`

## Backend Setup

From the repo root:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
pip install -r backend\requirements-test.txt
```

Linux/macOS:

```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
pip install -r backend/requirements-test.txt
```

Create `backend/.env` with the variables the backend expects:

```env
DB_HOST=
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_PORT=

SUPABASE_URL=
SUPABASE_ANON_PUBLIC_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_SERVICE_ROLE_KEY=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET_NAME=

RESEND_API_KEY=
OPENROUTER_API_KEY=
OTP_HASH_SECRET=
MFA_JWT_SECRET=
SECRET_KEY=
API_V1_STR=/api/v1
```

Notes:

- `backend/app/core/config.py` loads `.env` from the backend directory.
- `SUPABASE_SERVICE_ROLE_KEY` is required by `backend/app/services/auth_service.py`.
- `OPENROUTER_API_KEY` and `RESEND_API_KEY` appear to be optional depending on which features you exercise.

## Run the Backend

Run the backend from inside `backend` so the app imports and `.env` file resolve correctly:

```powershell
.\.venv\Scripts\Activate.ps1
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Linux/macOS:

```bash
source .venv/bin/activate
cd backend
../.venv/bin/python -m uvicorn app.main:app --reload
```

Backend URLs:

- App root: `http://127.0.0.1:8000/`
- Swagger docs: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/api/v1/openapi.json`

## Frontend Setup

From the `frontend` directory:

```powershell
cd frontend
npm install
```

Linux/macOS:

```bash
cd frontend
npm install
```

Optional frontend env file:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
```

Current frontend configuration notes:

- `frontend/src/services/api.ts` currently hard-codes `API_URL` to a local LAN IP.
- If you run the backend on your own machine, update that value before testing the app.
- For Expo Go on a physical device, use your machine's local network IP.
- For web or emulator-only testing, `http://127.0.0.1:8000/api/v1` may be enough.

## Run the Frontend

From `frontend`:

```powershell
npm start
```

Linux/macOS:

```bash
npm start
```

Other available scripts:

```powershell
npm run android
npm run ios
npm run web
```

## Running Tests

### Backend unit tests with pytest

From the repo root:

```powershell
.\.venv\Scripts\Activate.ps1
pytest backend
```

Linux/macOS:

```bash
source .venv/bin/activate
pytest backend
```

Or from inside `backend`:

```powershell
cd backend
pytest
```

Linux/macOS:

```bash
cd backend
source ../.venv/bin/activate
pytest
```

Useful pytest commands:

```powershell
pytest backend -q
pytest backend\tests\test_model.py
pytest backend -m integration
pytest backend --cov=app --cov-report=term-missing
```

Linux/macOS:

```bash
pytest backend -q
pytest backend/tests/test_model.py
pytest backend -m integration
pytest backend --cov=app --cov-report=term-missing
```

Current pytest config in [`backend/pytest.ini`](backend/pytest.ini):

- Test path: `tests`
- File pattern: `test_*.py`
- Coverage target: `app`
- Coverage XML output: `backend/coverage.xml`
- Minimum coverage threshold: `10`

Important test behavior:

- `backend/tests/conftest.py` injects safe default env vars for tests.
- External services such as auth, S3, PDF generation, and model loading are stubbed for deterministic tests.
- That means most backend tests can run without live Supabase or AWS credentials.

### Frontend tests

From `frontend`:

```powershell
npm test
```

Linux/macOS:

```bash
npm test
```

This runs the Jest suite defined in [`frontend/package.json`](frontend/package.json).

Frontend test files currently include:

- `frontend/__tests__/App.test.tsx`
- `frontend/__tests__/api.test.ts`

## Installing Everything From Scratch

If you want a minimal first-time setup:

1. Clone the repo.
2. Create and activate the virtual environment.
3. Install backend dependencies.
4. Install frontend dependencies.
5. Create `backend/.env`.
6. Set the frontend API base URL in `frontend/src/services/api.ts`.
7. Start the backend with `uvicorn`.
8. Start the frontend with `npm start`.
9. Run backend tests with `pytest backend`.
10. Run frontend tests with `npm test`.

## Preferred Way to Run the App (Quick Testing)

The preferred way to test the application is to run the frontend using Expo:

1. Clone the repository and navigate to the frontend:
   git clone [<repo-url>](https://github.com/NexSpend/NexDerm)
   cd NexDerm/frontend

2. Install dependencies:
   npm install

3. Start the Expo development server:
   npm start

4. Download the Expo Go app on your mobile device.

5. Scan the QR code shown in the terminal to launch the app on your phone.

This is the fastest and most reliable way to run and test the application.

## Alternative Method (APK)

An alternative way to run the app is by using the provided APK:

- Install the APK on an Android device or run it using an Android emulator (e.g., Android Studio).
- Launch the app directly from the installed APK.

Note: While the APK version is functional, we are still working on improving compatibility across different devices. Some issues may occur depending on the device or environment.

## Common Commands

From the repo root:

```powershell
# activate venv
.\.venv\Scripts\Activate.ps1

# backend tests
pytest backend

# backend server
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload

# frontend install
cd frontend
npm install

# frontend dev server
npm start

# frontend tests
npm test
```

Linux/macOS:

```bash
# activate venv
source .venv/bin/activate

# backend tests
pytest backend

# backend server
cd backend
../.venv/bin/python -m uvicorn app.main:app --reload

# frontend install
cd frontend
npm install

# frontend dev server
npm start

# frontend tests
npm test
```

## Known Gaps

- The frontend currently hard-codes the backend API base URL in `frontend/src/services/api.ts`.
- The frontend Supabase client is configured with constants in `frontend/src/services/supabase.ts`, not environment variables.
- The backend depends on several third-party services, so a fully working local runtime needs valid credentials even though the pytest suite does not.

## Disclaimer

NexDerm is an educational project. It is not a substitute for professional medical advice, diagnosis, or treatment.
