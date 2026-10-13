import {
  Dataset,
  DashboardData,
  Feedback,
  FeedbackListResponse,
  Issue,
  Recommendation,
  AnalysisJob,
  Report,
  ImportSummary,
  AdaptionConfigStatus,
  AdaptionEstimateRequest,
  AdaptionEstimateResponse,
  AdaptionRunRequest,
  AdaptionJobResponse,
  User,
} from "./types";

class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function resolveRequestUrl(endpoint: string): string {
  // Direct authentication endpoints on Next.js BFF
  if (endpoint.startsWith("/api/auth/")) {
    return endpoint;
  }
  // Data and health endpoints routed through same-origin authenticated proxy
  if (endpoint.startsWith("/api/v1/") || endpoint.startsWith("/health")) {
    return `/api/proxy${endpoint}`;
  }
  return endpoint;
}

async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = resolveRequestUrl(endpoint);
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetails: any = null;
    try {
      errorDetails = await response.json();
    } catch {
      // response is not JSON
    }

    // Redirect to login if unauthenticated on client
    if (response.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (
        !path.startsWith("/login") &&
        !path.startsWith("/register") &&
        path !== "/"
      ) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/login?returnUrl=${encodeURIComponent(path)}`);
      }
    }

    const message =
      errorDetails?.detail ||
      errorDetails?.message ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, errorDetails);
  }

  return response.json() as Promise<T>;
}

// -------------------------------------------------------------
// 0. AUTHENTICATION & SESSION API (BFF Same-Origin)
// -------------------------------------------------------------
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: User }> => {
    return fetchJson<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (data: {
    email: string;
    password: string;
    full_name?: string;
  }): Promise<{ user: User }> => {
    return fetchJson<{ user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  me: async (): Promise<{ user: User }> => {
    return fetchJson<{ user: User }>("/api/auth/me");
  },

  logout: async (): Promise<{ success: boolean }> => {
    return fetchJson<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
    });
  },
};

// -------------------------------------------------------------
// 1. DATASETS & CSV IMPORT API
// -------------------------------------------------------------
export const datasetsApi = {
  list: async (): Promise<Dataset[]> => {
    return fetchJson<Dataset[]>("/api/v1/datasets");
  },

  get: async (datasetId: string): Promise<Dataset> => {
    return fetchJson<Dataset>(`/api/v1/datasets/${datasetId}`);
  },

  importCsv: async (file: File, name?: string): Promise<ImportSummary> => {
    const formData = new FormData();
    formData.append("file", file);
    if (name) formData.append("name", name);

    return fetchJson<ImportSummary>("/api/v1/datasets/import", {
      method: "POST",
      body: formData,
    });
  },
};

// -------------------------------------------------------------
// 2. DASHBOARD AGGREGATIONS API
// -------------------------------------------------------------
export const dashboardApi = {
  get: async (datasetId: string): Promise<DashboardData> => {
    return fetchJson<DashboardData>(
      `/api/v1/datasets/${datasetId}/dashboard`
    );
  },
};

// -------------------------------------------------------------
// 3. FEEDBACK EXPLORER API
// -------------------------------------------------------------
export const feedbackApi = {
  list: async (params: {
    datasetId?: string;
    page?: number;
    pageSize?: number;
    category?: string;
    sentiment?: string;
    search?: string;
    exactText?: string;
  }): Promise<FeedbackListResponse> => {
    const query = new URLSearchParams();
    if (params.datasetId) query.set("dataset_id", params.datasetId);
    if (params.page) query.set("page", params.page.toString());
    if (params.pageSize) query.set("page_size", params.pageSize.toString());
    if (params.category) query.set("category", params.category);
    if (params.sentiment) query.set("sentiment", params.sentiment);
    if (params.exactText) query.set("exact_text", params.exactText);
    else if (params.search) query.set("search", params.search);

    const queryString = query.toString();
    const endpoint = `/api/v1/feedback${queryString ? `?${queryString}` : ""}`;
    return fetchJson<FeedbackListResponse>(endpoint);
  },

  get: async (feedbackId: string): Promise<Feedback> => {
    return fetchJson<Feedback>(`/api/v1/feedback/${feedbackId}`);
  },

  create: async (data: {
    dataset_id: string;
    original_text: string;
    source_category?: string;
  }): Promise<Feedback> => {
    return fetchJson<Feedback>("/api/v1/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// -------------------------------------------------------------
// 4. ANALYSIS WORKFLOW API
// -------------------------------------------------------------
export const analysisApi = {
  start: async (
    datasetId: string,
    options?: { sample_size?: number; provider?: string; model?: string }
  ): Promise<AnalysisJob> => {
    return fetchJson<AnalysisJob>(`/api/v1/datasets/${datasetId}/analysis`, {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },

  getStatus: async (
    datasetId: string,
    jobId: string
  ): Promise<AnalysisJob> => {
    return fetchJson<AnalysisJob>(
      `/api/v1/datasets/${datasetId}/analysis/${jobId}`
    );
  },
};

// -------------------------------------------------------------
// 5. ISSUES & EVIDENCE API
// -------------------------------------------------------------
export const issuesApi = {
  list: async (params?: {
    datasetId?: string;
    priority?: string;
    status?: string;
    category?: string;
  }): Promise<Issue[]> => {
    const query = new URLSearchParams();
    if (params?.datasetId) query.set("dataset_id", params.datasetId);
    if (params?.priority) query.set("priority", params.priority);
    if (params?.status) query.set("status", params.status);
    if (params?.category) query.set("category", params.category);

    const queryString = query.toString();
    const endpoint = `/api/v1/issues${queryString ? `?${queryString}` : ""}`;
    return fetchJson<Issue[]>(endpoint);
  },

  get: async (issueId: string): Promise<Issue> => {
    return fetchJson<Issue>(`/api/v1/issues/${issueId}`);
  },

  update: async (
    issueId: string,
    updates: { status?: string; is_tracked?: boolean }
  ): Promise<Issue> => {
    return fetchJson<Issue>(`/api/v1/issues/${issueId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },
};

// -------------------------------------------------------------
// 6. RECOMMENDATIONS API
// -------------------------------------------------------------
export const recommendationsApi = {
  list: async (params?: {
    datasetId?: string;
    priority?: string;
    status?: string;
  }): Promise<Recommendation[]> => {
    const query = new URLSearchParams();
    if (params?.datasetId) query.set("dataset_id", params.datasetId);
    if (params?.priority) query.set("priority", params.priority);
    if (params?.status) query.set("status", params.status);

    const queryString = query.toString();
    const endpoint = `/api/v1/recommendations${
      queryString ? `?${queryString}` : ""
    }`;
    return fetchJson<Recommendation[]>(endpoint);
  },

  update: async (
    recId: string,
    updates: { status?: string; is_tracked?: boolean }
  ): Promise<Recommendation> => {
    return fetchJson<Recommendation>(`/api/v1/recommendations/${recId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },
};

// -------------------------------------------------------------
// 7. REPORTS & EXPORTS API
// -------------------------------------------------------------
export const reportsApi = {
  list: async (datasetId?: string): Promise<Report[]> => {
    const query = datasetId ? `?dataset_id=${datasetId}` : "";
    return fetchJson<Report[]>(`/api/v1/reports${query}`);
  },

  generate: async (data: {
    dataset_id: string;
    title: string;
    format: "pdf" | "json" | "csv";
  }): Promise<Report> => {
    return fetchJson<Report>("/api/v1/reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getExportUrl: (reportId: string): string => {
    return `/api/proxy/api/v1/reports/${reportId}/export`;
  },

  download: async (reportId: string, filename: string): Promise<void> => {
    const url = `/api/proxy/api/v1/reports/${reportId}/export`;
    const response = await fetch(url);
    if (!response.ok) {
      let message = `Export download failed with status ${response.status}`;
      try {
        const errJson = await response.json();
        message = errJson.detail || errJson.message || message;
      } catch {}
      throw new ApiError(message, response.status);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(link);
  },
};

// -------------------------------------------------------------
// 8. ADAPTION LABS API (Adaptive Data Ingestion & Optimization)
// -------------------------------------------------------------
export const adaptionApi = {
  getStatus: async (): Promise<AdaptionConfigStatus> => {
    return fetchJson<AdaptionConfigStatus>("/api/v1/adaption/status");
  },

  estimate: async (
    payload: AdaptionEstimateRequest
  ): Promise<AdaptionEstimateResponse> => {
    return fetchJson<AdaptionEstimateResponse>("/api/v1/adaption/estimate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  startJob: async (
    payload: AdaptionRunRequest
  ): Promise<AdaptionJobResponse> => {
    return fetchJson<AdaptionJobResponse>("/api/v1/adaption/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listJobs: async (): Promise<AdaptionJobResponse[]> => {
    return fetchJson<AdaptionJobResponse[]>("/api/v1/adaption/jobs");
  },

  getJob: async (jobId: string): Promise<AdaptionJobResponse> => {
    return fetchJson<AdaptionJobResponse>(`/api/v1/adaption/jobs/${jobId}`);
  },

  downloadJobOutput: async (
    jobId: string,
    filename: string = `adaption_output_${jobId}.csv`,
    format: string = "csv"
  ): Promise<void> => {
    const url = `/api/proxy/api/v1/adaption/jobs/${jobId}/download?format=${format}`;
    const response = await fetch(url);
    if (!response.ok) {
      let message = `Output download failed with status ${response.status}`;
      try {
        const errJson = await response.json();
        message = errJson.detail || errJson.message || message;
      } catch {}
      throw new ApiError(message, response.status);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(link);
  },
};

// -------------------------------------------------------------
// 9. HEALTH API
// -------------------------------------------------------------
export const healthApi = {
  check: async (): Promise<{ status: string; database?: string; app?: string; environment?: string }> => {
    return fetchJson<{ status: string; database?: string; app?: string; environment?: string }>("/health");
  },
};

export { ApiError };
