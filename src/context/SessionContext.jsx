import { createContext, useContext, useMemo } from 'react';
import { api } from '../api/index.js';
import { useApi } from '../hooks/useApi.js';
import { can, hasAnyAdmin } from '../lib/permissions.js';

// Who is signed in (a demo role, no password). The fake API holds the session; this only mirrors it for the pages.

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { data: user, loading } = useApi(() => api.getSession(), []);

  const value = useMemo(
    () => ({
      user: user || null,
      ready: !loading || user !== undefined,
      can: (permission) => can(user, permission),
      isStaff: hasAnyAdmin(user),
      signIn: (email) => api.signIn(email),
      signOut: () => api.signOut(),
    }),
    [user, loading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
