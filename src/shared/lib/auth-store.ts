import type { Session } from "@supabase/supabase-js";

import {
  fetchCurrentUser,
  signOut as apiSignOut,
  type SignInPayload,
  type User,
} from "@shared/api/auth";
import { getSupabase } from "@shared/lib/supabase-client";

export type AuthState = {
  currentUser: User | null;
  isInitializing: boolean;
};

const initialState: AuthState = {
  currentUser: null,
  isInitializing: true,
};

let state: AuthState = initialState;

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setState(partial: Partial<AuthState>): void {
  state = { ...state, ...partial };
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): AuthState {
  return state;
}

export function getServerSnapshot(): AuthState {
  return initialState;
}

export async function bootstrap(): Promise<void> {
  const supabase = getSupabase();

  const applySession = async (
    session: Session | null,
    finishInit: boolean,
  ): Promise<void> => {
    if (!session) {
      setState({
        currentUser: null,
        ...(finishInit ? { isInitializing: false } : {}),
      });
      return;
    }
    try {
      const u = await fetchCurrentUser();
      setState({
        currentUser: u,
        ...(finishInit ? { isInitializing: false } : {}),
      });
    } catch {
      await supabase.auth.signOut();
      setState({
        currentUser: null,
        ...(finishInit ? { isInitializing: false } : {}),
      });
    }
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  await applySession(session, true);

  supabase.auth.onAuthStateChange(async (event, newSession) => {
    if (event === "INITIAL_SESSION") return;
    await applySession(newSession, false);
  });
}

/** Выбрасывается после успешного входа, если профиль не удалось загрузить. */
export class AuthProfileError extends Error {
  constructor() {
    super("PROFILE_LOAD_FAILED");
    this.name = "AuthProfileError";
  }
}

/**
 * После signUp с активной сессией — обновить стор до навигации (избегает гонки с ProtectedRoute).
 * @returns удалось ли выставить currentUser
 */
export async function syncUserAfterAuth(): Promise<boolean> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;
  try {
    const u = await fetchCurrentUser();
    setState({ currentUser: u });
    return true;
  } catch {
    await supabase.auth.signOut();
    setState({ currentUser: null });
    return false;
  }
}

export async function login(payload: SignInPayload): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });
  if (error) throw error;
  try {
    const u = await fetchCurrentUser();
    setState({ currentUser: u });
  } catch {
    await supabase.auth.signOut();
    setState({ currentUser: null });
    throw new AuthProfileError();
  }
}

export async function logout(): Promise<void> {
  await apiSignOut();
  setState({ currentUser: null });
}
