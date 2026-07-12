'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', position: 'relative' }}>

      {/* Back Button */}
      <Link href="/" style={{
        position: 'absolute', top: '2rem', left: '2rem', color: 'var(--text-secondary)', textDecoration: 'none',
        fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10
      }}>
        <span>&larr;</span> Back to Home
      </Link>

      {/* Left Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4rem 6rem',
        position: 'relative',
        borderRight: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '550px', width: '100%' }}>

          <div style={{
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: '24px',
            borderBottomLeftRadius: '4px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--card-shadow)',
            position: 'relative',
            marginBottom: '1.5rem',
            width: '85%',
            alignSelf: 'flex-end',
            transform: 'translate(140px, 60px)',
            zIndex: 2
          }}>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '800', lineHeight: 1.1, letterSpacing: '-0.04em' }}>Welcome Back</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.6' }}>
              Pick up where you left off. Track your runway, decode your paycheck, and simulate your financial future with FinOS.
            </p>
            {/* Speech bubble tail */}
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              left: '20px',
              width: '20px',
              height: '20px',
              background: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-light)',
              borderBottom: '1px solid var(--border-light)',
              transform: 'rotate(45deg)',
            }}></div>
          </div>

          <img src="/mascot.png" alt="Mascot" style={{ width: '480px', height: 'auto', zIndex: 1 }} />

        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4rem'
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          <h2 style={{ fontSize: '2rem', marginBottom: '3rem', fontWeight: '700', letterSpacing: '-0.02em' }}>Sign in</h2>

          {error && (
            <div style={{
              background: 'var(--error-glow)', color: 'var(--error)', padding: '0.75rem 1rem',
              borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="email" className="form-label">Your Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '2.5rem', position: 'relative' }}>
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', background: 'none', border: 'none',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem',
                  display: 'flex', alignItems: 'center', padding: '0.25rem'
                }}
              >
                👁
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '0.85rem' }}
            >
              {loading ? <span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }}></span> : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            New to FinOS?{' '}
            <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
              Create Account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
