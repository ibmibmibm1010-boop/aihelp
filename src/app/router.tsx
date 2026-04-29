import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "../components/layout";
import {
  AccountPage,
  AuthCallbackPage,
  BillingPage,
  BoardDetailPage,
  BoardsPage,
  LandingPage,
  NotFoundPage,
  SettingsPage,
  SignInPage,
  SignUpPage,
} from "../pages";
import { ProtectedRoute } from "../shared";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/sign-in", element: <SignInPage /> },
  { path: "/sign-up", element: <SignUpPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { path: "/boards", element: <BoardsPage /> },
      { path: "/boards/:boardId", element: <BoardDetailPage /> },
      { path: "/account", element: <AccountPage /> },
      { path: "/billing", element: <BillingPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  { path: "/app", element: <Navigate to="/boards" replace /> },
  { path: "*", element: <NotFoundPage /> },
]);
