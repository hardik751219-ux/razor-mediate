# RazorMediate — AI Revenue Recovery & Dispute Mediation

> **Razorpay AI Hackathon · Track 03 — Revenue Recovery**

RazorMediate is an intelligent dispute mediation platform that recovers failed and disputed payments through real-time conversational AI. It diagnoses payment failures, negotiates settlements, and structures repayment plans — all within Razorpay's compliance framework.

---

## ✨ What It Does

| Capability | Description |
|---|---|
| **Live Root-Cause Analysis** | Automatically diagnoses payment failures using transaction telemetry + customer dialogue (gateway timeouts, liquidity issues, disputes, compliance blocks) |
| **AI-Powered Chat Mediation** | WhatsApp & Voice channel simulation — the agent negotiates with customers in real-time |
| **Smart Settlement Engine** | Calculates restructured payments with discounts, installment splits, and promise-to-pay (PTP) tracking |
| **Policy Guardrails** | Configurable caps on discounts (%), flat amounts (₹), installments, grace periods — enforced server-side |
| **TRAI & RBI Compliance** | Enforces contact-hour windows (9 AM – 8 PM IST), distress detection, and contact velocity limits |
| **100-Batch Benchmark** | Simulates 100 transactions to prove recovery rates at scale |
| **Audit Ledger** | Full SHA-256 integrity-checked audit trail for every mediation action |

---

## 🎯 4 Demo Scenarios

1. **Bank Gateway Timeout** — Payment fails due to 504 from bank. RazorMediate detects `GATEWAY_TIMEOUT`, auto-applies ₹500 convenience waiver, schedules retry.
2. **Liquidity Crunch (Installments)** — Customer can't pay ₹48,000 at once. Agent splits into 3 tranches with 25% upfront, generates Razorpay Payment Links per tranche.
3. **B2B Invoice Dispute** — ₹65,000 invoice disputed for damaged goods. Agent applies 5% discount (₹3,250), settles at ₹61,750 with Payment Link.
4. **Compliance Auto-Stop** — Customer says "I can't handle this" → distress detected → mediation halts, escalates to human agent.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│         React + Tailwind UI         │
│  (Live Mediation Desk / Benchmark)  │
└──────────────┬──────────────────────┘
               │ REST API
┌──────────────▼──────────────────────┐
│         FastAPI Backend             │
│  ┌───────────┐  ┌────────────────┐  │
│  │ RCA Agent │  │ Mediation Agent│  │
│  └───────────┘  └────────────────┘  │
│  ┌───────────┐  ┌────────────────┐  │
│  │ Policy    │  │ Compliance     │  │
│  │ Engine    │  │ Engine         │  │
│  └───────────┘  └────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ Audit Ledger (SHA-256 chain) │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons |
| Backend | Python 3.12, FastAPI, Pydantic v2, Uvicorn |
| Razorpay | Payment Links API, Razorpay Python SDK |
| Testing | Pytest, pytest-asyncio |

---

## 🚀 Quick Start

- **Python 3.10+** → [Download Python](https://www.python.org/downloads/) (check "Add to PATH" during install)
- **Node.js 18+** → [Download Node.js](https://nodejs.org/) (LTS recommended)

> [!TIP]
> To verify you have both installed, open a terminal and run:
> ```bash
> python --version   # Should show 3.10+
> node --version     # Should show 18+
> ```

### Step 1 — Clone the Repo

```bash
git clone https://github.com/YOUR_USERNAME/razor-mediate.git
cd razor-mediate
```

### Step 2 — Start the Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

✅ Backend runs at → **http://localhost:8000**

> Keep this terminal open. Open a **new terminal** for the frontend.

### Step 3 — Start the Frontend

```bash
cd frontend
npm install
npm run build
npx vite preview --port 3000
```

✅ Frontend runs at → **http://localhost:3000**

### Step 4 — Open the App

Open **http://localhost:3000** in your browser. That's it!

### Run Tests (Optional)

```bash
cd backend
python -m pytest tests/ -v
```

---

## 📁 Project Structure

```
razor-mediate/
├── backend/
│   ├── main.py                  # FastAPI app — /api/chat, /api/triage, /api/config, /api/simulate
│   ├── requirements.txt
│   ├── core/
│   │   ├── models.py            # Pydantic models — PolicyConfig, TransactionRecord, RCADiagnosis
│   │   ├── rca_agent.py         # Root-Cause Analysis — 2-pass (telemetry + conversation)
│   │   ├── mediation_agent.py   # Chat mediation — settlement negotiation logic
│   │   ├── policy_engine.py     # Discount/installment caps enforcement
│   │   ├── compliance_engine.py # TRAI hours, distress detection, contact velocity
│   │   └── audit_ledger.py      # SHA-256 tamper-proof audit chain
│   └── tests/
│       └── test_core.py         # 5 unit tests covering RCA, policy, compliance, audit, batch
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── App.tsx              # Main app shell — tab routing, policy state
│       ├── api.ts               # API client — chat, triage, config, simulate
│       └── components/
│           ├── Header.tsx
│           ├── MetricCards.tsx
│           ├── LiveMediationStudio.tsx   # Core mediation UI — RCA, chat, settlement
│           ├── PolicyConfigModal.tsx     # Policy guardrails editor
│           ├── BatchSimulator.tsx        # 100-txn benchmark runner
│           └── AuditLedger.tsx           # Audit log viewer
└── .gitignore
```

---

## 🔑 Key API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/chat` | Send customer message → get agent response + settlement plan + RCA |
| `POST` | `/api/triage` | Diagnose a transaction before chat (telemetry-only RCA) |
| `GET/POST` | `/api/config` | Read/update policy configuration |
| `POST` | `/api/simulate` | Run 100-batch benchmark simulation |
| `GET` | `/api/audit-logs` | Retrieve audit ledger entries |
| `GET` | `/health` | Health check |

---

## 📐 Policy Defaults

| Parameter | Default | Description |
|---|---|---|
| Max Discount % | 7.5% | Maximum percentage discount on invoice |
| Max Discount Flat | ₹5,000 | Maximum absolute discount amount |
| Max Installments | 3 | Maximum payment splits allowed |
| Min Upfront % | 25% | Minimum first-tranche percentage |
| Max Grace Days | 14 | PTP grace period |
| TRAI Hours | 9 AM – 8 PM IST | Contact window enforcement |
| Contact Velocity | 3 / 7 days | Max outreach attempts per week |

---

## 👤 Team

**Hardik** — Full-stack development, AI agent architecture, UI/UX design

---

## Media link
https://drive.google.com/file/d/1OB6NbHrWv8HBVEtMiomcUplOoomkgfzH/view?usp=sharing
