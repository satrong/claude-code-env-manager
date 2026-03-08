import { ref, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { Store } from '@tauri-apps/plugin-store';
import type { EnvConfig, SettingsFile } from '../types/config';

const configs = ref<EnvConfig[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

const STORE_PATH = 'config-store.bin';
const CONFIGS_KEY = 'configs';

let storeInstance: Store | null = null;

// 加密字段标记
const ENCRYPTED_PREFIX = 'enc:';

function isEncrypted(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

async function encryptValue(value: string): Promise<string> {
  if (!value) return value;
  const encrypted = await invoke<string>('encrypt', { plaintext: value });
  return ENCRYPTED_PREFIX + encrypted;
}

async function decryptValue(value: string): Promise<string> {
  if (!value || !isEncrypted(value)) return value;
  const ciphertext = value.slice(ENCRYPTED_PREFIX.length);
  return await invoke<string>('decrypt', { ciphertext });
}

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_PATH);
  }
  return storeInstance;
}

async function loadConfigsFromStore(): Promise<EnvConfig[]> {
  const store = await getStore();
  const data = await store.get<EnvConfig[]>(CONFIGS_KEY);
  return data || [];
}

async function saveConfigsToStore(configsData: EnvConfig[]): Promise<void> {
  const store = await getStore();
  await store.set(CONFIGS_KEY, configsData);
  await store.save();
}

async function readSettingsFile(): Promise<SettingsFile | null> {
  try {
    const content = await invoke<string>('read_settings');
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to read settings file:', e);
    return null;
  }
}

async function writeSettingsFile(settings: SettingsFile): Promise<void> {
  const content = JSON.stringify(settings, null, 2);
  await invoke('write_settings', { content });
}

// 解密配置中的敏感字段
async function decryptConfig(config: EnvConfig): Promise<EnvConfig> {
  return {
    ...config,
    env: {
      ...config.env,
      ANTHROPIC_AUTH_TOKEN: await decryptValue(config.env.ANTHROPIC_AUTH_TOKEN),
    },
  };
}

// 加密配置中的敏感字段
async function encryptConfig(config: EnvConfig): Promise<EnvConfig> {
  return {
    ...config,
    env: {
      ...config.env,
      ANTHROPIC_AUTH_TOKEN: await encryptValue(config.env.ANTHROPIC_AUTH_TOKEN),
    },
  };
}

export function useConfigStore() {
  const activeConfig = ref<EnvConfig | undefined>(undefined);
  let unlistenSettingsChanged: UnlistenFn | null = null;

  // 从 settings.json 同步启用状态
  async function syncActiveConfigFromSettings(): Promise<void> {
    try {
      const settings = await readSettingsFile();
      if (!settings?.env) return;

      // 查找与当前 settings.json 匹配的配置
      const currentToken = settings.env.ANTHROPIC_AUTH_TOKEN;
      const currentBaseUrl = settings.env.ANTHROPIC_BASE_URL;

      // 更新所有配置的 isActive 状态
      let foundActive = false;
      configs.value = configs.value.map((config) => {
        // 比较解密后的 token 和 baseUrl
        const isMatch =
          config.env.ANTHROPIC_AUTH_TOKEN === currentToken &&
          config.env.ANTHROPIC_BASE_URL === currentBaseUrl;

        if (isMatch) {
          foundActive = true;
          return { ...config, isActive: true };
        }
        return { ...config, isActive: false };
      });

      // 更新 activeConfig
      activeConfig.value = configs.value.find((c) => c.isActive);

      // 同步更新 Store 中的状态
      if (foundActive) {
        const savedConfigs = await loadConfigsFromStore();
        const decryptedConfigs = await Promise.all(savedConfigs.map(decryptConfig));
        const updatedConfigs = decryptedConfigs.map((decrypted) => {
          const isMatch =
            decrypted.env.ANTHROPIC_AUTH_TOKEN === currentToken &&
            decrypted.env.ANTHROPIC_BASE_URL === currentBaseUrl;
          return { ...decrypted, isActive: isMatch };
        });
        await saveConfigsToStore(updatedConfigs);
      }
    } catch (e) {
      console.error('Failed to sync active config from settings:', e);
    }
  }

  async function initialize(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      let savedConfigs = await loadConfigsFromStore();

      if (savedConfigs.length > 0) {
        // 解密所有配置
        configs.value = await Promise.all(savedConfigs.map(decryptConfig));
      } else {
        // 尝试从现有的 settings.json 导入
        try {
          const settings = await readSettingsFile();
          if (settings?.env) {
            const importedConfig: EnvConfig = {
              id: crypto.randomUUID(),
              name: '导入的配置',
              isActive: true,
              env: {
                ANTHROPIC_AUTH_TOKEN: String(settings.env.ANTHROPIC_AUTH_TOKEN || ''),
                ANTHROPIC_BASE_URL: String(settings.env.ANTHROPIC_BASE_URL || ''),
                API_TIMEOUT_MS: settings.env.API_TIMEOUT_MS ? String(settings.env.API_TIMEOUT_MS) : undefined,
                CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: settings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC === 1 ? 1 : settings.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC === 0 ? 0 : undefined,
                CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: settings.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS === 1 ? 1 : settings.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS === 0 ? 0 : undefined,
                ENABLE_TOOL_SEARCH: settings.env.ENABLE_TOOL_SEARCH === 1 ? 1 : settings.env.ENABLE_TOOL_SEARCH === 0 ? 0 : undefined,
                ANTHROPIC_DEFAULT_HAIKU_MODEL: settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL ? String(settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL) : undefined,
                ANTHROPIC_DEFAULT_SONNET_MODEL: settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL ? String(settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL) : undefined,
                ANTHROPIC_DEFAULT_OPUS_MODEL: settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL ? String(settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL) : undefined,
              },
            };

            // 加密后保存
            const encryptedConfig = await encryptConfig(importedConfig);
            await saveConfigsToStore([encryptedConfig]);
            configs.value = [importedConfig];
          }
        } catch (importError) {
          console.log('Import from settings.json failed:', importError);
        }
      }

      // 更新 activeConfig
      activeConfig.value = configs.value.find((c) => c.isActive);

      // 监听 settings.json 变化
      unlistenSettingsChanged = await listen('settings-changed', async () => {
        console.log('settings.json changed, syncing active config...');
        await syncActiveConfigFromSettings();
      });
    } catch (e) {
      error.value = String(e);
    } finally {
      isLoading.value = false;
    }
  }

  // 清理监听器
  onUnmounted(() => {
    if (unlistenSettingsChanged) {
      unlistenSettingsChanged();
      unlistenSettingsChanged = null;
    }
  });

  async function addConfig(config: EnvConfig): Promise<void> {
    const encryptedConfig = await encryptConfig(config);
    const newConfigs = [...configs.value, config];
    await saveConfigsToStore([...await loadConfigsFromStore(), encryptedConfig]);
    configs.value = newConfigs;
  }

  async function updateConfig(id: string, updates: Partial<EnvConfig>): Promise<void> {
    const index = configs.value.findIndex((c) => c.id === id);
    if (index === -1) return;

    const updatedConfig = { ...configs.value[index], ...updates };
    const encryptedConfig = await encryptConfig(updatedConfig);

    const savedConfigs = await loadConfigsFromStore();
    const savedIndex = savedConfigs.findIndex((c) => c.id === id);
    if (savedIndex !== -1) {
      savedConfigs[savedIndex] = encryptedConfig;
      await saveConfigsToStore(savedConfigs);
    }

    configs.value[index] = updatedConfig;

    // 如果更新的是当前激活的配置，同步更新 settings.json
    if (updatedConfig.isActive) {
      try {
        let settings = await readSettingsFile();
        if (!settings) {
          settings = {};
        }
        settings.env = buildSettingsEnv(updatedConfig);
        await writeSettingsFile(settings);
      } catch (e) {
        console.error('Failed to sync settings.json:', e);
      }
    }
  }

  async function deleteConfig(id: string): Promise<void> {
    const savedConfigs = await loadConfigsFromStore();
    const filtered = savedConfigs.filter((c) => c.id !== id);
    await saveConfigsToStore(filtered);
    configs.value = configs.value.filter((c) => c.id !== id);
  }

  // 构建用于 settings.json 的 env 对象
  function buildSettingsEnv(config: EnvConfig): SettingsFile['env'] {
    return {
      ANTHROPIC_AUTH_TOKEN: config.env.ANTHROPIC_AUTH_TOKEN,
      ANTHROPIC_BASE_URL: config.env.ANTHROPIC_BASE_URL,
      ...(config.env.API_TIMEOUT_MS && { API_TIMEOUT_MS: config.env.API_TIMEOUT_MS }),
      ...(config.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC !== undefined && {
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: config.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC,
      }),
      ...(config.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS !== undefined && {
        CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS: config.env.CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS,
      }),
      ...(config.env.ENABLE_TOOL_SEARCH !== undefined && {
        ENABLE_TOOL_SEARCH: config.env.ENABLE_TOOL_SEARCH,
      }),
      ...(config.env.ANTHROPIC_DEFAULT_HAIKU_MODEL && {
        ANTHROPIC_DEFAULT_HAIKU_MODEL: config.env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
      }),
      ...(config.env.ANTHROPIC_DEFAULT_SONNET_MODEL && {
        ANTHROPIC_DEFAULT_SONNET_MODEL: config.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
      }),
      ...(config.env.ANTHROPIC_DEFAULT_OPUS_MODEL && {
        ANTHROPIC_DEFAULT_OPUS_MODEL: config.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
      }),
    };
  }

  async function activateConfig(id: string): Promise<void> {
    const config = configs.value.find((c) => c.id === id);
    if (!config) return;

    // 更新 Store 中的 isActive 状态
    const savedConfigs = await loadConfigsFromStore();
    const newSavedConfigs = savedConfigs.map((c) => ({
      ...c,
      isActive: c.id === id,
    }));
    await saveConfigsToStore(newSavedConfigs);

    // 读取现有 settings.json，只更新 env 字段
    let settings = await readSettingsFile();
    if (!settings) {
      settings = {};
    }

    // 更新 env 字段（使用解密后的 token）
    settings.env = buildSettingsEnv(config);

    await writeSettingsFile(settings);

    // 更新本地状态
    configs.value = configs.value.map((c) => ({
      ...c,
      isActive: c.id === id,
    }));
    activeConfig.value = config;
  }

  return {
    configs,
    isLoading,
    error,
    activeConfig,
    initialize,
    addConfig,
    updateConfig,
    deleteConfig,
    activateConfig,
  };
}
