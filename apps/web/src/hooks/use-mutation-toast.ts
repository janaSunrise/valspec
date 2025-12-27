import { useEffect } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/lib/errors";

interface MutationToastOptions {
  successMessage?: string;
  errorMessage?: string;
}

export function useMutationToast<_TData, TError>(
  mutation: {
    isSuccess: boolean;
    isError: boolean;
    error: TError | null;
    reset?: () => void;
  },
  options: MutationToastOptions = {},
) {
  const { successMessage, errorMessage } = options;

  useEffect(() => {
    if (mutation.isSuccess && successMessage) {
      toast.success(successMessage);
    }
  }, [mutation.isSuccess, successMessage]);

  useEffect(() => {
    if (mutation.isError && mutation.error) {
      const message = errorMessage || getErrorMessage(mutation.error);
      toast.error(message);
    }
  }, [mutation.isError, mutation.error, errorMessage]);
}
