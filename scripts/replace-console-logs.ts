#!/usr/bin/env npx ts-node

/**
 * Script to replace all console.log/warn/error/info/debug calls with Logger utility.
 * Infers the appropriate category from the file path.
 * 
 * Usage: npx ts-node scripts/replace-console-logs.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT_DIR = path.resolve(__dirname, '..');

// Map file paths/patterns to log categories
function inferCategory(filePath: string): string {
  const relativePath = filePath.replace(ROOT_DIR, '').replace(/^\//, '');
  const lowerPath = relativePath.toLowerCase();

  // Store layer
  if (lowerPath.includes('store/indexeddb') || lowerPath.includes('cache')) return 'cache';
  if (lowerPath.includes('store/realtimelistener') || lowerPath.includes('rtl')) return 'rtl';
  if (lowerPath.includes('store/database') || lowerPath.includes('duckdb')) return 'db';
  if (lowerPath.includes('store/reducers') || lowerPath.includes('slice')) return 'redux';
  if (lowerPath.includes('store/genericslice')) return 'redux';
  if (lowerPath.includes('store/datamanager')) return 'cache';
  if (lowerPath.includes('integrity')) return 'integrity';

  // Features
  if (lowerPath.includes('ai-chat') || lowerPath.includes('assistant')) return 'assistant';
  if (lowerPath.includes('scheduler')) return 'scheduler';
  if (lowerPath.includes('speech') || lowerPath.includes('tts') || lowerPath.includes('voice')) return 'speech';

  // API layer
  if (lowerPath.includes('api/')) return 'api';
  if (lowerPath.includes('firebase') || lowerPath.includes('fcm')) return 'notifications';

  // Auth
  if (lowerPath.includes('auth') || lowerPath.includes('signin') || lowerPath.includes('signup')) return 'auth';
  if (lowerPath.includes('invitation')) return 'invitations';

  // Pages/Features
  if (lowerPath.includes('boards')) return 'boards';
  if (lowerPath.includes('workspace')) return 'workspaces';
  if (lowerPath.includes('task')) return 'tasks';
  if (lowerPath.includes('broadcast')) return 'broadcast';
  if (lowerPath.includes('profile')) return 'profile';
  if (lowerPath.includes('activity')) return 'activity';
  if (lowerPath.includes('settings')) return 'settings';
  if (lowerPath.includes('onboarding')) return 'auth';
  if (lowerPath.includes('kpi')) return 'kpi';
  if (lowerPath.includes('whiteboard')) return 'whiteboard';

  // Providers
  if (lowerPath.includes('authprovider')) return 'auth';
  if (lowerPath.includes('brandingprovider') || lowerPath.includes('branding')) return 'branding';
  if (lowerPath.includes('languageprovider')) return 'ui';

  // Icons
  if (lowerPath.includes('icon')) return 'icons';

  // UI/Components
  if (lowerPath.includes('components/') || lowerPath.includes('pages/')) return 'ui';

  // Utils
  if (lowerPath.includes('confetti') || lowerPath.includes('celebration')) return 'confetti';
  if (lowerPath.includes('font')) return 'ui';

  // Services
  if (lowerPath.includes('service')) return 'api';

  // Sandbox/Dev
  if (lowerPath.includes('sandbox') || lowerPath.includes('scripts/')) return 'ui';

  // Default
  return 'ui';
}

// Map console method to Logger method
function mapConsoleMethod(method: string): string {
  switch (method) {
    case 'log': return 'info';
    case 'info': return 'info';
    case 'warn': return 'warn';
    case 'error': return 'error';
    case 'debug': return 'debug';
    default: return 'info';
  }
}

// Check if file already imports Logger
function hasLoggerImport(content: string): boolean {
  return /import\s+\{[^}]*Logger[^}]*\}\s+from\s+['"]@\/utils\/logger['"]/.test(content) ||
         /import\s+\{\s*Logger\s*\}\s+from\s+['"]@\/utils\/logger['"]/.test(content);
}

// Add Logger import to file
function addLoggerImport(content: string): string {
  // Find the last import statement
  const importRegex = /^import\s+.*?['"];?\s*$/gm;
  let lastImportMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }

  if (lastImportMatch) {
    const insertPos = lastImportMatch.index + lastImportMatch[0].length;
    return content.slice(0, insertPos) + "\nimport { Logger } from '@/utils/logger';" + content.slice(insertPos);
  } else {
    // No imports found, add at the beginning
    return "import { Logger } from '@/utils/logger';\n" + content;
  }
}

// Process a single file
function processFile(filePath: string): { modified: boolean; replacements: number } {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const category = inferCategory(filePath);
  let replacements = 0;

  // Skip the logger file itself
  if (filePath.endsWith('logger.ts')) {
    return { modified: false, replacements: 0 };
  }

  // Regex to match console.log/warn/error/info/debug calls
  // This handles multi-line calls and various argument patterns
  const consoleRegex = /console\.(log|warn|error|info|debug)\s*\(/g;

  // Check if there are any console calls
  if (!consoleRegex.test(content)) {
    return { modified: false, replacements: 0 };
  }

  // Reset regex
  consoleRegex.lastIndex = 0;

  // Replace console calls with Logger calls
  content = content.replace(consoleRegex, (match, method) => {
    replacements++;
    const loggerMethod = mapConsoleMethod(method);
    return `Logger.${loggerMethod}('${category}', `;
  });

  // Add Logger import if not present and we made replacements
  if (replacements > 0 && !hasLoggerImport(content)) {
    content = addLoggerImport(content);
  }

  if (content !== originalContent) {
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    return { modified: true, replacements };
  }

  return { modified: false, replacements: 0 };
}

// Get all TypeScript files recursively
function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and other non-source directories
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      files.push(...getAllTsFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Get all TypeScript files with console logs
function getFilesWithConsoleLogs(): string[] {
  const allFiles = getAllTsFiles(ROOT_DIR);
  const filesWithConsoleLogs: string[] = [];
  
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (/console\.(log|warn|error|info|debug)\s*\(/.test(content)) {
        filesWithConsoleLogs.push(filePath);
      }
    } catch {
      // Skip files that can't be read
    }
  }
  
  return filesWithConsoleLogs;
}

// Main execution
function main() {
  Logger.info('ui', DRY_RUN ? '🔍 DRY RUN MODE - No files will be modified\n' : '🔧 REPLACING CONSOLE LOGS\n');

  const files = getFilesWithConsoleLogs();
  Logger.info('ui', `Found ${files.length} files with console.* calls\n`);

  let totalModified = 0;
  let totalReplacements = 0;
  const results: { file: string; category: string; replacements: number }[] = [];

  for (const filePath of files) {
    const { modified, replacements } = processFile(filePath);
    if (modified) {
      totalModified++;
      totalReplacements += replacements;
      const relativePath = filePath.replace(ROOT_DIR + '/', '');
      const category = inferCategory(filePath);
      results.push({ file: relativePath, category, replacements });
    }
  }

  // Print results grouped by category
  const byCategory = results.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, typeof results>);

  for (const [category, files] of Object.entries(byCategory).sort()) {
    Logger.info('ui', `\n📁 Category: ${category}`);
    for (const f of files) {
      Logger.info('ui', `   ${f.file} (${f.replacements} replacements)`);
    }
  }

  Logger.info('ui', `\n${'='.repeat(60)}`);
  Logger.info('ui', `✅ Modified ${totalModified} files`);
  Logger.info('ui', `✅ Made ${totalReplacements} replacements`);
  
  if (DRY_RUN) {
    Logger.info('ui', '\n⚠️  This was a dry run. Run without --dry-run to apply changes.');
  }
}

main();
