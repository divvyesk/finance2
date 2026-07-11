import { cookies } from 'next/headers';
import { getData } from './lib/db';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'FinOS - AI Financial Onboarding Operating System',
  description: 'Learn how money works, parse your paycheck, simulate scenarios, and build a personalized financial roadmap.',
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session')?.value;
  
  let user = null;
  if (sessionId) {
    try {
      const data = getData();
      const found = data.users.find(u => u.id === sessionId);
      if (found) {
        user = { id: found.id, name: found.name, email: found.email };
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="header">
          <div className="container nav">
            <a href="/" className="logo">
              <span className="logo-dot"></span>
              <span>FinOS</span>
            </a>
            
            <nav className="nav-buttons">
              {user ? (
                <>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Hi, <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>
                  </span>
                  <a href="/dashboard" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                    Dashboard
                  </a>
                  <form action="/api/auth/logout" method="POST" style={{ display: 'inline' }}>
                    <button type="submit" className="btn btn-text" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      Sign Out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <a href="/login" className="btn btn-text">
                    Log In
                  </a>
                  <a href="/signup" className="btn btn-primary">
                    Start Journey
                  </a>
                </>
              )}
            </nav>
          </div>
        </header>
        
        <main>{children}</main>
      </body>
    </html>
  );
}
