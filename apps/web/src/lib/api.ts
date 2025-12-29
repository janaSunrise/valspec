import { treaty } from "@elysiajs/eden";

import { env } from "@valspec/env/web";

import type { App } from "@valspec/api";

export const api = treaty<App>(env.NEXT_PUBLIC_SERVER_URL, {
  fetch: { credentials: "include" },
});

type ApiErrorValue = { code: string; message: string };

function isApiError(value: unknown): value is ApiErrorValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as ApiErrorValue).message === "string"
  );
}

export function getErrorMessage(error: { value: unknown }): string {
  if (isApiError(error.value)) {
    return error.value.message;
  }
  return "An unexpected error occurred";
}
