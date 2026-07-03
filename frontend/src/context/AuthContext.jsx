import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARN_BEFORE_MS     = 2  * 60 * 1000; // warn 2 min before

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [token,       setToken]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [sessionWarn, setSessionWarn] = useState(false); // show countdown modal

  const timeoutRef  = useRef(null);
  const warnRef     = useRef(null);

  // ── Restore session on mount ───────────────────────────────────────────────
  useEffect(() => {
    const savedUser  = localStorage.getItem("mc_user");
    const savedToken = localStorage.getItem("mc_token");
    const savedTime  = localStorage.getItem("mc_last_active");

    if (savedUser && savedToken) {
      // Check if session expired while page was closed
      if (savedTime) {
        const elapsed = Date.now() - parseInt(savedTime);
        if (elapsed > SESSION_TIMEOUT_MS) {
          // Expired — clear everything
          localStorage.removeItem("mc_token");
          localStorage.removeItem("mc_user");
          localStorage.removeItem("mc_last_active");
        } else {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        }
      } else {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    }

    // Check with the backend whether an admin already exists
    import("../services/api").then(({ authService }) => {
      authService.adminExists()
        .then(res => setAdminExists(!!res?.exists))
        .catch(() => setAdminExists(!!localStorage.getItem("mc_admin_registered")))
        .finally(() => setLoading(false));
    });
  }, []);


  // ── Session timeout timers ─────────────────────────────────────────────────
  const resetTimers = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warnRef.current);
    setSessionWarn(false);
    localStorage.setItem("mc_last_active", Date.now().toString());

    warnRef.current = setTimeout(() => {
      setSessionWarn(true);
    }, SESSION_TIMEOUT_MS - WARN_BEFORE_MS);

    timeoutRef.current = setTimeout(() => {
      doLogout();
    }, SESSION_TIMEOUT_MS);
  }, []);

  // Reset timer on user activity
  useEffect(() => {
    if (!user) return;
    const events = ["mousedown","keydown","scroll","touchstart"];
    const handler = () => resetTimers();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimers();
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearTimeout(timeoutRef.current);
      clearTimeout(warnRef.current);
    };
  }, [user, resetTimers]);

  // ── Auth actions ───────────────────────────────────────────────────────────
  const login = (userData, accessToken) => {
    localStorage.setItem("mc_token",       accessToken);
    localStorage.setItem("mc_user",        JSON.stringify(userData));
    localStorage.setItem("mc_last_active", Date.now().toString());
    setUser(userData);
    setToken(accessToken);
    setSessionWarn(false);
  };

  const doLogout = () => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warnRef.current);
    localStorage.removeItem("mc_token");
    localStorage.removeItem("mc_user");
    localStorage.removeItem("mc_last_active");
    setUser(null);
    setToken(null);
    setSessionWarn(false);
  };

  const extendSession = () => {
    resetTimers();
    setSessionWarn(false);
  };

  const markAdminRegistered = () => {
    localStorage.setItem("mc_admin_registered", "true");
    setAdminExists(true);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      adminExists, markAdminRegistered,
      login, logout: doLogout,
      sessionWarn, extendSession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
