<div align="center">

<img height="120" src="apps/src-tauri/icons/icon.png" alt="Splorer" />

# Splorer

**A modern, privacy-focused file manager built with Rust and React.**

Cross-platform. Local-first. Extensible. One app for all your files.

[![LICENSE](https://img.shields.io/github/license/LeOS-GSI/Splorer.svg?style=flat-square)](https://github.com/LeOS-GSI/Splorer/blob/next/LICENSE) [![Downloads](https://img.shields.io/github/downloads/LeOS-GSI/Splorer/total.svg?style=flat-square)](https://github.com/LeOS-GSI/Splorer/releases) [![Stars]

[Releases](https://github.com/LeOS-GSI/Splorer/releases) | [Discussions](https://t.me/+ccodgiVNqYZkOGQy)

Splorer is a privacy-hardened fork of [Xplorer](https://github.com/kimlimjustin/xplorer) by Justin Maximillian Kimlim, maintained for SnakeOS. No AI, no cloud services, no marketplace, no automatic update checks, no phone-home.

</div>

---

## Why Splorer?

Most file managers haven't changed in decades. Splorer is a ground-up rethink: a Tauri 2 desktop app with a Rust backend for speed and a React frontend for flexibility. It ships with Git integration, a fast local search index, local extensions, and a themeable UI out of the box. Everything runs on your machine.

## Features

<table>
<tr>
<td width="50%">

**File Management**
- 6 view modes: Grid, List, Details, Column, Gallery, Tree
- Hardware-accelerated file operations (memory-mapped I/O, parallel chunked transfers)
- Archive support: ZIP, TAR, GZ, BZ2, XZ with password protection
- Multi-tab browsing, split panes, session persistence

</td>
<td width="50%">

**Local Search**
- Local full-text index (BM25F) with fuzzy matching and stemming
- Natural-language style queries ("large images from last week") parsed locally
- Content search (grep) inside folders
- Nothing leaves your computer

</td>
</tr>
<tr>
<td width="50%">

**Developer Tools**
- Full Git integration: branches, staging, commits, diffs, blame, stash
- Integrated terminal with SSH remote browsing
- Rich file preview: code (syntax highlighted), Markdown, PDF, Word, spreadsheets, audio, video
- Command palette and configurable keyboard shortcuts

</td>
<td width="50%">

**Extensibility**
- Local extensions (install from folder or `.xtension` file)
- Git UI, SSH manager, Docker, code editor, image editor, file hasher, and more
- Themes: Tokyo Night, Dracula, Nord, Cyberpunk, Ocean Deep
- Sandboxed runtime with public SDK — build your own

</td>
</tr>
</table>

## Use Cases

### For Developers
Split-pane file browsing with integrated Git status, terminal, and code editor. Stage commits, view diffs, and manage branches without leaving the file manager.

<img src="images/xplorerfordeveloper.png" alt="Developer workflow with Git integration and terminal" width="100%" />

### For Power Users
Command palette, vim keybindings, custom keyboard shortcuts, and per-folder view settings. Six view modes, smart search with filters, and bulk file operations.

<img src="images/xplorerforpowerusers.png" alt="Command palette and advanced file operations" width="100%" />

## Screenshots

<div align="center">
<table>
<tr>
<td><img src="images/demo1.png" alt="File browsing with split view" width="100%" /></td>
<td><img src="images/demo2.png" alt="Rich file previews" width="100%" /></td>
</tr>
<tr>
<td colspan="2"><img src="images/demo5.png" alt="Git integration" width="100%" /></td>
</tr>
</table>
</div>

## Installation

Download the latest release for your platform from the [Releases page](https://github.com/LeOS-GSI/Splorer/releases).

| Platform | Format |
|---|---|
| Linux | `.deb` / `.AppImage` / '.rpm' |

## Getting Started (Development)

### Prerequisites

- **Node.js** 20+
- **pnpm** 10+
- **Rust** (latest stable via [rustup](https://rustup.rs))

### Setup

```bash
git clone https://github.com/LeOS-GSI/Splorer.git
cd Splorer
pnpm install
pnpm dev
```

This starts the React frontend and Tauri backend. The app window will open automatically.

### Build and Test

```bash
pnpm build              # Production build
pnpm test               # Frontend unit tests (Vitest)
pnpm run test:tauri      # Rust backend tests
```

## Architecture

```
splorer/
├── apps/
│   ├── client/           # React 18 + TypeScript + Vite frontend
│   └── src-tauri/        # Rust backend (Tauri 2, Tokio, Rayon)
├── packages/
│   ├── sdk/              # @xplorer/sdk — internal service layer
│   ├── extension-sdk/    # @xplorer/extension-sdk — public extension API
│   ├── create-extension/ # CLI scaffolder for new extensions
│   ├── cli/              # `splorer` command-line launcher
│   └── extensions/       # Built-in extension packages
├── e2e/                  # Playwright end-to-end tests
└── scripts/              # Extension signing utilities
```

| Layer | Technology |
|---|---|
| Desktop framework | Tauri 2 |
| Backend | Rust (Tokio + Rayon) |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Build tool | Vite |

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines.

- **Bug reports** -- [GitHub Issues](https://github.com/LeOS-GSI/Splorer/issues)
- **Feature requests** -- [Discussions](https://github.com/LeOS-GSI/Splorer/discussions)

## License

[AGPL-3.0](LICENSE)
