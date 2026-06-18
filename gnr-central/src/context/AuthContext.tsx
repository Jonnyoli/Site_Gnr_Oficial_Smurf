import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DiscordUser {
  id: string;
  username: string;
  displayName?: string;
  avatar: string | null;
  discriminator: string;
  roles?: string[];
  rank?: string;
}

interface AuthContextType {
  user: DiscordUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  hasRole: (roleId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const hasRole = (roleId: string) => user?.roles?.includes(roleId) || false;

  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      .then(() => setUser(null));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
