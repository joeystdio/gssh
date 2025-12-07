# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`gssh` is a cross-platform Node.js CLI tool that manages multiple SSH keys and Git author profiles. It's a TypeScript port of an original Rust implementation, allowing users to switch between different SSH identities and Git configurations with single commands.

## Build Commands

```bash
# Build TypeScript to JavaScript (outputs to dist/)
npm run build

# Watch mode for development
npm run dev

# Clean build artifacts
npm run clean

# Test the CLI locally (after building)
npm start

# Install CLI globally for testing
npm link
```

## Architecture

### Core Data Flow

The application uses a profile-based architecture where each profile contains:
- An SSH keypair (private/public keys)
- Git author information (name and email)

**Profile storage:** `~/.ssh/profiles/<profile-name>/`
- `id_ed25519` or `id_rsa` - Private key
- `id_ed25519.pub` or `id_rsa.pub` - Public key
- `git_author.txt` - Git author info in "Name <email>" or two-line format

**Active profile tracking:** `~/.ssh/git-ssh-active.txt` contains the current active profile name. If this marker file doesn't exist, the system falls back to public key matching (compares keys in `~/.ssh/` with profile keys).

### Key Modules

**Paths (`src/paths.ts`)**: Centralizes filesystem paths (SSH directory, profiles directory, active file marker). The `Paths` class is instantiated in most commands and provides consistent path references.

**KeyPair (`src/keypair.ts`)**: Handles SSH key operations. The `KeyPair.resolve()` method detects which key type exists in a profile (preferring ed25519 over RSA). The `copyToSsh()` method copies keys from a profile to the main SSH directory and sets proper Unix permissions (600 for private, 644 for public).

**GitAuthor (`src/git-author.ts`)**: Parses and applies Git author configuration. Supports two file formats: single-line "Name <email>" or two-line (name, then email). The `set()` method uses `git config --global` or `--local` to update user.name and user.email.

**Shared utilities (`src/commands/shared.ts`)**:
- `getProfiles()`: Scans the profiles directory and returns valid profile names
- `getActiveProfileName()`: Checks the marker file first, then falls back to public key matching
- `detectActiveFromPubkey()`: Compares public keys in `~/.ssh/` with all profile public keys to detect which profile is active

### Command Structure

Each command in `src/commands/` is an async function that:
1. Creates a `Paths` instance
2. Calls `paths.ensureDirectories()` to ensure SSH/profile directories exist
3. Performs its specific logic
4. May call `checkAndOfferImport()` on first run to import existing keys

**Import logic (`src/commands/import.ts`)**: On first run (when no profiles exist), `checkAndOfferImport()` detects existing SSH keys in `~/.ssh/` and offers to import them into a new profile. This runs automatically in commands like `list` and `menu`.

### Platform-Specific Behavior

**Clipboard (`src/utils/clipboard.ts`)**: Uses platform-specific commands:
- macOS: `pbcopy`
- Windows: `clip`
- Linux: Tries `xclip`, `xsel`, then `wl-copy` (Wayland)

**File permissions (`src/keypair.ts`)**: On Unix-like systems (macOS, Linux), private keys get `chmod 600` and public keys get `chmod 644`. Windows relies on NTFS permissions and skips chmod operations.

## TypeScript Configuration

- **Target**: ES2022 with ESM modules
- **Strict mode**: Enabled with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
- **Output**: Compiled to `dist/` with source maps and declarations

## Adding New Commands

1. Create a new file in `src/commands/` with an exported async function
2. Import and register it in `src/cli.ts` using Commander.js syntax
3. Use the `Paths` class for consistent directory references
4. Handle errors with `GsshError` for user-friendly messages

## Dependencies

- **commander**: CLI argument parsing and command routing
- **chalk**: Terminal colors and formatting
- **execa**: Shell command execution (used for `git config`, `ssh-keygen`, clipboard commands)
- **fast-glob**: Directory traversal (not heavily used currently)
- **ora**: Spinner animations (imported but not heavily used)

## Important Notes

- The tool prefers ed25519 keys over RSA when multiple keys exist in a profile
- All Git operations use the `execa` library to shell out to the `git` CLI
- SSH key generation shells out to `ssh-keygen` command
- Profile names are validated as directory names (avoid special characters)
- The `use` command copies the entire keypair to `~/.ssh/` and overwrites any existing keys with the same name
