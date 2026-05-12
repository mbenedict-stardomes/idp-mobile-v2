import { getSessionToken } from './session';
import { getSecureItem } from './secureStorage';
import { getJourneyHeaders } from './journeyTelemetry';

const DEFAULT_BASE_URL =
  'https://idp-kong-gateway-poc-app.jollyforest-2769ae0c.uaenorth.azurecontainerapps.io';

let baseUrl = DEFAULT_BASE_URL;
export function setApiBaseUrl(url: string) {
  baseUrl = url;
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public description: string,
  ) {
    super(description);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Fetch wrapper
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getSessionToken();
  const deviceId = await getSecureItem('DEVICE_ID');
  const journeyHeaders = getJourneyHeaders();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
    ...journeyHeaders,
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({
      error: 'unknown',
      error_description: res.statusText,
    }));
    throw new ApiError(res.status, body.error, body.error_description);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegisterIdentityRequest {
  display_name: string;
  email: string;
  phone: string;
}

export interface IdentityResponse {
  identity_id: string;
  subject_identifier: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  identity_status: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export interface RegisterDeviceRequest {
  session_id: string;
  identity_id: string;
  device_permanent_id: string;
  device_model: string;
  os_type: string;
  os_version: string;
  attestation_response?: {
    id: string;
    rawId: string;
    type: string;
    response: {
      attestationObject: string;
      clientDataJSON: string;
    };
  };
}

export interface DeviceResponse {
  device_id: string;
  identity_id: string;
  device_permanent_id: string;
  device_model: string;
  is_trusted: boolean;
  registered_at: string;
  message?: string;
}

export interface DeviceStatusResponse {
  id: string;
  identity_id: string;
  device_permanent_id: string;
  device_model: string;
  os_type: string;
  os_version: string;
  is_trusted: boolean;
  registered_at: string;
  last_active: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
}

export interface ChallengeItem {
  id: string;
  auth_req_id: string;
  auth_method: string;
  binding_message: string | null;
  transaction_hash: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  client_name?: string;
  amount?: string;
  currency?: string;
  challenge?: string; // Base64URL FIDO2 challenge from backend
}

export interface RegistrationChallengeResponse {
  session_id: string;
  challenge: string;
  timeout: number;
  rp: any;
  user: any;
  pubKeyCredParams: any[];
  attestation: string;
  userVerification: string;
}

export interface HealthResponse {
  status: string;
  database: string;
  version: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

export const api = {
  healthCheck: () => apiFetch<HealthResponse>('/health'),

  registerIdentity: (data: RegisterIdentityRequest) =>
    apiFetch<IdentityResponse>('/v1/app/identity/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getIdentity: (id: string) =>
    apiFetch<IdentityResponse>(`/v1/app/identity/${id}`),

  getRegistrationChallenge: (identityId: string) =>
    apiFetch<RegistrationChallengeResponse>('/v1/app/device/registration-challenge', {
      method: 'POST',
      body: JSON.stringify({ identity_id: identityId }),
    }),

  registerDevice: (data: RegisterDeviceRequest) =>
    apiFetch<DeviceResponse>('/v1/app/device/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDeviceStatus: (id: string) =>
    apiFetch<DeviceStatusResponse>(`/v1/app/device/${id}/status`),

  getPendingChallenges: () =>
    apiFetch<{ challenges: ChallengeItem[] }>('/v1/app/challenge/pending'),

  respondToChallenge: (
    requestId: string,
    body: {
      action: 'APPROVE' | 'DENY';
      denial_reason?: string;
      fido2_assertion?: {
        id: string;
        rawId: string;
        type: string;
        response: {
          clientDataJSON: string;
          authenticatorData: string;
          signature: string;
          userHandle?: string;
        };
      };
    },
  ) =>
    apiFetch<{ request_id: string; status: string; validated_at: string }>(
      `/v1/app/challenge/${requestId}/respond`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  revokeDevice: (deviceId: string, reason: string) =>
    apiFetch<{ device_id: string; revoked_at: string; revocation_reason: string }>(
      `/v1/app/device/${deviceId}/revoke`,
      { method: 'POST', body: JSON.stringify({ reason }) },
    ),
};
