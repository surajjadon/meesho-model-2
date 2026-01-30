import { toast } from "sonner";
import { AxiosError } from "axios";

export const handleApiError = (error: unknown, fallbackMessage = "Operation failed") => {
  let message = fallbackMessage;
  let description = "Please try again later.";

  if (error instanceof AxiosError) {
    // 1. Get the server's error message if it exists
    message = error.response?.data?.message || error.message || fallbackMessage;
    
    // 2. Handle specific status codes
    const status = error.response?.status;
    
    if (status === 400) description = "Invalid data provided.";
    if (status === 401) description = "Session expired. Please login again.";
    if (status === 403) description = "You do not have permission to perform this action.";
    if (status === 404) description = "Resource not found.";
    if (status === 500) description = "Internal Server Error.";
    if (status === 429) description = "Too many requests. Please slow down.";
  } else if (error instanceof Error) {
    message = error.message;
  }
  toast.error(message, { description });
};