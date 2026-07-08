# Project Brain: FinOS Personal Finance Application

This file maintains the live state, architecture, history, and goals of the FinOS project. All AI agents must read and update this file continuously to prevent hallucination, minimize redundant analysis, and ensure context persistence across conversations.

---

## 1. What We Are Building & Why

### The Product
**FinOS** is a personalized financial roadmap generator and simulator designed for individuals who have just received their first paycheck and want to learn how money works.
- **Why**: Many young professionals find finance confusing, opaque, and intimidating. FinOS makes it accessible, interactive, and educational.
- **How**: It guides the user through a multi-step journey (Income → Taxes → Goals → Safety Net → Spending → Scenarios → Roadmap) powered by coordinated AI services.
- **Educational Angle**: It teaches personal finance concepts (e.g., 50/30/20 budget, emergency funds, tax brackets) alongside AI engineering concepts (e.g., OCR pipeline, structured LLM extraction, validation, and branching simulations).

---

## 2. Project Structure & Architecture

Below is the directory map of the codebase with the purpose of each key module:

```
finance/
├── AGENTS.md                   # System rules and instructions for AI agents (including Brain.md sync)
├── CLAUDE.md                   # Entry point pointing to AGENTS.md
├── package.json                # Dependencies: Next.js 16, React 19, @google/genai, pdf-parse, tesseract.js, mongodb
├── db.json                     # Local JSON database for development users, uploads, profile, and goals
├── src/
│   └── app/
│       ├── globals.css         # Main stylesheet (premium dark mode theme, colors, and layout classes)
│       ├── layout.js           # Core layout wrapper
│       ├── page.js             # Landing page introducing the journey and learning curriculum
│       ├── login/ & signup/    # User authentication pages
│       ├── dashboard/
│       │   ├── page.js         # Interactive dashboard governing the step-by-step financial flow
│       │   └── Step3Panel.js   # Interactive goals engine workspace and roadmap visualizer
│       ├── api/
│       │   ├── auth/           # Login, signup, and session state endpoints (/api/auth/me)
│       │   ├── geo/            # Country and state lookup for localization
│       │   ├── goals/          # Save profile, load goal workspace, update financial configurations
│       │   ├── taxes/          # Tax bracket engine endpoint
│       │   └── upload/         # File intake API (runs OCR/PDF parser → LLM field extractor → validator)
│       └── lib/
│           ├── db.js           # Read/write access helper for db.json
│           ├── mongodb.js      # MongoDB database driver connection helper
│           ├── openRouterClient.js # Centralized client routing LLM calls to OpenRouter (replacing direct Gemini SDK calls)
│           ├── explanationEngine.js # AI-driven text generator explaining tax calculations & plan allocations
│           ├── goalsEngine.js  # Mathematics for goal success calculations, runway, and financial roadmaps
│           ├── taxEngine.js    # Local tax tables and bracket estimation formulas
│           ├── geo.js          # Raw geographical databases (countries, currencies, states)
│           └── extractors/
│               ├── pdfExtractor.js   # PDF text extraction using pdf-parse
│               ├── imageExtractor.js # OCR text extraction using tesseract.js
│               ├── fieldExtractor.js # LLM structured extraction from offer letters / paystubs
│               └── validator.js      # Data validation rules ensuring sanity of extracted/manual fields
```

---

## 3. What Has Been Done So Far & Why

### Milestones & Decisions
1. **Intake OCR & Parser Layer**: Installed `tesseract.js` and `pdf-parse`. Designed extraction modules to convert raw files (PDF/Images) into raw text, pass it to the LLM, and parse out structured data like salary, country, state, currency, and employment terms.
2. **Validator Engine**: Implemented `validator.js` to ensure the parsed information is financially consistent (e.g. gross pay > net pay, validation warnings/errors).
3. **Tax & Goals Engine**: Added localized estimation rules for taxes (`taxEngine.js`) and simulated success trajectories for goals using compounding math and runaways (`goalsEngine.js`).
4. **OpenRouter Migration**: Replaced direct Gemini SDK calls with a centralized OpenRouter proxy (`openRouterClient.js`) to prevent high demand rate limits on the free Google Gemini tier. The proxy maps direct model designations to OpenRouter slugs (e.g., `gemini-2.5-flash` to `google/gemini-2.5-flash`) and transforms the SDK format to standard chat completions.

---

## 4. Current Goal

- **Goal**: Maintain and synchronize `brain.md` context.
- **Why**: Provide AI agents with an up-to-date representation of the codebase state, progress, and objectives to prevent hallucination, minimize startup analysis time, and execute changes safely.
- **State**: The file `brain.md` is initialized. `AGENTS.md` is updated to configure automatic discovery and synchronization guidelines.

---

## 5. How to Update This File

When the user asks you to **"update the brain.md file"**, follow these instructions:
1. **Analyze recent changes**: Look at `git log`, `git status`, or the conversation history/context to identify what tasks were completed.
2. **Review structure changes**: If any new files were created, moved, or deleted, update the **Project Structure & Architecture** section.
3. **Record progress**: Add the completed work to **What Has Been Done So Far & Why** with details on *what* was done and *why*.
4. **Define the next step**: Update the **Current Goal** section to reflect the new direction or the user's next request.
5. **Keep it concise**: Preserve the clear markdown headings and structure for future readability.
