'use client';

import { useEffect } from 'react';

export default function ClearSessionOnMount() {
  useEffect(() => {
    // Send a silent background request to clear the server-side session cookie
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

  return null;
}
