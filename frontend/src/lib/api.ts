import { createClient } from './supabase';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  
  let url = `${API_BASE}/api${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as any),
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Projects API
// ============================================

export const projectsApi = {
  list: (orgId?: string) =>
    fetchApi<{ data: any[] }>('/projects', { params: orgId ? { org_id: orgId } : undefined }),

  get: (id: string) =>
    fetchApi<{ data: any }>(`/projects/${id}`),

  create: (data: { name: string; description?: string; currency?: string; tags?: string[] }) =>
    fetchApi<{ data: any }>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Record<string, any>) =>
    fetchApi<{ data: any }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<{ message: string }>(`/projects/${id}`, { method: 'DELETE' }),
};

// ============================================
// Quotations API
// ============================================

export const quotationsApi = {
  upload: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('file', file);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${API_BASE}/api/quotations/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  },

  process: (quotationId: string) =>
    fetchApi<{ data: any }>(`/quotations/process/${quotationId}`, { method: 'POST' }),

  processAll: (projectId: string) =>
    fetchApi<{ data: any }>(`/quotations/process-all/${projectId}`, { method: 'POST' }),

  getItems: (projectId: string, vendorId?: string) =>
    fetchApi<{ data: any[] }>(`/quotations/items/${projectId}`, {
      params: vendorId ? { vendor_id: vendorId } : undefined,
    }),

  delete: (quotationId: string) =>
    fetchApi<{ message: string }>(`/quotations/${quotationId}`, { method: 'DELETE' }),
};

// ============================================
// Comparison API
// ============================================

export const comparisonApi = {
  generate: (projectId: string) =>
    fetchApi<{ data: any[]; count: number }>(`/comparison/generate/${projectId}`, {
      method: 'POST',
    }),

  get: (projectId: string) =>
    fetchApi<{ data: { results: any[]; vendors: any[] } }>(`/comparison/${projectId}`),

  generateSummary: (projectId: string) =>
    fetchApi<{ data: any }>(`/comparison/summary/${projectId}`, { method: 'POST' }),

  getSummary: (projectId: string) =>
    fetchApi<{ data: any }>(`/comparison/summary/${projectId}`),

  generateNegotiationEmail: (data: {
    vendor_id: string;
    email_type: string;
    context?: string;
  }) =>
    fetchApi<{ data: any }>('/comparison/negotiate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  export: async (projectId: string, format: 'pdf' | 'xlsx', includeSummary = true) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${API_BASE}/api/comparison/export/${projectId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ format, include_summary: includeSummary }),
    });

    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

// ============================================
// Vendors API
// ============================================

export const vendorsApi = {
  getIntelligence: (vendorId: string) =>
    fetchApi<{ data: any }>(`/vendors/${vendorId}/intelligence`),
};
