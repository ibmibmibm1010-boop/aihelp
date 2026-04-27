import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import * as authStore from "./auth-store";

const AuthProviderContext = createContext(false);

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void authStore.bootstrap();
  }, []);

  return (
    <AuthProviderContext.Provider value={true}>
      {children}
    </AuthProviderContext.Provider>
  );
}

export type AuthContextValue = {
  currentUser: authStore.AuthState["currentUser"];
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: typeof authStore.login;
  logout: typeof authStore.logout;
};

export function useAuth(): AuthContextValue {
  const hasProvider = useContext(AuthProviderContext);
  if (!hasProvider) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  const snapshot = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot,
  );

  return {
    currentUser: snapshot.currentUser,
    isAuthenticated: snapshot.currentUser !== null,
    isInitializing: snapshot.isInitializing,
    login: authStore.login,
    logout: authStore.logout,
  };
}
