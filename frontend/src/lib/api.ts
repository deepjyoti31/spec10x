/**
 * Spec10x — API Client
 *
 * Centralized HTTP client for the backend API.
 * Automatically attaches Firebase auth tokens to requests.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
console.debug(`[ApiClient] Configured with BASE_URL: ${API_BASE_URL}`);

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new ApiError(response.status, error.detail || 'An error occurred');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  private async requestText(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<string> {
    const { token, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new ApiError(response.status, error.detail || 'An error occurred');
    }

    return response.text();
  }

  // === Auth ===

  async verifyToken(token: string) {
    return this.request<UserResponse>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getMe(token: string) {
    return this.request<UserResponse>('/api/auth/me', { token });
  }

  async checkEmail(email: string) {
    return this.request<{ exists: boolean }>('/api/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // === Users ===

  async deleteData(token: string) {
    return this.request<void>('/api/users/me/data', {
      method: 'DELETE',
      token,
    });
  }

  async deleteAccount(token: string) {
    return this.request<void>('/api/users/me', {
      method: 'DELETE',
      token,
    });
  }

  // === Interviews ===

  async getUploadUrl(token: string, data: UploadUrlRequest) {
    return this.request<UploadUrlResponse>('/api/interviews/upload-url', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async createInterview(token: string, data: InterviewCreate) {
    return this.request<InterviewResponse>('/api/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async listInterviews(token: string, sort = 'recent') {
    return this.request<InterviewResponse[]>(
      `/api/interviews?sort=${sort}`,
      { token }
    );
  }

  async getInterview(token: string, id: string) {
    return this.request<InterviewDetailResponse>(
      `/api/interviews/${id}`,
      { token }
    );
  }

  async updateSpeaker(token: string, interviewId: string, speakerId: string, data: SpeakerUpdate) {
    return this.request<SpeakerResponse>(
      `/api/interviews/${interviewId}/speakers/${speakerId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        token
      }
    );
  }

  async deleteInterview(token: string, id: string) {
    return this.request<void>(`/api/interviews/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  // === Themes ===

  async listThemes(token: string, sort = 'urgency') {
    return this.request<ThemeResponse[]>(
      `/api/themes?sort=${sort}`,
      { token }
    );
  }

  async getTheme(token: string, id: string) {
    return this.request<ThemeDetailResponse>(`/api/themes/${id}`, { token });
  }

  async renameTheme(token: string, id: string, name: string) {
    return this.request<ThemeResponse>(`/api/themes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
      token,
    });
  }

  // === Feed ===

  async listFeed(token: string, filters: FeedFilters = {}) {
    const params = new URLSearchParams();

    if (filters.source) params.set('source', filters.source);
    if (filters.sentiment) params.set('sentiment', filters.sentiment);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);

    const qs = params.toString();
    return this.request<FeedSignalResponse[]>(
      `/api/feed${qs ? `?${qs}` : ''}`,
      { token }
    );
  }

  async getFeedSignal(token: string, id: string) {
    return this.request<FeedSignalDetailResponse>(`/api/feed/${id}`, { token });
  }

  // === Insights ===

  async createInsight(token: string, data: InsightCreate) {
    return this.request<InsightResponse>('/api/insights', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async updateInsight(token: string, id: string, data: InsightUpdate) {
    return this.request<InsightResponse>(`/api/insights/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    });
  }

  async dismissInsight(token: string, id: string) {
    return this.request<void>(`/api/insights/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async flagInsight(token: string, id: string) {
    return this.request<InsightResponse>(`/api/insights/${id}/flag`, {
      method: 'POST',
      token,
    });
  }

  // === Ask (Q&A) ===

  async askQuestion(token: string, question: string, conversationId?: string) {
    return this.request<AskResponse>('/api/ask', {
      method: 'POST',
      body: JSON.stringify({
        question,
        conversation_id: conversationId || null,
      }),
      token,
    });
  }

  async getAskStarters(token: string) {
    return this.request<string[]>('/api/ask/starters', { token });
  }

  async listConversations(token: string) {
    return this.request<AskConversation[]>('/api/ask/conversations', { token });
  }

  async getConversation(token: string, id: string) {
    return this.request<AskConversationDetail>(
      `/api/ask/conversations/${id}`,
      { token }
    );
  }

  // === Export ===

  async exportInsights(token: string) {
    return this.requestText('/api/export/insights', { token });
  }

  async exportInterview(token: string, id: string) {
    return this.requestText(`/api/export/interview/${id}`, { token });
  }

  // === Billing ===

  async getUsage(token: string) {
    return this.request<UsageResponse>('/api/billing/usage', { token });
  }

  async getLimits(token: string) {
    return this.request<LimitsResponse>('/api/billing/limits', { token });
  }

  // === Notifications ===

  async getNotifications(token: string) {
    return this.request<NotificationResponse[]>('/api/notifications', { token });
  }

  async markNotificationRead(token: string, id: string) {
    return this.request<NotificationResponse>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      token,
    });
  }

  // === Demo ===

  async loadSampleData(token: string) {
    return this.request<SampleDataResponse>('/api/demo/load-sample-data', {
      method: 'POST',
      token,
    });
  }
  // === Sources & Integrations ===

  async listDataSources(token: string) {
    return this.request<DataSourceResponse[]>('/api/data-sources', { token });
  }

  async listSourceConnections(token: string) {
    return this.request<SourceConnectionResponse[]>('/api/source-connections', { token });
  }

  async getSourceConnection(token: string, id: string) {
    return this.request<SourceConnectionDetailResponse>(
      `/api/source-connections/${id}`,
      { token }
    );
  }

  async createSourceConnection(token: string, data: SourceConnectionCreate) {
    return this.request<SourceConnectionResponse>('/api/source-connections', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async disconnectSourceConnection(token: string, id: string) {
    return this.request<SourceConnectionResponse>(`/api/source-connections/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async listSyncRuns(token: string, connectionId: string, status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.request<SyncRunResponse[]>(
      `/api/source-connections/${connectionId}/sync-runs${qs}`,
      { token }
    );
  }

  async validateSourceConnection(token: string, connectionId: string) {
    return this.request<SourceConnectionResponse>(
      `/api/source-connections/${connectionId}/validate`,
      { method: 'POST', token }
    );
  }

  async triggerSourceConnectionBackfill(token: string, connectionId: string) {
    return this.request<SyncRunResponse>(
      `/api/source-connections/${connectionId}/backfill`,
      { method: 'POST', token }
    );
  }

  async triggerSourceConnectionSync(token: string, connectionId: string) {
    return this.request<SyncRunResponse>(
      `/api/source-connections/${connectionId}/sync`,
      { method: 'POST', token }
    );
  }

  async validateSurveyCSV(token: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/survey-import/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || `Upload failed (${response.status})`);
    }

    return response.json();
  }

  async confirmSurveyImport(token: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/api/survey-import/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const detail =
        typeof body.detail === 'string'
          ? body.detail
          : body.detail?.message || `Import failed (${response.status})`;
      throw new Error(detail);
    }

    return response.json() as Promise<SurveyImportConfirmResponse>;
  }

  async getSurveyImportHistory(token: string) {
    return this.request<SurveyImportHistoryResponse>('/api/survey-import/history', {
      token,
    });
  }

  async downloadSurveyTemplate(token: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/survey-import/template`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    return response.blob();
  }
}

// === Error class ===

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// === Types ===

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  plan: 'free' | 'pro' | 'business';
  created_at: string;
}

export interface UploadUrlRequest {
  filename: string;
  content_type: string;
  file_size_bytes: number;
}

export interface UploadUrlResponse {
  upload_url: string;
  storage_path: string;
}

export interface InterviewCreate {
  filename: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string;
  file_hash?: string;
}

export interface InterviewResponse {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  status: string;
  duration_seconds?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewDetailResponse extends InterviewResponse {
  transcript?: string;
  metadata_json?: Record<string, unknown>;
  speakers: SpeakerResponse[];
  insights: InsightResponse[];
}

export interface SpeakerResponse {
  id: string;
  interview_id: string;
  speaker_label: string;
  name?: string;
  role?: string;
  company?: string;
  is_interviewer: boolean;
  auto_detected: boolean;
}

export interface SpeakerUpdate {
  name?: string;
  role?: string;
  company?: string;
}

export interface ThemeResponse {
  id: string;
  name: string;
  description?: string;
  mention_count: number;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  is_new: boolean;
  status: string;
  impact_score?: number;
  created_at: string;
}

export interface ThemeChipResponse {
  id: string;
  name: string;
}

export interface SignalLinkResponse {
  kind: 'internal' | 'external';
  href: string;
  label: string;
}

export interface FeedSignalResponse {
  id: string;
  source_type: SourceType;
  source_label: string;
  provider: string;
  provider_label: string;
  signal_kind: string;
  signal_kind_label: string;
  occurred_at: string;
  title?: string;
  excerpt: string;
  author_or_speaker?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  theme_chip?: ThemeChipResponse | null;
  link?: SignalLinkResponse | null;
}

export interface FeedSignalDetailResponse extends FeedSignalResponse {
  content_text?: string;
  metadata_json?: Record<string, unknown> | null;
}

export interface SourceBreakdownResponse {
  source_type: SourceType;
  label: string;
  count: number;
}

export interface SupportingEvidenceGroupResponse {
  source_type: SourceType;
  label: string;
  count: number;
  items: FeedSignalResponse[];
}

export interface ThemeDetailResponse extends ThemeResponse {
  sub_themes: { id: string; name: string }[];
  insights: InsightResponse[];
  source_breakdown: SourceBreakdownResponse[];
  supporting_evidence: SupportingEvidenceGroupResponse[];
}

export interface InsightResponse {
  id: string;
  interview_id: string;
  theme_id?: string;
  category: string;
  title: string;
  quote: string;
  quote_start_index?: number;
  quote_end_index?: number;
  confidence: number;
  is_flagged: boolean;
  is_dismissed: boolean;
  is_manual: boolean;
  theme_suggestion?: string;
  sentiment?: string;
  created_at: string;
}

export interface InsightCreate {
  interview_id: string;
  category: string;
  title: string;
  quote: string;
  quote_start_index?: number;
  quote_end_index?: number;
  theme_id?: string;
}

export interface InsightUpdate {
  category?: string;
  title?: string;
  theme_id?: string;
}

// --- Ask (Q&A) ---

export interface AskResponse {
  answer: string;
  citations: AskCitation[];
  suggested_followups: string[];
  conversation_id: string;
  message_id: string;
}

export interface AskCitation {
  interview_id: string;
  filename: string;
  quote: string;
}

export interface AskConversation {
  id: string;
  title: string;
  created_at: string;
}

export interface AskConversationDetail extends AskConversation {
  messages: AskMessage[];
}

export interface AskMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: AskCitation[];
  created_at: string;
}

// --- Billing ---

export interface UsageResponse {
  month: string;
  interviews_uploaded: number;
  qa_queries_used: number;
  storage_bytes_used: number;
}

export interface LimitsResponse {
  plan: string;
  usage: {
    interviews_uploaded: number;
    qa_queries_used: number;
    storage_bytes_used: number;
  };
  limits: {
    interviews_per_month: number;
    qa_queries_per_month: number;
    storage_bytes: number;
  };
  remaining: {
    interviews: number;
    qa_queries: number;
    storage_bytes: number;
  };
}

// --- Demo ---

export interface SampleDataResponse {
  interviews_created: number;
  insights_discovered: number;
  themes_created: number;
}

// --- Notifications ---

export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// --- Sources & Integrations ---

export type SourceType = 'interview' | 'support' | 'survey' | 'analytics';
export type ConnectionMethod = 'native_upload' | 'api_token' | 'csv_upload' | 'oauth';
export type SourceConnectionStatus =
  | 'configured'
  | 'validating'
  | 'connected'
  | 'syncing'
  | 'error'
  | 'disconnected';
export type SyncRunStatus = 'running' | 'succeeded' | 'failed';

export interface DataSourceResponse {
  id: string;
  source_type: SourceType;
  provider: string;
  display_name: string;
  connection_method: ConnectionMethod;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SourceConnectionResponse {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  status: SourceConnectionStatus;
  last_synced_at?: string;
  last_error_summary?: string;
  created_at: string;
  updated_at: string;
  data_source: DataSourceResponse;
}

export interface SourceConnectionDetailResponse extends SourceConnectionResponse {
  sync_runs: SyncRunResponse[];
}

export interface SourceConnectionCreate {
  data_source_id: string;
  secret_ref?: string;
  config_json?: Record<string, unknown>;
}

export interface SyncRunResponse {
  id: string;
  run_type: string;
  status: SyncRunStatus;
  started_at: string;
  finished_at?: string;
  cursor_in?: Record<string, unknown>;
  cursor_out?: Record<string, unknown>;
  records_seen: number;
  records_created: number;
  records_updated: number;
  error_summary?: string;
  retry_of_run_id?: string;
}

export interface SurveyImportConfirmResponse {
  status: string;
  import_name: string;
  connection_id: string;
  sync_run_id: string;
  records_seen: number;
  records_created: number;
  records_updated: number;
}

export interface SurveyImportHistoryItem {
  id: string;
  connection_id: string;
  import_name: string;
  status: SyncRunStatus;
  started_at?: string;
  finished_at?: string;
  records_seen: number;
  records_created: number;
  records_updated: number;
  error_summary?: string;
}

export interface SurveyImportHistoryResponse {
  imports: SurveyImportHistoryItem[];
}

export interface FeedFilters {
  source?: SourceType;
  sentiment?: 'positive' | 'neutral' | 'negative';
  date_from?: string;
  date_to?: string;
}

// === Singleton export ===

export const api = new ApiClient(API_BASE_URL);

