'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ── Currency symbol helper ─────────────────────────────────────────────────
const CURRENCY_SYMBOLS = { USD: '$', GBP: '£', EUR: '€', CAD: 'CA$', AUD: 'A$', INR: '₹', SGD: 'S$', JPY: '¥', NZD: 'NZ$' };
const sym = (currency) => CURRENCY_SYMBOLS[currency] || currency + ' ';

// ── Pipeline stage labels ──────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'uploading',  label: 'Uploading document...' },
  { key: 'ocr',        label: 'Stage 1 — OCR / PDF text extraction running...' },
  { key: 'extracting', label: 'Stage 2 — Running structured field extraction...' },
  { key: 'validating', label: 'Stage 3 — Applying validation rules...' },
];

const STAGE_INDEX = { uploading: 0, ocr: 1, extracting: 2, validating: 3 };

// ── Journey steps sidebar ─────────────────────────────────────────────────
const JOURNEY_STEPS = [
  'Understand Income', 'Understand Taxes', 'Define Goals',
  'Build Safety Net', 'Build Spending System', 'Explore Scenarios',
  'Build Financial Roadmap', 'Complete Setup',
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Pipeline state
  const [pipelineStage, setPipelineStage] = useState('idle'); // idle | uploading | ocr | extracting | validating | done | error
  const [result, setResult] = useState(null);
  const [pipelineError, setPipelineError] = useState('');

  // Manual mode
  const [manualMode, setManualMode] = useState(false);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);

  const [form, setForm] = useState({
    country: 'United States', currency: 'USD', state: '', salary: '', signing_bonus: '',
    relocation_bonus: '', rsu_count: '', vesting_period_years: '', stock_options: '',
    pay_frequency: 'biweekly', start_date: '', location: '', employment_type: 'full_time',
    match_rate: '', match_limit: '', health_medical: true, health_dental: true,
    health_vision: true, pto_days: '', probation_period_days: '',
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setUser(d.user))
      .catch(() => router.push('/login'))
      .finally(() => setAuthLoading(false));

    // Fetch dynamic country list from our geo API
    setCountriesLoading(true);
    fetch('/api/geo?action=countries')
      .then(r => r.json())
      .then(d => {
        if (d.countries) setCountries(d.countries);
      })
      .catch(err => console.error('Failed to load countries', err))
      .finally(() => setCountriesLoading(false));
  }, [router]);

  // Handle dynamic states and currency when country changes
  useEffect(() => {
    if (!form.country) {
      setStates([]);
      return;
    }

    const selected = countries.find(c => c.name === form.country);
    if (selected) {
      setForm(prev => ({
        ...prev,
        currency: selected.currencyCode || 'USD'
      }));
    }

    setStatesLoading(true);
    fetch(`/api/geo?action=states&country=${encodeURIComponent(form.country)}`)
      .then(r => r.json())
      .then(d => {
        if (d.states) {
          setStates(d.states);
        } else {
          setStates([]);
        }
      })
      .catch(err => {
        console.error('Failed to load states', err);
        setStates([]);
      })
      .finally(() => setStatesLoading(false));
  }, [form.country, countries]);

  // ── Shared pipeline runner ────────────────────────────────────────────
  async function runPipeline(fetchFn) {
    setPipelineError('');
    setResult(null);

    // Fire the real request immediately so we don't add fake delays to real work.
    // Wrap result in a sentinel object so we can detect errors without try/catch
    // racing against the animation awaits below.
    const fetchPromise = fetchFn().then(
      data => ({ ok: true, data }),
      err  => ({ ok: false, error: err.message })
    );

    // Animate uploading → ocr → extracting, then PAUSE here and wait for the
    // server. This means the spinner stays at 'extracting' for as long as
    // Tesseract / pdf-parse actually needs — no more stuck 'Stage 3'.
    setPipelineStage('uploading');
    await sleep(500);
    setPipelineStage('ocr');
    await sleep(1000);
    setPipelineStage('extracting');

    const outcome = await fetchPromise;

    if (!outcome.ok) {
      setPipelineError(outcome.error);
      setPipelineStage('error');
      return;
    }

    // Briefly show validating (the server validator is fast/synchronous)
    setPipelineStage('validating');
    await sleep(500);

    setResult(outcome.data);
    setPipelineStage('done');
  }

  // ── File upload handler ───────────────────────────────────────────────────
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    runPipeline(async () => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      return json;
    });
  }

  // ── Manual submit handler ─────────────────────────────────────────────────
  async function handleManualSubmit(e) {
    e.preventDefault();
    runPipeline(async () => {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      return json;
    });
  }

  function reset() {
    setPipelineStage('idle');
    setResult(null);
    setPipelineError('');
    setManualMode(false);
  }

  if (authLoading) return <Spinner full />;

  const step1Done = pipelineStage === 'done';

  return (
    <div className="container" style={{ padding: '2rem 1.5rem 6rem' }}>

      {/* Welcome banner */}
      <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
        <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Workspace
        </span>
        <h1 style={{ fontSize: '1.9rem', margin: '0.25rem 0 0.5rem' }}>
          Financial Onboarding Operating System
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 780 }}>
          Complete each step to build your personalized financial roadmap. Each step runs a real AI or logic pipeline under the hood.
        </p>
      </div>

      <div className="dashboard-grid">

        {/* Sidebar */}
        <aside>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              Journey Progress
            </h3>
            <div className="tracker-container">
              {JOURNEY_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={`tracker-item ${i === 0 ? (step1Done ? 'completed' : 'active') : ''}`}
                >
                  <span className="tracker-checkbox">{i === 0 && step1Done ? '✓' : ''}</span>
                  <span>{i + 1}. {step}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Step 1 card */}
          <section className="card" style={{ position: 'relative' }}>
            <StepBadge label="Step 1 — Income Intake Agent" />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Income Intake Agent</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: 600 }}>
              Upload a PDF offer letter, paystub, or image. The pipeline runs OCR → Extraction → Validation and produces a structured compensation JSON.
            </p>

            {/* ── IDLE state ── */}
            {pipelineStage === 'idle' && !manualMode && (
              <div>
                <label className="dropzone">
                  <span className="dropzone-icon">📄</span>
                  <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>Drag & drop or click to upload</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    PDF, PNG, JPG — offer letter, paystub, or contract
                  </span>
                  <input type="file" style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} />
                </label>
                <div style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  or{' '}
                  <button className="btn btn-text" style={{ color: 'var(--primary)', fontWeight: 600 }} onClick={() => setManualMode(true)}>
                    Enter compensation details manually →
                  </button>
                </div>
              </div>
            )}

            {/* ── Manual form ── */}
            {pipelineStage === 'idle' && manualMode && (
              <form onSubmit={handleManualSubmit}>
                <SectionLabel>Location & Identity</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <Field label="Country" id="country">
                    <select
                      id="country"
                      className="form-input"
                      value={form.country}
                      onChange={e => setForm({ ...form, country: e.target.value, state: '' })}
                      disabled={countriesLoading}
                    >
                      {countriesLoading && <option>Loading countries...</option>}
                      {countries.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Currency" id="currency">
                    <input id="currency" className="form-input" value={form.currency} readOnly style={{ opacity: 0.6 }} />
                  </Field>
                  <Field label="State / Region" id="state">
                    {statesLoading ? (
                      <input className="form-input" value="Loading states..." disabled style={{ opacity: 0.6 }} />
                    ) : states.length > 0 ? (
                      <select
                        id="state"
                        className="form-input"
                        value={form.state}
                        onChange={e => setForm({ ...form, state: e.target.value })}
                      >
                        <option value="">-- Select State --</option>
                        {states.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="state"
                        className="form-input"
                        placeholder="e.g. California"
                        value={form.state}
                        onChange={e => setForm({ ...form, state: e.target.value })}
                      />
                    )}
                  </Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Field label="Work Location / City" id="location">
                    <input id="location" className="form-input" placeholder="e.g. San Francisco, CA" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                  </Field>
                  <Field label="Start Date" id="start_date">
                    <input id="start_date" type="date" className="form-input" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                  </Field>
                </div>

                <SectionLabel>Compensation</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <Field label="Base Salary (Annual)" id="salary" required>
                    <input id="salary" type="number" className="form-input" placeholder="80000" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} required />
                  </Field>
                  <Field label="Signing Bonus" id="signing_bonus">
                    <input id="signing_bonus" type="number" className="form-input" placeholder="5000" value={form.signing_bonus} onChange={e => setForm({ ...form, signing_bonus: e.target.value })} />
                  </Field>
                  <Field label="Relocation Bonus" id="relocation_bonus">
                    <input id="relocation_bonus" type="number" className="form-input" placeholder="3000" value={form.relocation_bonus} onChange={e => setForm({ ...form, relocation_bonus: e.target.value })} />
                  </Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <Field label="RSU Count" id="rsu_count">
                    <input id="rsu_count" type="number" className="form-input" placeholder="400" value={form.rsu_count} onChange={e => setForm({ ...form, rsu_count: e.target.value })} />
                  </Field>
                  <Field label="Vesting Period (years)" id="vesting_period_years">
                    <input id="vesting_period_years" type="number" className="form-input" placeholder="4" value={form.vesting_period_years} onChange={e => setForm({ ...form, vesting_period_years: e.target.value })} />
                  </Field>
                  <Field label="Stock Options" id="stock_options">
                    <input id="stock_options" type="number" className="form-input" placeholder="0" value={form.stock_options} onChange={e => setForm({ ...form, stock_options: e.target.value })} />
                  </Field>
                </div>

                <SectionLabel>Employment Details</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Field label="Employment Type" id="employment_type">
                    <select id="employment_type" className="form-input" value={form.employment_type} onChange={e => setForm({ ...form, employment_type: e.target.value })}>
                      <option value="full_time">Full Time Employee</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contractor</option>
                      <option value="intern">Intern</option>
                    </select>
                  </Field>
                  <Field label="Pay Frequency" id="pay_frequency">
                    <select id="pay_frequency" className="form-input" value={form.pay_frequency} onChange={e => setForm({ ...form, pay_frequency: e.target.value })}>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="semimonthly">Semimonthly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </Field>
                </div>

                <SectionLabel>Benefits</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <Field label="401(k) Match Rate (%)" id="match_rate">
                    <input id="match_rate" type="number" step="0.1" className="form-input" placeholder="50" value={form.match_rate} onChange={e => setForm({ ...form, match_rate: e.target.value })} />
                  </Field>
                  <Field label="401(k) Match Limit (%)" id="match_limit">
                    <input id="match_limit" type="number" step="0.1" className="form-input" placeholder="6" value={form.match_limit} onChange={e => setForm({ ...form, match_limit: e.target.value })} />
                  </Field>
                  <Field label="PTO Days (Annual)" id="pto_days">
                    <input id="pto_days" type="number" className="form-input" placeholder="15" value={form.pto_days} onChange={e => setForm({ ...form, pto_days: e.target.value })} />
                  </Field>
                  <Field label="Probation Period (days)" id="probation_period_days">
                    <input id="probation_period_days" type="number" className="form-input" placeholder="90" value={form.probation_period_days} onChange={e => setForm({ ...form, probation_period_days: e.target.value })} />
                  </Field>
                </div>

                <SectionLabel>Health Insurance</SectionLabel>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  {['medical', 'dental', 'vision'].map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      <input
                        type="checkbox"
                        checked={form[`health_${type}`]}
                        onChange={e => setForm({ ...form, [`health_${type}`]: e.target.checked })}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </label>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" className="btn btn-primary">Run Extraction Pipeline →</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setManualMode(false)}>Cancel</button>
                </div>
              </form>
            )}

            {/* ── Pipeline running ── */}
            {['uploading', 'ocr', 'extracting', 'validating'].includes(pipelineStage) && (
              <PipelineLoader stage={pipelineStage} />
            )}

            {/* ── Error ── */}
            {pipelineStage === 'error' && (
              <div>
                <div style={{ background: 'var(--error-glow)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '1rem', color: 'var(--error)', marginBottom: '1rem' }}>
                  ⚠ {pipelineError}
                </div>
                <button className="btn btn-secondary" onClick={reset}>Try Again</button>
              </div>
            )}

            {/* ── Done ── */}
            {pipelineStage === 'done' && result && (
              <ResultPanel result={result} onReset={reset} />
            )}
          </section>

          {/* AI Concepts card */}
          <section className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Engineering Concepts Active in Step 1
            </span>
            <h3 style={{ fontSize: '1.1rem', margin: '0.25rem 0 1rem' }}>What Is Running Under the Hood</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {[
                ['OCR (tesseract.js)', 'WebAssembly port of Tesseract. Preprocesses image pixels → layout analysis → character recognition → confidence score per word.'],
                ['PDF Parsing (pdf-parse)', 'Uses pdfjs-dist to read binary PDF buffers. Reconstructs characters from font glyph and position data. Returns clean UTF-8 text.'],
                ['Structured Extraction', 'One regex function per field. Scans raw text for salary, RSUs, bonuses, dates, insurance mentions. Null if not found — never fabricated.'],
                ['Validation Pipeline', 'Pure deterministic rule checks on the JSON object. Produces blocking errors (missing salary) and advisory warnings (unusual vesting period).'],
                ['JSON Schema Design', 'Compensation represented as a flat+nested JSON with typed fields, currency metadata, and sub-objects for 401k and health insurance.'],
                ['Confidence Scores', 'OCR confidence (0–1) from Tesseract word probabilities. Used to warn user if score is low and manual review is recommended.'],
              ].map(([title, desc]) => (
                <div key={title}>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>{title}</strong>
                  {desc}
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StepBadge({ label }) {
  return (
    <span style={{
      position: 'absolute', top: '1.5rem', right: '1.5rem',
      background: 'var(--primary-glow)', color: 'var(--primary)',
      fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem',
      borderRadius: 20, border: '1px solid rgba(99,102,241,0.2)',
    }}>{label}</span>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '1.5rem 0 0.75rem' }}>
      {children}
    </p>
  );
}

function Field({ label, id, required, children }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label" htmlFor={id}>{label}{required && <span style={{ color: 'var(--error)' }}> *</span>}</label>
      {children}
    </div>
  );
}

function PipelineLoader({ stage }) {
  const idx = STAGE_INDEX[stage] ?? 0;
  const pct = [20, 45, 72, 90][idx];
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div className="loading-spinner" style={{ width: 40, height: 40, color: 'var(--primary)', margin: '0 auto 1.5rem' }} />
      <h4 style={{ marginBottom: '0.5rem' }}>Processing Document</h4>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {PIPELINE_STAGES[idx]?.label}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxWidth: 400, margin: '0 auto' }}>
        {PIPELINE_STAGES.map((s, i) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem',
            color: i < idx ? 'var(--success)' : i === idx ? 'var(--text-primary)' : 'var(--text-muted)',
            fontWeight: i === idx ? 700 : 400 }}>
            <span style={{ width: 14 }}>{i < idx ? '✓' : i === idx ? '▶' : '○'}</span>
            {s.label}
          </div>
        ))}
      </div>
      <div style={{ width: '100%', maxWidth: 400, height: 4, background: 'var(--border-light)', borderRadius: 2, margin: '1.5rem auto 0', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--primary)', width: `${pct}%`, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function ResultPanel({ result, onReset }) {
  const { data, validation, ocrConfidence, extractionMethod, rawTextPreview, source } = result;
  const currency = data?.currency || 'USD';
  const s = sym(currency);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span>✓</span> Document Processed
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {source} · Method: {extractionMethod} · OCR Confidence: {ocrConfidence !== null ? `${(ocrConfidence * 100).toFixed(0)}%` : 'N/A'}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={onReset} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          Re-upload
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* JSON payload */}
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Extracted JSON</p>
          <pre className="json-view" style={{ fontSize: '0.78rem', lineHeight: 1.6 }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

        {/* Validation + summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div>
              <p style={{ color: 'var(--error)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                ✕ Blocking Errors (must fix before continuing)
              </p>
              {validation.errors.map((e, i) => (
                <div key={i} style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '0.65rem 0.75rem', color: 'var(--error)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  {e}
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div>
              <p style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                ⚠ Warnings (verify before continuing)
              </p>
              {validation.warnings.map((w, i) => (
                <div key={i} style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '0.65rem 0.75rem', color: 'var(--accent)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* All clear */}
          {validation.errors.length === 0 && validation.warnings.length === 0 && (
            <div style={{ background: 'var(--success-glow)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '0.75rem', color: 'var(--success)', fontSize: '0.9rem' }}>
              ✓ All validation checks passed.
            </div>
          )}

          {/* Human summary of key fields */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '1rem', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Quick Summary</p>
            {data.salary       && <Row label="Base Salary"     value={`${s}${data.salary.toLocaleString()} / year (${data.currency})`} />}
            {data.signing_bonus && <Row label="Signing Bonus"  value={`${s}${data.signing_bonus.toLocaleString()}`} />}
            {data.relocation_bonus && <Row label="Relocation"  value={`${s}${data.relocation_bonus.toLocaleString()}`} />}
            {data.rsu_count    && <Row label="RSUs"            value={`${data.rsu_count.toLocaleString()} units over ${data.vesting_period_years} yrs`} />}
            {data.pay_frequency && <Row label="Pay Schedule"   value={data.pay_frequency} />}
            {data.employment_type && <Row label="Role Type"    value={data.employment_type.replace(/_/g, ' ')} />}
            {data.state        && <Row label="Jurisdiction"    value={`${data.state}, ${data.country}`} />}
            {data.pto_days     && <Row label="PTO"             value={`${data.pto_days} days / year`} />}
            {data.retirement_401k?.match_rate != null && (
              <Row label="401(k)" value={`${(data.retirement_401k.match_rate * 100).toFixed(0)}% match up to ${data.retirement_401k.match_limit}%`} />
            )}
          </div>

          {/* OCR raw text preview */}
          {rawTextPreview && (
            <details style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>View raw OCR text preview</summary>
              <pre style={{ background: '#04060b', border: '1px solid var(--border-light)', borderRadius: 8, padding: '0.75rem', color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                {rawTextPreview}…
              </pre>
            </details>
          )}

          {/* Proceed button (only if no blocking errors) */}
          {validation.isValid && (
            <button className="btn btn-primary" style={{ marginTop: '0.5rem' }}
              onClick={() => alert('Step 2: Paycheck Interpreter — coming next!')}>
              Proceed to Step 2: Paycheck Interpreter →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>{value}</span>
    </div>
  );
}

function Spinner({ full }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: full ? '80vh' : 'auto' }}>
      <div className="loading-spinner" style={{ width: 40, height: 40 }} />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function countryToCurrency(country) {
  const map = {
    'US': 'USD', 'United Kingdom': 'GBP', 'Canada': 'CAD',
    'Australia': 'AUD', 'Germany': 'EUR', 'France': 'EUR',
    'India': 'INR', 'Singapore': 'SGD', 'Japan': 'JPY',
  };
  return map[country] || 'USD';
}
