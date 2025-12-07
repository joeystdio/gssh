# gssh - SSH + Git Author Profile Manager

A cross-platform Node.js CLI tool that manages multiple SSH keys and Git author profiles.

## Features

- **Profile-based SSH key management**: Switch between different SSH identities with a single command
- **Git author configuration**: Automatically set Git user.name and user.email (global or local)
- **Auto-import existing keys**: Automatically detects and offers to import existing SSH keys on first run
- **Public key display**: Easily copy your public key to clipboard for GitHub/GitLab
- **Cross-platform**: Works on macOS, Linux, and Windows (Node.js 18+)

## Installation

### From Source

```bash
cd gssh-node
npm install
npm run build

# Install globally (optional)
npm link
```

### From npm (when published)

```bash
npm install -g gssh
```

## Usage

### List all profiles

```bash
gssh list
```

### Create a new profile

```bash
gssh add myprofile
# Interactive wizard will prompt for Git author name, email, and generate SSH key
```

### Switch to a profile

```bash
# Set Git config globally (default)
gssh use myprofile

# Set Git config locally (current repo only)
gssh use myprofile -l
```

### Show current active profile

```bash
gssh current
```

### Display public key

```bash
gssh pubkey
# Automatically copies to clipboard (macOS/Linux/Windows)
```

### Remove a profile

```bash
gssh remove myprofile
# Safety checks prevent accidental deletion of active profile
```

### Show menu (default)

```bash
gssh
# Shows menu, current profile, and public key
```

## How It Works

### Profile Storage

Profiles are stored in `~/.ssh/profiles/<profile-name>/`:

```
~/.ssh/profiles/
├── work/
│   ├── id_ed25519          # Private key
│   ├── id_ed25519.pub      # Public key
│   └── git_author.txt      # Git author info
└── personal/
    ├── id_ed25519
    ├── id_ed25519.pub
    └── git_author.txt
```

### Active Profile Tracking

Active profile is tracked using two methods:

1. **Marker file** (preferred): `~/.ssh/git-ssh-active.txt`
2. **Public key matching** (fallback): Compares public keys in `~/.ssh/` with profile keys

### Git Author Format

The `git_author.txt` file supports two formats:

**Single line:**
```
John Doe <john@example.com>
```

**Two lines:**
```
John Doe
john@example.com
```

## Technical Details

### Stack

- **TypeScript** with ESM modules
- **commander** - CLI parsing
- **chalk** - Terminal colors
- **execa** - Shell command execution
- **fast-glob** - Directory traversal

### Architecture

```
src/
├── index.ts           # Main entry point
├── cli.ts             # Commander.js setup
├── types.ts           # TypeScript interfaces
├── paths.ts           # Filesystem path management
├── git-author.ts      # Git config management
├── keypair.ts         # SSH key operations
├── utils/
│   ├── clipboard.ts   # Platform-specific clipboard
│   ├── prompts.ts     # Interactive prompts
│   ├── errors.ts      # Error handling
│   └── platform.ts    # Platform detection
└── commands/
    ├── list.ts        # List profiles
    ├── use.ts         # Switch profiles
    ├── add.ts         # Create profiles
    ├── remove.ts      # Delete profiles
    ├── current.ts     # Show active profile
    ├── pubkey.ts      # Display public key
    ├── import.ts      # Auto-import existing keys
    ├── menu.ts        # Default menu
    └── shared.ts      # Shared utilities
```

### File Permissions

On Unix-like systems (macOS, Linux):
- Private keys: `chmod 600` (read-only by owner)
- Public keys: `chmod 644` (readable by all)

On Windows: Relies on NTFS permissions (not explicitly managed)

### Clipboard Support

Platform-specific clipboard commands:
- **macOS**: `pbcopy`
- **Windows**: `clip`
- **Linux**: `xclip`, `xsel`, `wl-copy` (tries multiple)

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode (development)
npm run dev

# Clean build artifacts
npm run clean
```

## Differences from Rust Version

- Uses Node.js native `readline` instead of external prompt libraries
- Uses `execa` for shell commands instead of `std::process::Command`
- Modular file structure vs single-file binary
- Same CLI interface and functionality

## Requirements

- Node.js 18 or higher
- `ssh-keygen` (for generating keys)
- `git` (for setting config)

## License

MIT
