# 设计文档：使用 Tauri Store + Rust 加密替代 Stronghold

## 背景

当前应用使用 `tauri-plugin-stronghold` 存储敏感配置数据（如 API Token）。Stronghold 需要用户设置密码来解锁，这增加了使用门槛。

## 目标

1. 移除 Stronghold 依赖，改用 Tauri Store
2. 移除密码解锁机制，应用启动后直接可用
3. 敏感数据仍需加密存储

## 设计决策

### 加密密钥来源

**选择：系统级密钥**

基于机器唯一标识（machine-uid）自动生成加密密钥，无需用户干预。

### 加密范围

**选择：仅敏感字段**

只加密 `ANTHROPIC_AUTH_TOKEN` 等敏感字段，配置名称、URL 等明文存储。

### 数据迁移

**选择：不迁移**

由于移除了密码机制，旧数据无法解密。用户需要重新配置。

### 实现方案

**选择：Rust 后端加解密**

在 Rust 端使用 `machine-uid` + `aes-gcm` 进行加解密，前端通过 Tauri 命令调用。

## 技术方案

### Rust 端

**新增依赖：**
- `tauri-plugin-store` - 持久化存储
- `machine-uid` - 获取机器唯一标识
- `aes-gcm` - AES-GCM 加密算法

**新增命令：**
```rust
#[tauri::command]
fn encrypt(plaintext: String) -> Result<String, String>

#[tauri::command]
fn decrypt(ciphertext: String) -> Result<String, String>
```

**密钥生成：**
```
machine_id = machine_uid::get()
key = SHA256(machine_id + "claude-code-settings")  // 32字节
```

### 前端

**数据结构：**
```typescript
interface EnvConfig {
  id: string;
  name: string;           // 明文
  isActive: boolean;      // 明文
  env: {
    ANTHROPIC_AUTH_TOKEN: string;    // 加密
    ANTHROPIC_BASE_URL?: string;     // 明文
    API_TIMEOUT_MS?: string;         // 明文
    // ... 其他字段明文
  };
}
```

**加密流程：**
1. 保存时：对 `ANTHROPIC_AUTH_TOKEN` 调用 `encrypt` 命令加密
2. 读取时：对加密的 token 调用 `decrypt` 命令解密

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src-tauri/Cargo.toml` | 修改 | 移除 stronghold，添加 store、machine-uid、aes-gcm |
| `src-tauri/src/lib.rs` | 修改 | 移除 stronghold，添加 encrypt/decrypt 命令 |
| `src-tauri/capabilities/default.json` | 修改 | 移除 stronghold 权限，添加 store 权限 |
| `src/components/LockScreen.vue` | 删除 | 不再需要密码锁定 |
| `src/App.vue` | 修改 | 移除锁定逻辑，直接初始化 |
| `src/composables/useConfigStore.ts` | 重写 | 使用 Store + 加密 |
| `package.json` | 修改 | 移除 stronghold 插件，添加 store 插件 |

## 安全考虑

1. **密钥安全**：密钥基于机器 ID 生成，不存储在代码中
2. **加密算法**：使用 AES-256-GCM，提供认证加密
3. **数据绑定**：加密数据与当前设备绑定，无法在其他设备解密
4. **敏感字段隔离**：只加密真正敏感的数据（API Token）

## 用户体验变化

- **之前**：启动应用 → 输入密码 → 解锁 → 使用
- **之后**：启动应用 → 直接使用

## 风险

1. 设备更换后需要重新配置（密钥基于机器 ID）
2. 已有用户需要重新输入 API Token
