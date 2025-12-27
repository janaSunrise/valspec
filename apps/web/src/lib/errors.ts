export type ErrorCode =
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "INTERNAL_SERVER_ERROR";

interface AppError {
  code?: ErrorCode;
  message?: string;
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: "You don't have permission to perform this action",
  NOT_FOUND: "The requested resource was not found",
  CONFLICT: "This resource already exists",
  BAD_REQUEST: "Invalid request. Please check your input",
  INTERNAL_SERVER_ERROR: "Something went wrong. Please try again",
};

export function getErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred";

  // Handle oRPC errors
  if (typeof error === "object" && error !== null) {
    const appError = error as AppError;

    if (appError.message) {
      return appError.message;
    }

    if (appError.code && appError.code in ERROR_MESSAGES) {
      return ERROR_MESSAGES[appError.code];
    }
  }

  if (error instanceof Error) {
    return error.message || "An unexpected error occurred";
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
}

export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  if (typeof error === "object" && error !== null) {
    return (error as AppError).code === code;
  }
  return false;
}
