#!/usr/bin/env node

/**
 * Splorer CLI
 *
 * Usage:
 *   splorer [folder]              Open a folder in Splorer
 *   splorer create [name]         Scaffold a new extension
 *   splorer --help                Show help
 *   splorer --version             Show version
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const VERSION = '1.0.0';

// ── Helpers ──────────────────────────────────────────────────────────────────

const print = (msg) => process.stdout.write(msg + '\n');
const error = (msg) => {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
};

// ── Commands ─────────────────────────────────────────────────────────────────

const showHelp = () => {
  print(`
Splorer CLI v${VERSION}

Usage:
  splorer [folder]              Open a folder in Splorer app
  splorer .                     Open current directory
  splorer create [name]         Scaffold a new extension
  splorer --help, -h            Show this help
  splorer --version, -v         Show version
`);
};

const openFolder = (folderPath) => {
  const absPath = resolve(folderPath);
  if (!existsSync(absPath)) {
    error(`Path does not exist: ${absPath}`);
  }

  // Try to open with Splorer desktop app
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      execSync(`open -a Splorer "${absPath}"`, { stdio: 'pipe' });
    } else if (platform === 'win32') {
      execSync(`start splorer://"${absPath}"`, { stdio: 'pipe' });
    } else {
      // Linux: try xdg-open with custom protocol, or direct binary
      try {
        execSync(`xdg-open "splorer://${absPath}"`, { stdio: 'pipe' });
      } catch {
        execSync(`splorer "${absPath}"`, { stdio: 'pipe' });
      }
    }
    print(`Opening ${absPath} in Splorer...`);
  } catch {
    error(`Could not open Splorer. Is the app installed?\n  Path: ${absPath}`);
  }
};

const createExtension = (name) => {
  // Delegate to the create-extension package
  try {
    const args = name ? `-- --name "${name}"` : '';
    execSync(`npx @xplorer/create-extension ${args}`, { stdio: 'inherit' });
  } catch {
    // create-extension handles its own errors
  }
};

// ── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const cmd = args[0];

if (!cmd || cmd === '--help' || cmd === '-h') {
  showHelp();
} else if (cmd === '--version' || cmd === '-v') {
  print(`splorer v${VERSION}`);
} else if (cmd === 'create') {
  createExtension(args[1]);
} else {
  // Treat as folder path
  openFolder(cmd);
}
