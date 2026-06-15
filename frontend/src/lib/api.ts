// Centralized API client for all backend communication.
// Handles auth token injection, error normalization, and base URL config.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: 'An unexpected error occurred',
      }));
      const error: ApiError = {
        message: errorData.message || errorData.error || 'Request failed',
        status: response.status,
        errors: errorData.errors,
      };
      throw error;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ─── Auth ─────────────────────────────────────────────────────
  async register(data: {
    email: string;
    username: string;
    displayName: string;
    password: string;
  }) {
    return this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { login: string; password: string }) {
    return this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<{ user: User }>('/auth/me');
  }

  // ─── Groups ───────────────────────────────────────────────────
  async getGroups() {
    return this.request<{ groups: Group[] }>('/groups');
  }

  async getGroup(id: number) {
    return this.request<{ group: GroupDetail }>(`/groups/${id}`);
  }

  async createGroup(data: { name: string; description?: string; defaultCurrency?: string }) {
    return this.request<{ group: Group }>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addMember(groupId: number, data: { userId: number; joinedAt: string }) {
    return this.request<{ member: GroupMember }>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addMemberByUsername(groupId: number, data: { username: string; joinedAt: string }) {
    return this.request<{ member: GroupMember }>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeMember(groupId: number, userId: number, leftAt?: string) {
    return this.request(`/groups/${groupId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ leftAt: leftAt || new Date().toISOString().split('T')[0] }),
    });
  }

  async promoteMember(groupId: number, userId: number) {
    return this.request(`/groups/${groupId}/members/${userId}/promote`, {
      method: 'PATCH',
    });
  }

  async leaveGroup(groupId: number) {
    return this.request(`/groups/${groupId}/members/me`, {
      method: 'DELETE',
    });
  }

  // ─── Expenses ─────────────────────────────────────────────────
  async getExpenses(groupId: number, params?: {
    page?: number;
    limit?: number;
    paidBy?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.set('groupId', groupId.toString());
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.paidBy) searchParams.set('paidBy', params.paidBy.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    return this.request<{ expenses: Expense[]; total: number }>(`/expenses?${searchParams}`);
  }

  async getExpense(id: number) {
    return this.request<{ expense: Expense }>(`/expenses/${id}`);
  }

  async createExpense(data: CreateExpenseData) {
    return this.request<{ expense: Expense }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpense(id: number, data: Partial<CreateExpenseData>) {
    return this.request<{ expense: Expense }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: number) {
    return this.request(`/expenses/${id}`, { method: 'DELETE' });
  }

  // ─── Balances ─────────────────────────────────────────────────
  async getBalances(groupId: number) {
    return this.request<{ balances: Balance[] }>(`/groups/${groupId}/balances`);
  }

  async getBalanceDetails(groupId: number, userId: number) {
    return this.request<{ details: BalanceDetail[] }>(
      `/groups/${groupId}/balances/${userId}/details`
    );
  }

  async getSimplifiedDebts(groupId: number) {
    return this.request<{ debts: SimplifiedDebt[] }>(`/groups/${groupId}/simplify`);
  }

  // ─── Settlements ─────────────────────────────────────────────
  async getSettlements(groupId: number) {
    return this.request<{ settlements: Settlement[] }>(`/settlements?groupId=${groupId}`);
  }

  async createSettlement(data: {
    groupId: number;
    fromUserId: number;
    toUserId: number;
    amount: number;
    currency?: string;
    settlementDate: string;
    notes?: string;
  }) {
    return this.request<{ settlement: Settlement }>('/settlements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ─── Import ───────────────────────────────────────────────────
  async uploadCSV(groupId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', groupId.toString());

    return this.request<{ session: ImportSession }>('/import/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getImportSession(sessionId: number) {
    return this.request<{ session: ImportSession }>(`/import/${sessionId}`);
  }

  async updateAnomaly(sessionId: number, anomalyId: number, data: {
    userDecision: 'accept' | 'reject' | 'modify';
    correctedData?: Record<string, unknown>;
  }) {
    return this.request(`/import/${sessionId}/anomalies/${anomalyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async confirmImport(sessionId: number) {
    return this.request<{ report: ImportReport }>(`/import/${sessionId}/confirm`, {
      method: 'POST',
    });
  }

  async getImportReport(sessionId: number) {
    return this.request<{ report: ImportReport }>(`/import/${sessionId}/report`);
  }

  // ─── Users (for member search) ────────────────────────────────
  async searchUsers(query: string) {
    return this.request<{ users: User[] }>(`/auth/search?q=${encodeURIComponent(query)}`);
  }

  // ─── Personal Expenses ────────────────────────────────────────
  async getPersonalExpenses(params?: { startDate?: string; endDate?: string; category?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.category) searchParams.set('category', params.category);
    return this.request<{ expenses: PersonalExpense[] }>(`/personal-expenses?${searchParams}`);
  }

  async createPersonalExpense(data: { description: string; amount: number; currency?: string; category?: string; expenseDate: string; notes?: string }) {
    return this.request<{ expense: PersonalExpense }>('/personal-expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePersonalExpense(id: number) {
    return this.request(`/personal-expenses/${id}`, { method: 'DELETE' });
  }

  // ─── Savings Targets ──────────────────────────────────────────
  async getSavingsTargets() {
    return this.request<{ targets: SavingsTarget[] }>('/savings');
  }

  async createSavingsTarget(data: { name: string; targetAmount: number; currency?: string; deadline?: string; color?: string }) {
    return this.request<{ target: SavingsTarget }>('/savings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSavingsTarget(id: number, data: Partial<{ name: string; targetAmount: number; currentAmount: number; deadline: string; color: string }>) {
    return this.request<{ target: SavingsTarget }>(`/savings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSavingsTarget(id: number) {
    return this.request(`/savings/${id}`, { method: 'DELETE' });
  }

  // ─── Analytics ────────────────────────────────────────────────
  async getAnalytics(period?: string) {
    const params = period ? `?period=${period}` : '';
    return this.request<AnalyticsData>(`/analytics${params}`);
  }
}

// ─── Types ──────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  defaultCurrency: string;
  createdById: number;
  createdAt: string;
  _count?: { members: number; expenses: number };
}

export interface GroupMember {
  id: number;
  groupId: number;
  userId: number;
  joinedAt: string;
  leftAt: string | null;
  role: string;
  user: User;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
  createdBy: User;
}

export interface ExpenseSplit {
  id: number;
  expenseId: number;
  userId: number;
  owedAmount: number;
  owedAmountBase: number;
  shareValue?: number;
  percentage?: number;
  user: User;
}

export interface Expense {
  id: number;
  groupId: number;
  paidById: number;
  description: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  expenseDate: string;
  splitType: string;
  category?: string;
  notes?: string;
  isSettlement: boolean;
  importRow?: number;
  createdAt: string;
  paidBy: User;
  splits: ExpenseSplit[];
}

export interface CreateExpenseData {
  groupId: number;
  description: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  expenseDate: string;
  splitType: 'equal' | 'unequal' | 'percentage' | 'share';
  splits: {
    userId: number;
    amount?: number;
    percentage?: number;
    shares?: number;
  }[];
  notes?: string;
  isSettlement?: boolean;
  category?: string;
}

export interface Balance {
  userId: number;
  user: User;
  balance: number;
  totalPaid: number;
  totalOwed: number;
}

export interface BalanceDetail {
  expenseId: number;
  description: string;
  date: string;
  totalAmount: number;
  currency: string;
  exchangeRate: number;
  paidBy: User;
  yourShare: number;
  yourShareBase: number;
  netEffect: number;
}

export interface SimplifiedDebt {
  from: User;
  to: User;
  amount: number;
  currency: string;
}

export interface Settlement {
  id: number;
  groupId: number;
  fromUserId: number;
  toUserId: number;
  amount: number;
  currency: string;
  settlementDate: string;
  notes?: string;
  fromUser: User;
  toUser: User;
  createdAt: string;
}

export interface ImportAnomaly {
  id: number;
  importSessionId: number;
  rowNumber: number;
  anomalyType: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  suggestedAction: string;
  userDecision: 'pending' | 'accept' | 'reject' | 'modify';
  originalData: Record<string, unknown>;
  correctedData?: Record<string, unknown>;
  reviewedAt?: string;
}

export interface ImportSession {
  id: number;
  groupId: number;
  importedById: number;
  filename: string;
  totalRows: number;
  anomalyCount: number;
  importedCount: number;
  skippedCount: number;
  status: 'pending_review' | 'in_review' | 'completed';
  createdAt: string;
  completedAt?: string;
  anomalies: ImportAnomaly[];
}

export interface ImportReport {
  sessionId: number;
  filename: string;
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  anomalies: {
    rowNumber: number;
    type: string;
    severity: string;
    description: string;
    action: string;
  }[];
}

export interface PersonalExpense {
  id: number;
  userId: number;
  description: string;
  amount: number;
  currency: string;
  category: string;
  expenseDate: string;
  notes?: string;
  createdAt: string;
}

export interface SavingsTarget {
  id: number;
  userId: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline?: string;
  color: string;
  createdAt: string;
}

export interface AnalyticsData {
  personal: {
    total: number;
    categoryBreakdown: Record<string, number>;
    count: number;
  };
  group: {
    totalSpending: number;
    totalPaidForOthers: number;
    totalYouOwe: number;
    totalSettledOut: number;
    totalSettledIn: number;
    netBalance: number;
  };
  dailySpending: Record<string, number>;
  savingsTargets: SavingsTarget[];
  summary: {
    totalSpent: number;
    othersOweYou: number;
    youOweOthers: number;
  };
}

// Export singleton instance
const api = new ApiClient();
export default api;
