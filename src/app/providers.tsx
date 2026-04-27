import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@shared/lib/auth-context";

import { router } from "./router";

export const Providers = () => (
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);
