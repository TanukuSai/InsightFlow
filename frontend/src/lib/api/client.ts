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
} from "./types";

function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  // Development environment allows localhost fallback
  if (process.env.NODE_ENV !== "production") {
    return "http://127.0.0.1:8000";
  }

  // In production, do not silently fallback to localhost!
  return "";
}

const API_BASE_URL = resolveApiBaseUrl();
const DEFAULT_WORKSPACE =
  process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE || "ws-production-eval";

export function getActiveWorkspaceId(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("insightflow_workspace_id") || DEFAULT_WORKSPACE;
  }
  return DEFAULT_WORKSPACE;
}

export function setActiveWorkspaceId(workspaceId: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("insightflow_workspace_id", workspaceId);
  }
}

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

async function fetchJson<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(
      "Production API endpoint is not configured. Please set NEXT_PUBLIC_API_BASE_URL in your deployment environment variables.",
      500,
      { code: "API_CONFIGURATION_MISSING" }
    );
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("X-Workspace-Id")) {
    headers.set("X-Workspace-Id", getActiveWorkspaceId());
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
      // not json
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
  }): Promise<FeedbackListResponse> => {
    const query = new URLSearchParams();
    if (params.datasetId) query.set("dataset_id", params.datasetId);
    if (params.page) query.set("page", params.page.toString());
    if (params.pageSize) query.set("page_size", params.pageSize.toString());
    if (params.category) query.set("category", params.category);
    if (params.sentiment) query.set("sentiment", params.sentiment);
    if (params.search) query.set("search", params.search);

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
    return `${API_BASE_URL}/api/v1/reports/${reportId}/export`;
  },

  download: async (reportId: string, filename: string): Promise<void> => {
    if (!API_BASE_URL) {
      throw new ApiError(
        "Production API endpoint is not configured. Please set NEXT_PUBLIC_API_BASE_URL.",
        500
      );
    }

    const url = `${API_BASE_URL}/api/v1/reports/${reportId}/export`;
    const headers = new Headers();
    headers.set("X-Workspace-Id", getActiveWorkspaceId());

    const response = await fetch(url, { headers });
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
    if (!API_BASE_URL) {
      throw new ApiError(
        "Production API endpoint is not configured. Please set NEXT_PUBLIC_API_BASE_URL.",
        500
      );
    }

    const url = `${API_BASE_URL}/api/v1/adaption/jobs/${jobId}/download?format=${format}`;
    const headers = new Headers();
    headers.set("X-Workspace-Id", getActiveWorkspaceId());

    const response = await fetch(url, { headers });
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

export { ApiError, API_BASE_URL, DEFAULT_WORKSPACE };

