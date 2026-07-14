# FinOS Technical Architecture & Feature Report

This report provides a detailed breakdown of the technical components, ingestion pipelines, tax calculation logic, roadmap simulation architecture, and future development scope of the FinOS platform.

---

## 1. Document Ingestion & OCR Pipeline

The document intake system converts unstructured user uploads (paystubs, salary sheets, or offer letters) into structured financial profiles.

```
Incoming Document (PDF/Image) 
       │
       ├──► MIME-Type Router (/api/upload)
       │         │
       │         ├──► PDF (pdf-parse / pdfjs-dist) ➔ Raw Unstructured Text
       │         └──► Image (tesseract.js WASM)   ➔ Raw Unstructured Text
       │
       └──► Schema-Structured LLM Extraction (Gemini-2.5-Flash / fallbacks)
                 │
                 └──► JSON Schema Validator (validator.js) ➔ Structured User Profile
```

### Text Extraction Methods
Depending on the file format, the system routes the file to the appropriate parser:
- **PDF Extraction (`pdf-parse`):** Reads the PDF content directly from the file buffer. It iterates through the pages using the `pdfjs-dist` core parser, extracts clean text fragments with `.getText()`, strips redundant whitespace, and outputs the raw text. It assumes a static confidence rating of `0.98` since programmatic text extraction is highly reliable.
- **Image Extraction (`tesseract.js`):** Processes image formats (PNG, JPG) using a WebAssembly-compiled OCR engine. The engine performs:
  - **Binarization:** Converts color/grayscale pixels to high-contrast black-and-white to isolate text boundaries.
  - **Deskewing:** Programs rotation corrections for tilted page captures.
  - **Layout Analysis:** Detects boundaries for paragraphs, text lines, and columns.
  - **Character Recognition:** Maps character patterns to letters and outputs an average confidence score (normalized to a `0.0–1.0` scale).

### Structured LLM Extraction
Once raw text is obtained, it is sent to the LLM (default: `gemini-2.5-flash` via the OpenRouter client proxy) with a system prompt and a strict JSON schema configuration (`responseSchema` & `responseMimeType: 'application/json'`). 
- **Deterministic parameters:** The API call is configured with a `temperature` of `0` to enforce strict parameter mapping without creative hallucination.
- **Nullability Guardrails:** Schema fields are marked `nullable: true` so the LLM outputs `null` for missing parameters instead of fabricating data.
- **Auto-Correction & Validator:** The output JSON object is fed into `validator.js`. It validates key boundaries (e.g., verifying that the salary is within a realistic range of $10,000 to $1,000,000, and checking for location and pay frequency). Mismatches prompt user-verification steps.

---

## 2. Tax & Deductions Simulation Engine

To find the user's real disposable monthly income, the paycheck interpreter calculates taxes using either programmatically coded rules or grounded AI models.

```
Financial Profile (Salary, Location, Currency)
       │
       ├──► Country == "US" or "CA"?
       │         │
       │         ├──► Yes ➔ Deterministic Rule Engine (taxEngine.js)
       │         └──► No  ➔ Grounded AI Tax Engine (OpenRouter)
       │
       └──► Unified Tax Breakdown JSON ➔ Dynamic Explanation Card
```

### Deterministic Tax Engine (`taxEngine.js`)
For countries with structured, publicly available tax brackets, calculations are handled locally by programmatic code to guarantee mathematical accuracy:
- **United States Tax Rules:**
  - **FICA:** Social Security is calculated at a flat `6.2%` (up to the statutory earnings cap) and Medicare at `1.45%` (with an additional `0.9%` surtax on wages exceeding $200,000).
  - **Federal Income Tax:** Applies the standard deduction ($14,600) and calculates progressive brackets by looping through marginal rate brackets:
    - 10% (up to $11,600)
    - 12% (up to $47,150)
    - 22% (up to $100,525)
    - 24% (up to $191,950)
    - 32% (up to $243,725)
    - 35% (up to $609,350)
    - 37% (above $609,350)
  - **State Income Tax:** Applies California progressive tax brackets (starting with a standard deduction of $5,363). For other US states, a flat `4%` state tax rate estimate is applied.
- **Canada Tax Rules:**
  - **Canada Pension Plan (CPP):** Applies a `5.95%` employee contribution rate on earnings between a basic exemption of $3,500 and a maximum pensionable earnings limit ($68,500), capping contributions at $3,867.50.
  - **Employment Insurance (EI):** Applies an employee premium rate of `1.66%` on earnings up to $63,200, capping contributions at $1,049.12.
  - **Federal & Provincial Taxes:** Applies progressive bracket math mapped to Canadian brackets.

### Grounded AI Tax Engine (Fallback)
For locations outside the US and Canada, the engine routes requests to the LLM. It uses a heavily grounded prompt specifying country-specific tax rules to construct a matching, structured `deductions` JSON payload.

### Explanation Engine
Once a unified tax breakdown JSON is created, the data is passed to `explanationEngine.js`. It generates clean, plain-language answers to questions like *"What is stateTax and why am I paying it?"*, avoiding jargon to teach young earners where their money is going.

---

## 3. Goal Discovery & Waterfall Roadmap

The system maps the user's goals into a game-like, sequential milestone roadmap.

### Goal Clarification
If the user inputs a vague goal (e.g., *"I want to buy a car"*), the discovery engine identifies missing parameters (target amount, timeline, specific details) and enters a clarification loop. Penny prompts the user with direct questions to resolve the ambiguity before proceeding.

### Feasibility & Stress Index
The engine evaluates current financial health—aggregating savings list structures (Regular, HYSA, Investments), outstanding debt balances (prioritizing high-interest liabilities first), and monthly living expenses. It calculates the required monthly savings:

$$\text{Monthly Savings Required} = \frac{\text{Target Goal Cost}}{\text{Timeline Years} \times 12}$$

It then maps the required savings against the user's net take-home pay to assign a **Stress Index**:
- **Low Stress (Feasibility: High):** Savings are $\le 20\%$ of net take-home pay.
- **Medium Stress (Feasibility: Medium):** Savings are between $20\%$ and $40\%$.
- **High Stress (Feasibility: Low):** Savings are between $40\%$ and $60\%$.
- **Impossible:** Savings exceed $60\%$ of net pay, or exceed total monthly cash-flow surplus.

If the stress index is high or impossible, the system automatically builds an **Alternative Plan** by either extending the timeline or recommending budget cuts.

### Sequential Levels & Isolated Chatbots
The final roadmap is split into structured levels representing progression:
- **Level 1: Starter Emergency Shield:** Accumulate 1 month of living expenses.
- **Level 2: Debt Decelerator:** Clear high-interest liabilities using a debt snowball method.
- **Level 3: Full Emergency Guardrail:** Accumulate the remaining 2 months of core expenses (totaling 3 months).
- **Level 4: Investment Launchpad:** Introduces automated index funds, ETFs, and compound interest.
- **Level 5: Goal Vault:** Accumulates the target capital for the user's primary goal.

To prevent cognitive overload, each level contains its own dedicated workspace and isolated chatbot. The chatbot is initialized with level-specific system prompts containing only the details of that step (e.g., if on Level 2, it only knows about your credit card debt, preventing irrelevant recommendations about stock investments).

---

## 4. Engineering Bug Fixes & Context Management

- **Formatting Parsers:** Replaced raw Markdown bullet characters (such as asterisks `*` or hyphens `-`) returned by open-source LLMs with styled HTML list structures.
- **State Restoration:** Integrated React `useEffect` hooks checking the `/api/goals` state on initialization. If user data exists, it skips completed steps automatically on browser reload.
- **OpenRouter Failovers:** Configured automated model failovers (`google/gemini-2.5-flash` ➔ `meta-llama/llama-3.1-8b-instruct` ➔ `google/gemini-2.5-pro`) to ensure high availability during LLM API outages.
- **Context Preservation (`brain.md`):** Implemented a structured project brain file to maintain architecture details and goals across multi-agent sessions, reducing context search time.

---

## 5. Future Scope

The following features represent upcoming additions planned for the FinOS development roadmap:

### 1. The "Financial Butterfly Effect" Simulator
- **How it works:** An interactive dashboard panel where changing a single minor daily habit (e.g., making coffee at home to save $150/month, or canceling a streaming service) cascades automatically through all 5 roadmap levels, recalculating how much faster Level 1 (Emergency Shield) fills, when Level 2 (Debt) is fully paid off, and the compound interest expansion at Level 4.
- **Produces:** A cascading progress report detailing the acceleration impact on each level.
- **Flow:**
  ```
  Single Variable Edit ➔ Sequential Level Cascading Solver ➔ Multi-Level Timeline Update
  ```
- **AI/Software Concepts Learned:** Cascading state propagation, reactive recalculation engines, dependency networks.

### 2. Inflation & Purchasing Power Erosion Simulator
- **How it works:** A sandbox containing an inflation slider (2% to 10%). It adjusts your future goals (e.g., buying a $20,000 car in 5 years) to show the actual nominal price you will need to pay due to inflation, comparing how your purchasing power fares if you save in cash vs. a High-Yield Savings Account (HYSA) vs. index funds.
- **Produces:** Real vs. nominal value comparisons and purchasing power erosion charts.
- **Flow:**
  ```
  Goal Target ➔ Inflation Rate Selection ➔ Real vs. Nominal Value Graph
  ```
- **AI/Software Concepts Learned:** Inflation compounding calculations, real vs. nominal value models, dynamic charts.

### 3. Salary Negotiator AI Roleplayer
- **How it works:** An interactive sandbox where you can practice negotiating a raise or a new job offer in a chat interface with an AI Hiring Manager. The manager responds realistically with counter-offers, rejection, or acceptance based on the arguments you present. If you successfully negotiate a simulated raise, you can click "Apply to Roadmap" to instantly see how it speeds up your goals.
- **Produces:** A negotiation transcript, performance feedback score, and simulated wage boost.
- **Flow:**
  ```
  Negotiation Practice Chat ➔ Offer Decision ➔ Salary Boost Injection ➔ Roadmap Acceleration
  ```
- **AI/Software Concepts Learned:** Conversational roleplay agents, negotiation logic state-machines, profile update hooks.

### 4. Penny's Daily Bite-Sized Learning Feed
- **How it works:** This feature creates a small, highly visual "Daily Learning Card" on the user's dashboard homepage. Every time the user logs in on a new day, Penny provides a fresh, bite-sized tip or concept about personal finance, taxes, or investing. To ensure the advice is relevant, the topics are chosen based on the user's current active level. (e.g., if they are on Level 1, Penny teaches them about HYSAs and emergency fund sizes; if they are on Level 4, she teaches them about stock market indexes, ETFs, and compound interest). To prevent duplicate content, a tracking array (`readTips`) is saved to the user's MongoDB profile to catalog previously generated tip IDs.
- **Produces:**
  - **Daily Learning Card UI:** Premium card featuring a custom tip title, a 2-sentence explanation, and a 1-sentence actionable step.
  - **Mascot reaction:** Penny holds a themed asset (e.g., a tiny lightbulb or book) next to the card.
- **Flow:**
  ```
  User Login ➔ Check Active Roadmap Level ➔ Read DB Read History ➔ LLM Dynamic Generator ➔ Update Card UI
  ```
- **AI/Software Concepts Learned:** Context-Aware Content Generation, Session State Persistence (DB tracking), Adaptive UI Updates based on User Progression.
