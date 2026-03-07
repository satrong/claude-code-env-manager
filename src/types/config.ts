export interface EnvConfig {
  id: string;
  name: string;
  isActive: boolean;
  env: {
    ANTHROPIC_AUTH_TOKEN: string;
    ANTHROPIC_BASE_URL: string;
    API_TIMEOUT_MS?: string;
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC?: 0 | 1;
    CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS?: 0 | 1;
    ENABLE_TOOL_SEARCH?: 0 | 1;
    ANTHROPIC_DEFAULT_HAIKU_MODEL?: string;
    ANTHROPIC_DEFAULT_SONNET_MODEL?: string;
    ANTHROPIC_DEFAULT_OPUS_MODEL?: string;
  };
}

export interface SettingsFile {
  env: Record<string, string | number>;
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  enabledPlugins?: Record<string, boolean>;
  language?: string;
}

export const REQUIRED_FIELDS = ['ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL'] as const;

export const OPTIONAL_TEXT_FIELDS = [
  'API_TIMEOUT_MS',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
] as const;

export const TOGGLE_FIELDS = [
  { key: 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', label: '禁用非必要流量' },
  { key: 'CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS', label: '禁用实验性功能' },
  { key: 'ENABLE_TOOL_SEARCH', label: '启用工具搜索' },
] as const;

export function createEmptyConfig(name: string = '新配置'): EnvConfig {
  return {
    id: crypto.randomUUID(),
    name,
    isActive: false,
    env: {
      ANTHROPIC_AUTH_TOKEN: '',
      ANTHROPIC_BASE_URL: '',
    },
  };
}
