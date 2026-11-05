# Contributing to Splorer

Thank you for your interest in contributing to Splorer!

## System Dependencies

Tauri 2 requires platform-specific system libraries. See [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/) for full details.

**macOS**: Xcode Command Line Tools (`xcode-select --install`)

**Ubuntu/Debian**:

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev libayatana-appindicator3-dev librsvg2-dev
```

**Fedora**:

```bash
sudo dnf install webkit2gtk4.1-devel gtk3-devel libsoup3-devel libappindicator-gtk3-devel librsvg2-devel
```

**Arch**:

```bash
sudo pacman -S webkit2gtk-4.1 gtk3 libsoup3 libappindicator-gtk3 librsvg
```

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- Rust (latest stable via `rustup`)
- Git

### Quick Start

```bash
git clone https://github.com/LeOS-GSI/Splorer.git -b next
cd xplorer
pnpm install
pnpm dev
```

This starts the Vite dev server and the Tauri desktop app together. The app will hot-reload on file changes.

### Project Structure

- `apps/client/` — React frontend (components, hooks, pages)
- `apps/src-tauri/` — Rust backend (file operations, Git, search)
- `packages/sdk/` — Internal TypeScript service layer wrapping Tauri IPC
- `packages/extension-sdk/` — Public API for building extensions
- `packages/create-extension/` — CLI to scaffold new extensions
- `packages/extensions/` — Built-in extensions (themes, tools, previews)
- `packages/cli/` — `splorer` command-line launcher
- `scripts/` — Extension signing and utility scripts

### Running Tests

```bash
pnpm test         # Vitest unit tests
pnpm test:tauri   # Rust backend tests
pnpm check        # TypeScript type checking
```

### Building Extensions

```bash
# Create a new extension
npx @xplorer/create-extension my-extension

# Build an existing extension
cd packages/extensions/my-extension
pnpm build
```

## Guidelines

- Write clear commit messages describing the "why", not the "what"
- Add tests for new features when possible
- Follow existing code patterns and conventions
- Keep PRs focused — one feature or fix per PR

## Reporting Issues

- **Bugs**: Open a [GitHub Issue](https://github.com/LeOS-GSI/Splorer/issues)
- **Feature requests**: Start a [Discussion](https://github.com/LeOS-GSI/Splorer/discussions)
- **Security issues**: Email kimlimjustin@gmail.com directly
