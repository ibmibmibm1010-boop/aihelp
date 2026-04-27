// lib — утилиты, хелперы, форматтеры, хуки без бизнес-логики
export { getAppBackgroundUrl } from "./app-background";
export { getOAuthCallbackUrl } from "./oauth-redirect";
export {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  persistAuthTokens,
} from "./auth-storage";
export { getApiErrorMessage } from "./api-error";
export type { ApiErrorOptions } from "./api-error";
export { AuthProfileError } from "./auth-store";
export type { AuthState } from "./auth-store";
export { AuthProvider, useAuth } from "./auth-context";
export type { AuthContextValue } from "./auth-context";
export { AssistantProvider, useAssistant } from "./assistant-context";
export type { AssistantContextValue } from "./assistant-context";
export { formatDateRu } from "./format-date";
export { filterTaskIdsByQuery, normalizeSearchQuery, taskMatchesSearchQuery } from "./filter-tasks-by-query";
