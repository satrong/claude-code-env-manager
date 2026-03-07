# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri 2 desktop application with a Vue 3 + TypeScript frontend and Rust backend.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (Vite + Tauri)
pnpm tauri dev

# Build for production
pnpm tauri build

# Type check frontend
pnpm build  # runs vue-tsc --noEmit && vite build

# Run Vite dev server only (without Tauri)
pnpm dev
```

## Architecture

### Frontend (Vue 3 + TypeScript)
- Entry point: [src/main.ts](src/main.ts)
- Main component: [src/App.vue](src/App.vue)
- Built with Vite, port 1420

### Backend (Rust + Tauri)
- Entry point: [src-tauri/src/main.rs](src-tauri/src/main.rs)
- Library: [src-tauri/src/lib.rs](src-tauri/src/lib.rs)
- Tauri commands are defined in lib.rs and registered via `invoke_handler`

### Tauri Configuration
- Main config: [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)
- Permissions: [src-tauri/capabilities/default.json](src-tauri/capabilities/default.json)

### Adding Tauri Commands
1. Define command in [src-tauri/src/lib.rs](src-tauri/src/lib.rs) with `#[tauri::command]`
2. Register it in `generate_handler![]` macro
3. Call from frontend using `invoke()` from `@tauri-apps/api/core`
