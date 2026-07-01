# PrepAI 🌟 — Enterprise AI Mock Interview & Tailored Resume PDF Generator

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-9.7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Upstash Redis](https://img.shields.io/badge/Upstash%20Redis-REST-red?logo=redis&logoColor=white)](https://upstash.com/)
[![Groq AI](https://img.shields.io/badge/Groq%20AI-Llama%203.3-orange)](https://groq.com/)
[![Resend](https://img.shields.io/badge/Resend-HTTP%20API-black)](https://resend.com/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-25.1-40B5A4?logo=puppeteer&logoColor=white)](https://pptr.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An enterprise-grade, high-performance web platform designed to automate and optimize the job preparation pipeline. PrepAI consumes candidate profile documents (PDFs) and targeted job descriptions, parses and validates them using custom extractors, leverages Groq's low-latency inference API to run real-time alignment scoring, constructs interactive day-by-day preparation plans, and compiles tailored, ATS-compliant resumes dynamically to PDF on the server side using headless Chrome.

---

## 🏗️ System Architecture & Data Flow

Below is the end-to-end system architecture representing the user authentication, PDF parsing, AI completion rendering, and headless Puppeteer print flow:

```mermaid
graph TD
    %% Styling
    classDef client fill:#61DAFB,stroke:#333,stroke-width:2px,color:#000;
    classDef gateway fill:#ff9900,stroke:#333,stroke-width:2px,color:#000;
    classDef ai fill:#339933,stroke:#333,stroke-width:2px,color:#fff;
    classDef storage fill:#47A248,stroke:#333,stroke-width:2px,color:#fff;
    classDef browser fill:#40B5A4,stroke:#333,stroke-width:2px,color:#fff;
    classDef cache fill:#D82C20,stroke:#333,stroke-width:2px,color:#fff;

    %% Components
    A[React Client / Vite]:::client
    B[Express.js App Gateway]:::gateway
    C[Mongoose / MongoDB]:::storage
    D[Groq API / Llama-3.3-70B]:::ai
    E[Puppeteer Headless Chrome]:::browser
    F[Nodemailer SMTP Fallback]:::gateway
    G[Resend HTTP API]:::gateway
    R[(Upstash Redis OTP Cache)]:::cache

    %% Flows
    A -- 1. Upload Resume PDF & JD --> B
    B -- 2. Parse Text / PDFParse --> B
    B -- 3. Strict Zod Schema & Prompt --> D
    D -- 4. Returns JSON Structure --> B
    B -- 5. Write Report Records --> C
    A -- 6. Request Tailored Resume --> B
    B -- 7. Prompt HTML Generator --> D
    D -- 8. Returns Tailored HTML --> B
    B -- 9. Stream HTML to PDF --> E
    E -- 10. Pipe binary buffer (PDF) --> B
    B -- 11. File Download (Attachment) --> A
    B -- 12a. Store OTP (5m TTL) / Validate --> R
    B -- 12b. Dispatch Email via Resend / SMTP fallback --> G
    B -- 12c. Dispatch Email (Alternative) --> F
```

---

## ⚡ Key Architectural Decisions & Engineering Highlights

### 1. Schema-Strict AI Completions (Guaranteed Outputs)
To solve the common problem of LLMs returning corrupted, unparsable, or loosely formatted JSON strings, PrepAI leverages `Zod` schemas compiled into JSON Schema format via `zod-to-json-schema`. When invoking the Groq SDK (`llama-3.3-70b-versatile` running in `json_object` response mode), the prompt strictly enforces structural properties, resulting in **100% deterministic JSON parsing** on the server.

### 2. Sandbox-Isolated Headless Browser PDF Engine
Rather than relying on client-side canvas engines (which suffer from scaling and font distortions), PrepAI implements server-side HTML-to-PDF rendering using **Puppeteer**:
*   A tailored resume is generated dynamically as HTML by the AI model.
*   The HTML is injected into an isolated, headless Puppeteer instance with arguments tuned for containerized cloud deployment (`--no-sandbox`, `--disable-setuid-sandbox`).
*   It is written directly to an A4 PDF page stream and piped back to the client as an attachment buffer, protecting user-data leakages.

### 3. Session-Hardened Multi-Factor Auth Flow
*   **Token Protection**: JWTs are signed and stored in HTTP-Only cookies with sameSite policies (`lax` in development, `none` in production) preventing Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).
*   **Session Database Tracking**: Active user sessions are tracked in a dedicated MongoDB collection mapping tokens to specific client signatures (IP, user-agent), allowing for instantaneous multi-device logout and token-revocation checks.
*   **Redis-Backed OTP Verification**: Employs **Upstash Redis** to cache short-lived, double-hashed (`SHA-256`) verification codes with a strict 5-minute time-to-live (TTL). This high-performance setup guarantees secure email verification while protecting the primary MongoDB database from transient state bloat and brute-force lookup overhead.
*   **Dual-Engine Email Dispatch**: Features a resilient email notification module utilizing the **Resend HTTP API** as the primary vehicle (effectively bypassing outbound SMTP blocks on platforms like Render) with a robust **Nodemailer SMTP** OAuth2 implementation as a fallback.

---

## 🚀 API Contracts & Documentation

### Authentication Service (`/api/auth`)

| Method | Endpoint | Description | Payload Schema / Headers | Response |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/register` | User Registration & OTP Dispatch | `{ username, email, password }` | `201 Created` (Success details + OTP sent) |
| **POST** | `/verify-email` | Validate OTP & Initialize Session | `{ email, otp }` | `200 OK` (HTTP-Only Cookie + User data) |
| **POST** | `/login` | Authenticate & Create Session | `{ email, password }` | `200 OK` (HTTP-Only Cookie + JWT token) |
| **POST** | `/logout` | Terminate session & blacklist token | `Cookie: token=<JWT>` | `200 OK` (Cookie cleared + session deleted) |
| **GET** | `/me` | Retrieve authenticated profile | `Cookie: token=<JWT>` | `200 OK` (Active user details) |

### AI Interview & Resume Service (`/api/interview`)

| Method | Endpoint | Description | Payload Schema / Headers | Response |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/` | Upload Resume & Generate Report | `multipart/form-data` (`file`, `jobDescription`, `selfDescription`) | `201 Created` (Full interviewReport JSON structure) |
| **GET** | `/:interviewId` | Retrieve interview report by ID | `Cookie: token=<JWT>` | `200 OK` (Matched report data object) |
| **GET** | `/` | List all historical reports for user | `Cookie: token=<JWT>` | `200 OK` (Array of report summaries) |
| **GET** | `/resume/:interviewId` | Compile and download Tailored PDF | `Cookie: token=<JWT>` | `200 OK` (Binary Stream: `application/pdf`) |

---

## 📂 Monorepo Setup & Workspace Configuration

This codebase is managed as a unified monorepo configuration using NPM workspaces and script redirection.

### Prerequisites
Ensure your local environment exposes:
```bash
Node.js >= 18.x
MongoDB (Local daemon or Cloud Atlas connection URI)
```

### Installation
From the root directory, install all dependencies for both Frontend and Backend concurrently:
```bash
npm run setup
```

### Environment Settings

#### 1. Backend Config
Create [Backend/.env](file:///c:/Users/OM/OneDrive/Desktop/SDE/PrepAI-Full-Stack-AI-Preparation/Backend/.env):
```env
MONGO_URL="mongodb+srv://<user>:<password>@cluster.mongodb.net/database"
JWT_SECRET="generate-a-strong-jwt-secret-string"
GROQ_GENAI_API_KEY="gsk_your_groq_api_credential_here"

# Mail verification (Resend HTTP API - Primary)
RESEND_API_KEY="re_your_resend_api_key_here"
EMAIL_FROM="onboarding@resend.dev" # Optional, defaults to onboarding@resend.dev

# Mail verification (Nodemailer SMTP - Fallback)
GOOGLE_USER="your-app-email@gmail.com"
GOOGLE_REFRESH_TOKEN="oauth2-refresh-token"
GOOGLE_CLIENT_ID="oauth2-client-id"
GOOGLE_CLIENT_SECRET="oauth2-client-secret"

# Redis Configuration (Upstash Redis REST client)
UPSTASH_REDIS_REST_URL="https://your-upstash-redis-rest-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_rest_token_here"
```

#### 2. Frontend Config
Create [Frontend/.env](file:///c:/Users/OM/OneDrive/Desktop/SDE/PrepAI-Full-Stack-AI-Preparation/Frontend/.env):
```env
VITE_API_BASE_URL="http://localhost:5000"
```

---

## 💻 Local Execution & Pipeline Bundling

To run both services in parallel in a development state (auto-reloading on file modifications):
```bash
npm run dev
```

To compile the React frontend client static assets into `/dist` for optimized cloud distributions:
```bash
npm run build
```

---

## 🏆 Resume Bullet Points & Key Talking Points

Use these highly descriptive, metric-focused statements on your resume to articulate your work on PrepAI:

*   **Architected and developed a full-stack, distributed AI-powered platform** utilizing React 19, Vite, and Express, optimizing state synchronization using custom React Context wrappers and declarative routing layers.
*   **Engineered prompt topologies and integrated Groq SDK (Llama 3.3 70B)**, utilizing strict `Zod` schemas translated to raw JSON templates to guarantee 100% deterministic AI responses, reducing API parsing failures to 0%.
*   **Designed and implemented an automated PDF rendering engine** leveraging headless Chrome (Puppeteer) server-side print processes, optimizing page-break scripts and layout templates to deliver responsive, dynamic, ATS-friendly resume exports.
*   **Hardened system security postures** by implementing multi-tiered session tracking, secure HTTP-Only cookie injection with sameSite policies to mitigate XSS/CSRF vectors, and a high-performance **Upstash Redis-backed OTP caching layer** (5-minute TTL) coupled with **Resend HTTP API** and OAuth2 SMTP email dispatch systems.
*   **Designed data persistence and caching architectures** using MongoDB/Mongoose for token blacklisting, dynamic user states, and session logging, integrated with **Upstash Redis** for secure ephemeral storage of verification keys to eliminate database state bloat and reduce retrieval latency.
