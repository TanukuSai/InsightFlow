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
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8001";
const DEFAULT_WORKSPACE =
  process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE || "ws-production-eval";

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
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("X-Workspace-Id")) {
    headers.set("X-Workspace-Id", DEFAULT_WORKSPACE);
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
};

export { ApiError, API_BASE_URL, DEFAULT_WORKSPACE };
