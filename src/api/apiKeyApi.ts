/**
 * API client for managing long-lived API keys.
 * 
 * These keys are used for integrating with external services
 * and are distinct from session tokens.
 */

import { api } from './whagonsApi';

export interface ApiKey {
	id: number;
	name: string;
	key?: string; // Only returned on creation
	key_hint?: string; // Last 8 chars of the key for identification
	scopes: string[];
	is_active: boolean;
	expires_at: string | null;
	created_at: string;
	last_used_at: string | null;
}

export interface CreateApiKeyRequest {
	name: string;
	scopes?: string[];
	expires_at?: string | null;
}

export interface UpdateApiKeyRequest {
	name?: string;
	scopes?: string[];
	is_active?: boolean;
	expires_at?: string | null;
}

/**
 * List all API keys for the authenticated user.
 */
export const listApiKeys = async (): Promise<ApiKey[]> => {
	const response = await api.get('/api-keys');
	return response.data.data;
};

/**
 * Create a new API key.
 * 
 * IMPORTANT: The `key` field is only returned on creation.
 * Make sure to show it to the user immediately as it cannot be retrieved later.
 */
export const createApiKey = async (data: CreateApiKeyRequest): Promise<ApiKey> => {
	const response = await api.post('/api-keys', data);
	return response.data.data;
};

/**
 * Update an API key's metadata.
 * 
 * Can update name, scopes, and is_active status.
 * Cannot update or retrieve the actual token value.
 */
export const updateApiKey = async (tokenId: number, data: UpdateApiKeyRequest): Promise<ApiKey> => {
	const response = await api.patch(`/api-keys/${tokenId}`, data);
	return response.data.data;
};

/**
 * Delete (revoke) an API key.
 */
export const deleteApiKey = async (tokenId: number): Promise<void> => {
	await api.delete(`/api-keys/${tokenId}`);
};
