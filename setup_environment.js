// setup_environment.js
// RuneBeats — Cross-Platform Environment Auto-Detection and Setup Script
//
// Run BEFORE starting the bot: node setup_environment.js
//
// What this script does:
//   1. Detects the runtime OS (Linux, Windows, macOS)
//   2. Checks Node.js version (must be >= 22)
//   3. Verifies node_modules are installed
//   4. Locates yt-dlp and ffmpeg (system PATH or ffmpeg-static package)
//   5. Creates required folder structure (OS-appropriate)
//   6. Validates / creates .env from .env.example
//   7. If any check fails → explains the fix, then waits for "yes" before re-checking
//   8. Writes a full diagnostic log to bot-logs/setup-<timestamp>.log
//
// Manual fix guide (if the script cannot self-heal):
//   - Node.js < 22    : Install from https://nodejs.org (LTS ≥ 22)
//   - Missing modules : Run `npm install` in the project root
//   - yt-dlp missing  :
//       Linux   → sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod +x /usr/local/bin/yt-dlp
//       Windows → winget install yt-dlp.yt-dlp  (or choco install yt-dlp)
//       macOS   → brew install yt-dlp
//   - ffmpeg missing  :
//       Linux   → sudo apt install ffmpeg
//       Windows → choco install ffmpeg  (or winget install ffmpeg)
//       macOS   → brew install ffmpeg
//   - .env missing    : Copy .env.example to .env and fill in DISCORD_TOKEN + CLIENT_ID

import { execFile }                                    from 'child_process';
import { promisify }                                   from 'util';
import { existsSync, mkdirSync, readFileSync,
         writeFileSync, appendFileSync }               from 'fs';
import { join, dirname }                               from 'path';
import { fileURLToPath }                               from 'url';
import { createInterface }                             from 'readline';
import os                                              from 'os';

const execFileAsync = promisify(execFile);
const __dirname     = dirname(fileURLToPath(import.meta.url));

// ─── Log file bootstrap ───────────────────────────────────────────────────────
// Log directory is created first so every subsequent step is captured.

const LOG_DIR  = join(__dirname, 'bot-logs');
const LOG_FILE = join(LOG_DIR, `setup-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

function writeLine(line) {
  // Mirror to stdout and append to file
  console.log(line);
  appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

function log(level, message) {
  const ts   = new Date().toISOString();
  const pad  = level.toUpperCase().padEnd(5);
  writeLine(`[${ts}] [${pad}] ${message}`);
}

const logger = {
  info:  (m) => log('info',  m),
  warn:  (m) => log('warn',  m),
  error: (m) => log('error', m),
  ok:    (m) => log('ok',    m),
  step:  (m) => log('step',  m),
  blank: ()  => writeLine(''),
};

// ─── Step 1: OS Detection ─────────────────────────────────────────────────────

/**
 * Detect runtime OS and log full environment context.
 * @returns {{ os: string, platform: string, arch: string }}
 */
function detectOS() {
  logger.step('─── Step 1: OS Detection ────────────────────────────────────');

  const platform = process.platform; // 'linux' | 'win32' | 'darwin'
  const arch     = process.arch;     // 'x64' | 'arm64' etc.
  const release  = os.release();
  const hostname = os.hostname();
  const cpuModel = os.cpus()?.[0]?.model ?? 'unknown';
  const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);

  logger.info(`  Platform   : ${platform}`);
  logger.info(`  Arch       : ${arch}`);
  logger.info(`  OS Release : ${release}`);
  logger.info(`  Hostname   : ${hostname}`);
  logger.info(`  CPU        : ${cpuModel}`);
  logger.info(`  Total RAM  : ${totalMem} GB`);
  logger.info(`  Node.js    : ${process.version}`);
  logger.info(`  npm        : (run 'npm --version' to check)`);
  logger.info(`  CWD        : ${process.cwd()}`);
  logger.info(`  Script dir : ${__dirname}`);
  logger.info(`  Log file   : ${LOG_FILE}`);

  let osName;
  switch (platform) {
    case 'linux':  osName = 'linux';   logger.ok('OS detected: Linux'); break;
    case 'win32':  osName = 'windows'; logger.ok('OS detected: Windows'); break;
    case 'darwin': osName = 'macos';   logger.ok('OS detected: macOS'); break;
    default:
      osName = 'unknown';
      logger.warn(`Unknown platform '${platform}' — treating as Linux-like.`);
  }

  logger.blank();
  return { os: osName, platform, arch };
}

// ─── Step 2: Node.js Version ──────────────────────────────────────────────────

/**
 * Verify Node.js meets the minimum version requirement (>= 22.0.0).
 * @returns {boolean}
 */
function checkNodeVersion() {
  logger.step('─── Step 2: Node.js Version ─────────────────────────────────');

  const versionString = process.versions.node;
  const [major]       = versionString.split('.').map(Number);
  const REQUIRED      = 22;

  logger.info(`  Required : v${REQUIRED}.x.x or higher`);
  logger.info(`  Current  : v${versionString}`);

  if (major < REQUIRED) {
    logger.error(`  FAIL — Node.js v${REQUIRED}+ required.`);
    logger.error(`  Download: https://nodejs.org (choose LTS >= ${REQUIRED})`);
    logger.blank();
    return false;
  }

  logger.ok(`  Node.js version OK.`);
  logger.blank();
  return true;
}

// ─── Step 3: node_modules Check ───────────────────────────────────────────────

/**
 * Verify npm packages are installed by checking key package.json files.
 * @returns {boolean}
 */
function checkNodeModules() {
  logger.step('─── Step 3: node_modules ────────────────────────────────────');

  const modulesPath = join(__dirname, 'node_modules');
  if (!existsSync(modulesPath)) {
    logger.error(`  node_modules directory not found at: ${modulesPath}`);
    logger.error(`  Fix: Run 'npm install' in ${__dirname}`);
    logger.blank();
    return false;
  }

  // Critical packages the bot cannot run without
  const required = [
    '@discordjs/voice',
    'discord.js',
    'dotenv',
    'ffmpeg-static',
    'ytdl-core',
  ];

  // Optional but expected
  const optional = [
    'soundcloud-downloader',
    'sodium-native',
    'opusscript',
    '@noble/ciphers',
  ];

  let allOk = true;

  for (const pkg of required) {
    // Scoped packages live in node_modules/@scope/name
    const pkgJsonPath = join(modulesPath, ...pkg.split('/'), 'package.json');
    if (!existsSync(pkgJsonPath)) {
      logger.error(`  MISSING (required): ${pkg}`);
      allOk = false;
    } else {
      const meta = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
      logger.ok(`  ${pkg}@${meta.version}`);
    }
  }

  for (const pkg of optional) {
    const pkgJsonPath = join(modulesPath, ...pkg.split('/'), 'package.json');
    if (!existsSync(pkgJsonPath)) {
      logger.warn(`  MISSING (optional): ${pkg}`);
    } else {
      const meta = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
      logger.info(`  ${pkg}@${meta.version} (optional)`);
    }
  }

  if (!allOk) {
    logger.error(`  Fix: Run 'npm install' in ${__dirname}`);
  }

  logger.blank();
  return allOk;
}

// ─── Step 4: External Dependency Checks ───────────────────────────────────────

/**
 * Try running a command and capture its version output.
 * @param {string}   cmd         - command name
 * @param {string[]} versionArgs - arguments that print the version
 * @param {object}   [opts]
 * @param {boolean}  [opts.optional] - if true, failure is a warning not an error
 * @returns {Promise<{ found: boolean, version?: string, path?: string }>}
 */
async function probeCommand(cmd, versionArgs, { optional = false } = {}) {
  try {
    const { stdout } = await execFileAsync(cmd, versionArgs, { timeout: 10_000 });
    const version    = stdout.trim().split('\n')[0].trim();
    return { found: true, version };
  } catch (err) {
    const msg = `  '${cmd}' not found or failed: ${err.message.split('\n')[0]}`;
    optional ? logger.warn(msg) : logger.error(msg);
    return { found: false };
  }
}

/**
 * Detect yt-dlp and ffmpeg; provide OS-specific install instructions on failure.
 * @param {{ os: string }} env
 * @returns {Promise<{ ytdlp: boolean, ffmpeg: boolean, ffmpegPath: string|null }>}
 */
async function checkDependencies(env) {
  logger.step('─── Step 4: External Dependencies ──────────────────────────');

  // ── yt-dlp ──────────────────────────────────────────────────────────────────
  logger.info('  Checking yt-dlp...');
  // On Windows the binary may be yt-dlp.exe but 'yt-dlp' works too in most shells
  const ytdlpResult = await probeCommand('yt-dlp', ['--version']);
  let ytdlpFound    = ytdlpResult.found;

  if (ytdlpFound) {
    logger.ok(`    yt-dlp version: ${ytdlpResult.version}`);
  } else {
    logger.error('    yt-dlp is required for YouTube audio streaming.');
    switch (env.os) {
      case 'linux':
        logger.info('    Install (Linux):');
        logger.info('      sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \\');
        logger.info('           -o /usr/local/bin/yt-dlp && sudo chmod +x /usr/local/bin/yt-dlp');
        break;
      case 'windows':
        logger.info('    Install (Windows):');
        logger.info('      winget install yt-dlp.yt-dlp');
        logger.info('      OR: choco install yt-dlp');
        logger.info('      OR: Download from https://github.com/yt-dlp/yt-dlp/releases');
        break;
      case 'macos':
        logger.info('    Install (macOS): brew install yt-dlp');
        break;
      default:
        logger.info('    Install: https://github.com/yt-dlp/yt-dlp#installation');
    }
  }

  // ── ffmpeg ───────────────────────────────────────────────────────────────────
  logger.info('  Checking ffmpeg...');
  const ffmpegResult  = await probeCommand('ffmpeg', ['-version']);
  let   ffmpegFound   = ffmpegResult.found;
  let   ffmpegPath    = null; // null = use system 'ffmpeg'; string = absolute path
  let   ffmpegHasOpus = false;

  if (ffmpegFound) {
    logger.ok(`    System ffmpeg found: ${ffmpegResult.version.split(',')[0]}`);
    ffmpegPath = 'ffmpeg'; // system PATH

    // Check for libopus encoder — required for Discord audio (OGG/Opus output).
    // ffmpeg-static builds often omit libopus; the system ffmpeg typically includes it.
    try {
      const { stdout } = await execFileAsync('ffmpeg', ['-encoders'], { timeout: 10_000 });
      ffmpegHasOpus = stdout.includes('libopus');
    } catch { /* ignore — ffmpegFound already confirmed the binary works */ }

    if (ffmpegHasOpus) {
      logger.ok('    libopus encoder: available');
    } else {
      logger.warn('    libopus encoder: NOT found in system ffmpeg — audio may fail');
    }
  } else {
    // Try ffmpeg-static npm package as a fallback
    logger.warn('    System ffmpeg not found. Checking ffmpeg-static npm package...');
    try {
      // Dynamic import so this file can run even if ffmpeg-static is missing
      const mod         = await import('ffmpeg-static');
      const staticBin   = mod.default ?? mod;

      if (staticBin && existsSync(String(staticBin))) {
        logger.ok(`    ffmpeg-static found at: ${staticBin}`);
        ffmpegFound = true;
        ffmpegPath  = String(staticBin);
        logger.warn('    Note: ffmpeg-static may lack libopus support. Install system ffmpeg for reliable audio.');
      } else {
        logger.warn(`    ffmpeg-static package found but binary path invalid: ${staticBin}`);
      }
    } catch {
      logger.warn('    ffmpeg-static package not importable.');
    }

    // Check project-bundled static binary (Linux only)
    if (!ffmpegFound && env.os === 'linux') {
      const bundled = join(__dirname, 'ffmpeg-7.0.2-amd64-static', 'ffmpeg');
      if (existsSync(bundled)) {
        logger.ok(`    Bundled Linux static ffmpeg found at: ${bundled}`);
        ffmpegFound = true;
        ffmpegPath  = bundled;
      }
    }

    if (!ffmpegFound) {
      logger.error('    ffmpeg is required for audio transcoding. Install it:');
      switch (env.os) {
        case 'linux':
          logger.info('      sudo apt install ffmpeg         (Debian/Ubuntu)');
          logger.info('      sudo yum install ffmpeg         (RHEL/CentOS)');
          logger.info('      sudo dnf install ffmpeg         (Fedora)');
          break;
        case 'windows':
          logger.info('      choco install ffmpeg');
          logger.info('      OR: winget install ffmpeg');
          logger.info('      OR: https://ffmpeg.org/download.html');
          break;
        case 'macos':
          logger.info('      brew install ffmpeg');
          break;
        default:
          logger.info('      https://ffmpeg.org/download.html');
      }
    }
  }

  logger.blank();
  return { ytdlp: ytdlpFound, ffmpeg: ffmpegFound, ffmpegPath, ffmpegHasOpus };
}

// ─── Step 5: Folder Structure ─────────────────────────────────────────────────

/**
 * Create the required runtime directories.
 * Uses OS-appropriate conventions (hidden .cache on Unix, plain cache on Windows).
 * @param {{ os: string }} env
 */
function createFolderStructure(env) {
  logger.step('─── Step 5: Folder Structure ────────────────────────────────');

  // Directories always needed
  const dirs = [
    join(__dirname, 'bot-logs'),
    join(__dirname, 'bot-logs', 'audio'),
    join(__dirname, 'bot-logs', 'errors'),
  ];

  // OS-specific cache directory
  const cacheDir = (env.os === 'windows')
    ? join(__dirname, 'cache')       // Windows: visible 'cache' folder
    : join(__dirname, '.cache');     // Unix: hidden '.cache' folder

  dirs.push(cacheDir);
  dirs.push(join(cacheDir, 'ytdlp'));  // yt-dlp download cache

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      logger.ok(`  Created  : ${dir}`);
    } else {
      logger.info(`  Exists   : ${dir}`);
    }
  }

  logger.blank();
}

// ─── Step 6: .env Validation ──────────────────────────────────────────────────

/**
 * Validate .env exists and has real values for required keys.
 * Copies .env.example → .env if missing.
 * @returns {boolean} true if all required vars are set to non-placeholder values
 */
function validateEnv() {
  logger.step('─── Step 6: .env Configuration ──────────────────────────────');

  const envPath        = join(__dirname, '.env');
  const envExamplePath = join(__dirname, '.env.example');

  // Auto-create .env from example if missing
  if (!existsSync(envPath)) {
    logger.warn('  .env not found.');
    if (existsSync(envExamplePath)) {
      writeFileSync(envPath, readFileSync(envExamplePath, 'utf8'), 'utf8');
      logger.ok(`  Created .env from .env.example at: ${envPath}`);
      logger.warn('  ACTION REQUIRED: Open .env and fill in DISCORD_TOKEN and CLIENT_ID.');
    } else {
      logger.error(`  Neither .env nor .env.example found in ${__dirname}`);
      logger.error('  Create .env manually with at minimum:');
      logger.error('    DISCORD_TOKEN=your_bot_token');
      logger.error('    CLIENT_ID=your_application_id');
      logger.blank();
      return false;
    }
  }

  // Parse .env manually (without loading into process.env during setup)
  const raw  = readFileSync(envPath, 'utf8');
  const vars = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }

  const PLACEHOLDER_PATTERNS = ['your_', 'change_me', 'placeholder', 'xxx'];

  // Required vars — bot cannot start without these
  const required = ['DISCORD_TOKEN', 'CLIENT_ID'];
  // Optional vars — warn if missing but don't block startup
  const optional = ['SOUNDCLOUD_CLIENT_ID', 'SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'];

  let valid = true;

  logger.info('  Required variables:');
  for (const key of required) {
    const val = vars[key] ?? '';
    const isPlaceholder = !val || PLACEHOLDER_PATTERNS.some(p => val.toLowerCase().includes(p));
    if (isPlaceholder) {
      logger.error(`    ${key.padEnd(24)} MISSING or placeholder — edit .env`);
      valid = false;
    } else {
      // Only show length for security — never log actual token values
      logger.ok(`    ${key.padEnd(24)} set (${val.length} chars)`);
    }
  }

  logger.info('  Optional variables:');
  for (const key of optional) {
    const val = vars[key] ?? '';
    const isPlaceholder = !val || PLACEHOLDER_PATTERNS.some(p => val.toLowerCase().includes(p));
    if (isPlaceholder) {
      logger.warn(`    ${key.padEnd(24)} not set (${key.includes('SOUNDCLOUD') ? 'SoundCloud disabled' : 'Spotify disabled'})`);
    } else {
      logger.ok(`    ${key.padEnd(24)} set`);
    }
  }

  const logLevel = vars['LOG_LEVEL'] ?? 'info';
  logger.info(`  LOG_LEVEL: ${logLevel}`);

  logger.blank();
  return valid;
}

// ─── Step 7: Write Environment Summary ────────────────────────────────────────

/**
 * Write a machine-readable JSON summary of the setup run.
 * @param {{ os: string, platform: string, arch: string }} env
 * @param {{ ytdlp: boolean, ffmpeg: boolean, ffmpegPath: string|null }} deps
 */
function writeEnvSummary(env, deps) {
  const summaryPath = join(LOG_DIR, 'environment-summary.json');
  const summary = {
    timestamp:   new Date().toISOString(),
    os:          env.os,
    platform:    env.platform,
    arch:        env.arch,
    nodeVersion: process.versions.node,
    cwd:         process.cwd(),
    dependencies: {
      ytdlp:      deps.ytdlp,
      ffmpeg:     deps.ffmpeg,
      ffmpegPath: deps.ffmpegPath,
    },
    logFile: LOG_FILE,
    status:  'ready',
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  logger.info(`  Summary written: ${summaryPath}`);
}

// ─── Manual Intervention Prompt ───────────────────────────────────────────────

/**
 * List all issues and wait for the user to confirm they've been fixed.
 * The script then re-runs all checks from the top.
 * @param {string[]} issues - human-readable list of what's broken
 * @returns {Promise<boolean>} true = re-check, false = abort
 */
async function promptManualFix(issues) {
  logger.blank();
  logger.warn('╔══════════════════════════════════════════════════════════╗');
  logger.warn('║           MANUAL INTERVENTION REQUIRED                   ║');
  logger.warn('╚══════════════════════════════════════════════════════════╝');
  logger.blank();
  logger.warn('The following issues must be resolved before the bot can start:');
  for (let i = 0; i < issues.length; i++) {
    logger.warn(`  ${i + 1}. ${issues[i]}`);
  }
  logger.blank();
  logger.warn(`Full diagnostic log: ${LOG_FILE}`);
  logger.blank();
  logger.warn('After resolving the issues above:');
  logger.warn('  → Type "yes" or "y" and press Enter to re-run all checks.');
  logger.warn('  → Type "exit" or "no" to abort setup.');
  logger.blank();

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    const ask = () => {
      rl.question('Ready to re-check? [yes/y/exit]: ', (raw) => {
        const answer = raw.trim().toLowerCase();
        if (answer === 'yes' || answer === 'y') {
          logger.info('Re-running all checks...');
          logger.blank();
          rl.close();
          resolve(true);
        } else if (['exit', 'no', 'n', 'quit', 'q'].includes(answer)) {
          logger.warn('Setup aborted by user.');
          rl.close();
          resolve(false);
        } else {
          logger.warn('  Please type "yes" to continue or "exit" to abort.');
          ask();
        }
      });
    };
    ask();
  });
}

// ─── FFMPEG_PATH .env Patcher ─────────────────────────────────────────────────

/**
 * Write or update FFMPEG_PATH in .env so the bot uses the correct ffmpeg binary.
 * Only runs when system ffmpeg with libopus is confirmed — never overwrites with
 * a value that would downgrade to a binary known to lack libopus.
 * @param {string} value - value to set (e.g. 'ffmpeg' for system PATH)
 */
function patchEnvFfmpegPath(value) {
  const envPath = join(__dirname, '.env');
  if (!existsSync(envPath)) return;

  const raw   = readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  const newLine     = `FFMPEG_PATH=${value}`;
  const existingIdx = lines.findIndex(l => /^FFMPEG_PATH\s*=/.test(l.trim()));

  if (existingIdx !== -1) {
    if (lines[existingIdx].trim() === newLine) {
      logger.info(`  FFMPEG_PATH already set to: ${value}`);
      return;
    }
    const old = lines[existingIdx].trim();
    lines[existingIdx] = newLine;
    logger.ok(`  Updated FFMPEG_PATH in .env: ${old} → ${newLine}`);
  } else {
    // Append after the last non-empty line
    lines.push(newLine);
    logger.ok(`  Added FFMPEG_PATH=${value} to .env`);
  }

  writeFileSync(envPath, lines.join('\n'), 'utf8');
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

async function main() {
  logger.blank();
  logger.info('╔══════════════════════════════════════════════════════════╗');
  logger.info('║        RuneBeats — Environment Setup & Validation        ║');
  logger.info(`║  ${new Date().toISOString()}             ║`);
  logger.info('╚══════════════════════════════════════════════════════════╝');
  logger.blank();

  let attempt = 0;

  // Retry loop: keep re-running all checks until everything passes or user exits
  while (true) {
    attempt++;
    if (attempt > 1) {
      logger.info(`════ Re-check attempt ${attempt} ════`);
      logger.blank();
    }

    const issues = [];

    // Run all steps and collect failures
    const env      = detectOS();
    const nodeOk   = checkNodeVersion();
    const modsOk   = checkNodeModules();
    const deps     = await checkDependencies(env);
    createFolderStructure(env);
    const envOk    = validateEnv();

    // Auto-patch FFMPEG_PATH when system ffmpeg with libopus is confirmed.
    // This ensures the bot skips ffmpeg-static (which often lacks libopus) at runtime.
    if (deps.ffmpegHasOpus) {
      logger.step('─── FFMPEG_PATH Configuration ───────────────────────────────');
      patchEnvFfmpegPath('ffmpeg');
      logger.blank();
    }

    // Collect issues in user-friendly language
    if (!nodeOk) {
      issues.push(`Node.js v22+ required (current: v${process.versions.node}) — https://nodejs.org`);
    }
    if (!modsOk) {
      issues.push(`Run 'npm install' in ${__dirname} to install missing packages`);
    }
    if (!deps.ytdlp) {
      issues.push('yt-dlp not found in PATH — see install instructions in the log above');
    }
    if (!deps.ffmpeg) {
      issues.push('ffmpeg not found (system or ffmpeg-static) — see install instructions in the log above');
    }
    if (!envOk) {
      issues.push(`Fill in DISCORD_TOKEN and CLIENT_ID in ${join(__dirname, '.env')}`);
    }

    // ── Final summary ──────────────────────────────────────────────────────────
    logger.step('─── Setup Summary ───────────────────────────────────────────');
    logger.info(`  Checks passed: ${5 - issues.length}/5`);

    if (issues.length === 0) {
      // All clear
      logger.ok('');
      logger.ok('  ✅ ALL CHECKS PASSED — RuneBeats is ready to launch!');
      logger.blank();
      logger.info(`  Start the bot: npm start`);
      logger.info(`  Deploy commands (first run): npm run deploy`);
      logger.blank();
      writeEnvSummary(env, deps);
      process.exit(0);
    }

    // Something failed — prompt for manual fix
    const shouldRetry = await promptManualFix(issues);
    if (!shouldRetry) {
      logger.error('Setup incomplete. Fix the issues above and re-run: node setup_environment.js');
      process.exit(1);
    }
  }
}

// Catch any unexpected crash and log it before exiting
main().catch((err) => {
  const ts = new Date().toISOString();
  const msg = `[${ts}] [FATAL] Unhandled error in setup script:\n${err.stack}\n`;
  try { appendFileSync(LOG_FILE, msg, 'utf8'); } catch { /* can't log — just print */ }
  console.error(msg);
  process.exit(1);
});
