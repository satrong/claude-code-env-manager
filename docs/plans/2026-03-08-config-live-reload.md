# 配置实时生效 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在编辑已激活的配置文件时，保存后自动同步更新 `settings.json`，使配置实时生效。

**Architecture:** 修改 `updateConfig` 函数，当检测到被更新的配置是当前激活状态时，同时调用 `writeSettingsFile` 更新 `settings.json`。提取 `activateConfig` 中更新 settings 的逻辑为独立函数以实现代码复用。

**Tech Stack:** Vue 3 + TypeScript, Tauri Store

---

## 任务概览

| Task | 描述 | 预估 |
|------|------|------|
| 1 | 提取更新 settings.json 的辅助函数 | 5 min |
| 2 | 修改 updateConfig 支持实时生效 | 5 min |
| 3 | 手动测试验证 | 5 min |

---

### Task 1: 提取更新 settings.json 的辅助函数

**Files:**
- Modify: `src/composables/useConfigStore.ts:236-279`

**Step 1: 编写辅助函数**

在 `activateConfig` 函数之前，添加一个新的辅助函数 `buildSettingsEnv`：

```typescript
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
```

**Step 2: 重构 activateConfig 使用辅助函数**

将 `activateConfig` 中构建 `settings.env` 的代码替换为调用辅助函数：

找到第 254-277 行的代码：
```typescript
    // 更新 env 字段（使用解密后的 token）
    settings.env = {
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
```

替换为：
```typescript
    // 更新 env 字段（使用解密后的 token）
    settings.env = buildSettingsEnv(config);
```

**Step 3: 验证重构正确**

运行: `pnpm build`
预期: 构建成功，无类型错误

**Step 4: 提交重构**

```bash
git add src/composables/useConfigStore.ts
git commit -m "refactor: extract buildSettingsEnv helper function"
```

---

### Task 2: 修改 updateConfig 支持实时生效

**Files:**
- Modify: `src/composables/useConfigStore.ts:212-227`

**Step 1: 修改 updateConfig 函数**

找到 `updateConfig` 函数（第 212-227 行），在更新 Store 后添加检查和同步逻辑：

```typescript
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
      let settings = await readSettingsFile();
      if (!settings) {
        settings = {};
      }
      settings.env = buildSettingsEnv(updatedConfig);
      await writeSettingsFile(settings);
    }
  }
```

**Step 2: 验证类型检查**

运行: `pnpm build`
预期: 构建成功，无类型错误

**Step 3: 提交功能**

```bash
git add src/composables/useConfigStore.ts
git commit -m "feat: sync settings.json when updating active config"
```

---

### Task 3: 手动测试验证

**Files:**
- Test: 手动测试

**Step 1: 启动开发服务器**

运行: `pnpm tauri dev`

**Step 2: 测试场景 1 - 更新激活配置的 token**

1. 选择一个已激活的配置
2. 点击编辑
3. 修改 `ANTHROPIC_AUTH_TOKEN` 字段
4. 保存
5. 检查 `~/.claude/settings.json` 中的 `ANTHROPIC_AUTH_TOKEN` 是否已更新

**Step 3: 测试场景 2 - 更新激活配置的可选字段**

1. 选择一个已激活的配置
2. 点击编辑
3. 修改 `API_TIMEOUT_MS` 字段
4. 保存
5. 检查 `~/.claude/settings.json` 中的 `API_TIMEOUT_MS` 是否已更新

**Step 4: 测试场景 3 - 更新非激活配置**

1. 创建一个新配置（不激活）
2. 编辑该配置
3. 修改任意字段
4. 保存
5. 确认 `~/.claude/settings.json` 未被修改

**Step 5: 测试场景 4 - 激活后编辑**

1. 激活一个配置
2. 编辑该配置
3. 修改字段并保存
4. 确认 `settings.json` 已更新

---

## 验收标准

- [ ] 编辑已激活配置时，`settings.json` 自动同步更新
- [ ] 编辑非激活配置时，`settings.json` 不受影响
- [ ] 类型检查通过 (`pnpm build`)
- [ ] 所有测试场景通过
