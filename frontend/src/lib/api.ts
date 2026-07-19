// API Client helper for Next.js frontend

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

function getHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ecomatch_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'An unknown error occurred' };
    }
    const err = new Error(errorData.message || `Request failed with status ${response.status}`);
    (err as any).status = response.status;
    (err as any).code = errorData.code;
    throw err;
  }

  // Handle empty responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  // Auth
  signup: (body: any) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // Submissions
  createSubmission: (body: any) => request('/submissions', { method: 'POST', body: JSON.stringify(body) }),
  getSubmission: (id: string) => request(`/submissions/${id}`),
  getSubmissions: () => request('/submissions'),
  deleteSubmission: (id: string) => request(`/submissions/${id}`, { method: 'DELETE' }),
  findMatch: (submissionId: string) => request(`/submissions/${submissionId}/match`, { method: 'POST' }),

  // Matches
  getMatch: (matchId: string) => request(`/matches/${matchId}`),
  getMatchBySubmission: (submissionId: string) => request(`/matches/submission/${submissionId}`),
  getMatchesForBusiness: (businessId: string) => request(`/matches/business/${businessId}`),
  getMatches: () => request('/matches'),
  draftMessage: (matchId: string) => request(`/matches/${matchId}/draft`, { method: 'POST' }),

  // Outreach (Accept/Reject Match Proposal)
  acceptMatch: (matchId: string) => request(`/outreach/${matchId}/accept`, { method: 'POST' }),
  rejectMatch: (matchId: string) => request(`/outreach/${matchId}/reject`, { method: 'POST' }),

  // Verification
  submitEvidence: (matchId: string, body: { evidenceType: string; evidenceUrl?: string }) => request(`/verification/${matchId}/submit`, { method: 'POST', body: JSON.stringify(body) }),
  confirmVerification: (matchId: string, body?: any) => request(`/verification/${matchId}/confirm`, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  getVerificationRecords: (matchId: string) => request(`/verification/${matchId}`),

  // Uploads
  uploadPhoto: (formData: FormData) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ecomatch_token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(`${BASE_URL}/uploads`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }
      return response.json();
    });
  },

  // Certificates
  getCertificate: (matchId: string) => request(`/certificates/match/${matchId}`),
  issueCertificate: (matchId: string) => request(`/certificates/${matchId}/issue`, { method: 'POST' }),

  // Admin Queue & Monitoring
  getAdminVerifications: () => request('/admin/queue/verifications'),
  getAdminEvents: () => request('/admin/monitoring/events'),
  getAdminHaulers: () => request('/admin/haulers'),
  createAdminHauler: (body: any) => request('/admin/haulers', { method: 'POST', body: JSON.stringify(body) }),
  // User Management
  getBusinessProfile: (businessId: string) => request(`/businesses/${businessId}`),
  updateProfile: (businessId: string, body: any) => request(`/businesses/${businessId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAccount: () => request('/auth/account', { method: 'DELETE' }),
  getAdminBusinesses: () => request('/admin/businesses'),
};



