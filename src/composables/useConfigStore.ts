import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { Client, Stronghold } from '@tauri-apps/plugin-stronghold';
import { appLocalDataDir } from '@tauri-apps/api/path';
import type { EnvConfig, SettingsFile } from '../types/config';

const configs = ref<EnvConfig[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

let strongholdInstance: Stronghold | null = null;
let clientInstance: Client | null = null;
const CLIENT_NAME = 'claude-code-settings';
const STORE_KEY = 'configs';

async function initStronghold(password: string): Promise<void> {
  console.log('initStronghold: getting appLocalDataDir');
  const appDir = await appLocalDataDir();
  console.log('initStronghold: appLocalDataDir =', appDir);
  // Ensure proper path joining
  const vaultPath = appDir.endsWith('/') ? `${appDir}vault.hold` : `${appDir}/vault.hold`;
  console.log('initStronghold: vaultPath =', vaultPath);
  console.log('initStronghold: calling Stronghold.load');
  try {
    strongholdInstance = await Stronghold.load(vaultPath, password);
    console.log('initStronghold: Stronghold.load completed');
  } catch (loadError) {
    console.error('initStronghold: Stronghold.load FAILED:', loadError);
    throw loadError;
  }

  try {
    console.log('initStronghold: loading client');
    clientInstance = await strongholdInstance.loadClient(CLIENT_NAME);
    console.log('initStronghold: client loaded');
  } catch (e) {
    console.log('initStronghold: client not found, creating new one, error:', e);
    clientInstance = await strongholdInstance.createClient(CLIENT_NAME);
    console.log('initStronghold: client created');
  }
}

async function loadConfigsFromStronghold(): Promise<EnvConfig[]> {
  if (!clientInstance) return [];

  try {
    const store = clientInstance.getStore();
    const data = await store.get(STORE_KEY);
    if (data) {
      const json = new TextDecoder().decode(new Uint8Array(data));
      return JSON.parse(json);
    }
  } catch (e) {
    console.error('Failed to load configs from Stronghold:', e);
  }
  return [];
}

async function saveConfigsToStronghold(configsData: EnvConfig[]): Promise<void> {
  if (!clientInstance || !strongholdInstance) return;

  const store = clientInstance.getStore();
  const json = JSON.stringify(configsData);
  const data = Array.from(new TextEncoder().encode(json));
  await store.insert(STORE_KEY, data);
  await strongholdInstance.save();
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

export function useConfigStore() {
  const activeConfig = computed(() => configs.value.find((c) => c.isActive));

  async function initialize(password: string): Promise<boolean> {
    console.log('initialize: starting');
    isLoading.value = true;
    error.value = null;

    try {
      console.log('initialize: calling initStronghold');
      await initStronghold(password);
      console.log('initialize: initStronghold completed');
      const savedConfigs = await loadConfigsFromStronghold();
      console.log('initialize: loaded configs, count:', savedConfigs.length);

      if (savedConfigs.length > 0) {
        configs.value = savedConfigs;
      } else {
        // 尝试从现有的 settings.json 导入
        console.log('initialize: no saved configs, trying to import from settings.json');
        try {
          const settings = await readSettingsFile();
          console.log('initialize: readSettingsFile result:', settings ? 'got settings' : 'null');
          if (settings?.env) {
            console.log('initialize: importing config from settings.json');
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
            configs.value = [importedConfig];
            console.log('initialize: saving imported config to stronghold');
            await saveConfigsToStronghold(configs.value);
            console.log('initialize: imported config saved');
          } else {
            console.log('initialize: no settings.env to import');
          }
        } catch (importError) {
          console.log('initialize: import failed:', importError);
          // 继续执行，只是没有导入配置
        }
      }

      console.log('initialize: completed successfully');
      isLoading.value = false;
      return true;
    } catch (e) {
      error.value = String(e);
      isLoading.value = false;
      return false;
    }
  }

  async function addConfig(config: EnvConfig): Promise<void> {
    configs.value.push(config);
    await saveConfigsToStronghold(configs.value);
  }

  async function updateConfig(id: string, updates: Partial<EnvConfig>): Promise<void> {
    const index = configs.value.findIndex((c) => c.id === id);
    if (index !== -1) {
      configs.value[index] = { ...configs.value[index], ...updates };
      await saveConfigsToStronghold(configs.value);
    }
  }

  async function deleteConfig(id: string): Promise<void> {
    configs.value = configs.value.filter((c) => c.id !== id);
    await saveConfigsToStronghold(configs.value);
  }

  async function activateConfig(id: string): Promise<void> {
    const config = configs.value.find((c) => c.id === id);
    if (!config) return;

    // 创建新的配置状态
    const newConfigs = configs.value.map((c) => ({
      ...c,
      isActive: c.id === id,
    }));

    // 先保存到 Stronghold
    await saveConfigsToStronghold(newConfigs);

    // 写入 settings.json
    const settings: SettingsFile = {
      env: {
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
      },
    };

    await writeSettingsFile(settings);

    // 最后更新本地状态
    configs.value = newConfigs;
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
