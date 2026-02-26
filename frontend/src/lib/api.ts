/**
 * Spec10x — API Client
 *
 * Centralized HTTP client for the backend API.
 * Automatically attaches Firebase auth tokens to requests.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  // === Demo ===

  async loadSampleData(token: string) {
    return this.request<SampleDataResponse>('/api/demo/load-sample-data', {
      method: 'POST',
      token,
    });
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
  speaker_label: string;
  name?: string;
  role?: string;
  company?: string;
  is_interviewer: boolean;
  auto_detected: boolean;
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
  created_at: string;
}

export interface ThemeDetailResponse extends ThemeResponse {
  sub_themes: { id: string; name: string }[];
  insights: InsightResponse[];
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

// === Singleton export ===

export const api = new ApiClient(API_BASE_URL);
