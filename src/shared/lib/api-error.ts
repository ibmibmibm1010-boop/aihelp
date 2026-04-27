import { isAxiosError } from "axios";

const DEFAULT_MESSAGE = "Произошла ошибка. Попробуйте позже.";

function isAuthApiError(error: unknown): error is { message: string; code?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "AuthApiError" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

function detailToString(detail: unknown): string | null {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return null;
      })
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : null;
  }
  return null;
}

export interface ApiErrorOptions {
  /** Для входа: 401 всегда как «Неверные учетные данные». */
  signIn?: boolean;
}

export function getApiErrorMessage(
  error: unknown,
  options?: ApiErrorOptions,
): string {
  if (isAuthApiError(error)) {
    const code = error.code;
    if (
      options?.signIn &&
      (code === "invalid_credentials" ||
        code === "invalid_grant" ||
        /invalid login credentials/i.test(error.message))
    ) {
      return "Неверные учетные данные";
    }
    if (error.message) return error.message;
  }

  if (!isAxiosError(error)) {
    if (error instanceof Error && error.message) return error.message;
    return DEFAULT_MESSAGE;
  }

  if (!error.response) {
    return "Нет соединения с сервером. Проверьте сеть.";
  }

  const status = error.response.status;
  if (options?.signIn && status === 401) {
    return "Неверные учетные данные";
  }

  const data = error.response.data;
  if (data && typeof data === "object" && "detail" in data) {
    const msg = detailToString((data as { detail: unknown }).detail);
    if (msg) return msg;
  }

  if (status === 400 || status === 422) {
    return DEFAULT_MESSAGE;
  }

  return DEFAULT_MESSAGE;
}
