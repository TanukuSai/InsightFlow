export interface Dataset {
  id: string;
  workspace_id: string;
  name: string;
  original_filename: string;
  row_count: number;
  valid_rows: number;
  invalid_rows: number;
  unique_feedback_count: number;
  repeat_feedback_count: number;
  category_distribution: Record<string, number>;
  has_timestamps: boolean;
  status: string;
  error_summary?: string;
  created_at: string;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
  unknown: number;
  total_analyzed: number;
}

export interface Feedback {
  id: string;
  workspace_id: string;
  dataset_id: string;
  original_text: string;
  source_category?: string;
  source_timestamp?: string;
  source_identifier?: string;
  sentiment_label?: string;
  sentiment_score?: number;
  confidence_score?: number;
  primary_topic?: string;
  analysis_status: string;
  created_at: string;
}

export interface FeedbackListResponse {
  items: Feedback[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EvidenceFeedbackItem {
  feedback_id: string;
  quote: string;
  source_category?: string;
  confidence?: number;
}

export interface Issue {
  id: string;
  workspace_id: string;
  dataset_id: string;
  title: string;
  summary: string;
  category: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  priority_explanation: string;
  status: "open" | "investigating" | "in_progress" | "resolved" | "dismissed";
  is_tracked: boolean;
  supporting_count: number;
  unique_supporting_count: number;
  supporting_evidence?: EvidenceFeedbackItem[];
  created_at: string;
  updated_at?: string;
}

export interface Recommendation {
  id: string;
  workspace_id: string;
  dataset_id: string;
  issue_id?: string;
  action: string;
  rationale: string;
  expected_benefit?: string;
  priority: string;
  status: string;
  is_tracked: boolean;
  created_at: string;
  updated_at?: string;
  // UI compatibility aliases
  title?: string;
  problem_statement?: string;
  proposed_action?: string;
}

export interface RepeatedStatement {
  statement: string;
  category: string;
  count: number;
  sample_feedback_ids?: string[];
}

export interface DashboardData {
  dataset_id: string;
  dataset_name: string;
  total_source_rows: number;
  unique_exact_statements: number;
  repeated_rows: number;
  has_timestamps: boolean;
  temporal_available: boolean;
  temporal_message?: string;
  analysis_status: string;
  analysis_provider?: string;
  analysis_model?: string;
  source_category_distribution: Record<string, number>;
  sentiment_distribution?: SentimentDistribution;
  average_sentiment_score?: number;
  top_recurring_issues?: Issue[];
  top_recommendations?: Recommendation[];
  top_repeated_statements?: RepeatedStatement[];
  sample_feedbacks?: Feedback[];
  limitations?: string[];
  last_updated: string;
}

export interface AnalysisJob {
  id: string;
  workspace_id: string;
  dataset_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  total_items: number;
  processed_items: number;
  success_count: number;
  failure_count: number;
  provider: string;
  model: string;
  metrics?: Record<string, any>;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface Report {
  id: string;
  workspace_id: string;
  dataset_id: string;
  title: string;
  format: "pdf" | "json" | "csv";
  status: string;
  file_path?: string;
  download_url?: string;
  created_at: string;
}

export interface ImportSummary {
  dataset_id: string;
  name: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  unique_exact_statements: number;
  repeated_statements: number;
  detected_categories: string[];
  has_timestamps: boolean;
  errors_sample?: Array<{ row_number: number; error: string; raw_data: string }>;
}

export interface AdaptionConfigStatus {
  configured: boolean;
  api_key_set: boolean;
  key_prefix?: string;
  sdk_version: string;
  message: string;
  public_operations_enabled: boolean;
}

export interface AdaptionEstimateRequest {
  dataset_id: string;
  column_mapping?: Record<string, any>;
  max_rows?: number;
}

export interface AdaptionEstimateResponse {
  local_job_id: string;
  dataset_id: string;
  adaption_dataset_id?: string;
  estimated_credits: number;
  estimated_minutes: number;
  column_mapping_used: Record<string, any>;
  message: string;
}

export interface AdaptionRunRequest {
  dataset_id: string;
  column_mapping?: Record<string, any>;
  job_specification?: Record<string, any>;
}

export interface AdaptionJobResponse {
  id: string;
  workspace_id: string;
  dataset_id: string;
  adaption_dataset_id?: string;
  adaption_run_id?: string;
  operation_type: string;
  status: string;
  column_mapping: Record<string, any>;
  job_specification: Record<string, any>;
  estimated_credits?: number;
  estimated_minutes?: number;
  result_metadata: Record<string, any>;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
