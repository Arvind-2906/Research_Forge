const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function fetchApi(endpoint, options = {}) {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  // If running in browser, pick up active workspace id from storage
  if (typeof window !== "undefined") {
    const activeWorkspaceId = localStorage.getItem("rf_workspace_id");
    if (activeWorkspaceId) {
      defaultHeaders["x-workspace-id"] = activeWorkspaceId;
    }
  }

  const mergedHeaders = {
    ...defaultHeaders,
    ...(options.headers || {}),
  };

  // If body is FormData, delete Content-Type to allow browser boundary calculation
  if (options.body instanceof FormData) {
    delete mergedHeaders["Content-Type"];
  }

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: mergedHeaders,
  });

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      data?.error?.message ||
      data?.message ||
      `Request failed with status ${response.status}`;
    const errorCode = data?.error?.code || "HTTP_ERROR";
    const details = data?.error?.details || null;
    throw new ApiError(errorMsg, response.status, errorCode, details);
  }

  return data;
}

export const api = {
  get: (endpoint, options = {}) =>
    fetchApi(endpoint, { method: "GET", ...options }),
  post: (endpoint, body, options = {}) =>
    fetchApi(endpoint, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  put: (endpoint, body, options = {}) =>
    fetchApi(endpoint, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  patch: (endpoint, body, options = {}) =>
    fetchApi(endpoint, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  delete: (endpoint, options = {}) =>
    fetchApi(endpoint, { method: "DELETE", ...options }),
};

export function subscribeToSSE(endpoint, onMessage, onError) {
  if (typeof window === "undefined") return () => {};

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const eventSource = new EventSource(url, { withCredentials: true });

  eventSource.addEventListener("research_event", (e) => {
    try {
      const payload = JSON.parse(e.data);
      onMessage(payload);
    } catch (err) {
      console.warn("Failed to parse SSE research_event JSON:", err);
    }
  });

  eventSource.onmessage = (e) => {
    try {
      const payload = JSON.parse(e.data);
      onMessage(payload);
    } catch (err) {
      console.warn("Failed to parse SSE onmessage JSON:", err);
    }
  };

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => {
    eventSource.close();
  };
}

