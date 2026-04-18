// ─── Domain types ────────────────────────────────────────────────────────────

export type AgentStatus   = 'stopped' | 'starting' | 'running' | 'error';
export type ModelProvider = 'claude' | 'openai' | 'ollama' | 'openrouter';
export type ChannelType   = 'telegram' | 'slack' | 'discord' | 'whatsapp';
export type MessageRole   = 'user' | 'assistant';

// ─── API response shapes ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  diskPath: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  modelProvider: ModelProvider;
  modelName: string;
  gatewayPort: number | null;
  soulMd: string;
  toolsMd: string;
  identityMd: string;
  heartbeatMd: string;
  channels: AgentChannel[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentChannel {
  id: string;
  channelType: ChannelType;
  config: Record<string, string>;
  enabled: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface LogLine {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  isBuiltin: boolean;
}

export interface ApiKey {
  id: string;
  provider: string;
  createdAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;        // userId
  email: string;
  workspaceId: string;
}

// ─── DTOs (request bodies) ────────────────────────────────────────────────────

export interface RegisterDto {
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateAgentDto {
  name: string;
  modelProvider: ModelProvider;
  modelName: string;
  soulMd?: string;
  toolsMd?: string;
}

export interface CreateChannelDto {
  channelType: ChannelType;
  config: Record<string, string>;
  enabled?: boolean;
}

export interface UpdateAgentDto {
  name?: string;
  modelProvider?: ModelProvider;
  modelName?: string;
  soulMd?: string;
  toolsMd?: string;
  identityMd?: string;
  heartbeatMd?: string;
}

export interface SendMessageDto {
  message: string;
}

export interface ChatHistoryQuery {
  page?: number;
  limit?: number;
}

export interface SendMessageResponse {
  reply: string;
}

export interface AgentStatusResponse {
  status: AgentStatus;
  gatewayPort: number | null;
}

export interface MemoryResponse {
  content: string;
}
