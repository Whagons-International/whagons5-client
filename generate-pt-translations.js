const fs = require('fs');
const path = require('path');

// Read English translations
const enPath = path.join(__dirname, 'src', 'locales', 'en.ts');
const enContent = fs.readFileSync(enPath, 'utf8');

// Extract all translation keys and values
const regex = /"([^"]+)":\s*"([^"]+)"/g;
const matches = [];
let match;
while ((match = regex.exec(enContent)) !== null) {
  matches.push({ key: match[1], value: match[2] });
}

console.log(`Extracted ${matches.length} translation pairs`);

// Create Portuguese translation file structure
const ptLines = [
  '// Base Portuguese translations',
  '// This file contains common translations used across the application',
  '// Boards-specific translations are merged from boards.ts',
  '',
  'import { boardsTranslationsPT } from \'./boards\';',
  '',
  'export const ptTranslations: Record<string, string> = {',
  '  ...boardsTranslationsPT,',
];

// Add all translations (keeping English values for now - will be translated)
matches.forEach(({ key, value }) => {
  ptLines.push(`  "${key}": "${value}",`);
});

ptLines.push('};');
ptLines.push('');

// Write Portuguese translation file
const ptPath = path.join(__dirname, 'src', 'locales', 'pt.ts');
fs.writeFileSync(ptPath, ptLines.join('\n'), 'utf8');

console.log(`Created ${ptPath} with ${ptLines.length} lines`);
console.log(`Note: Translations are currently in English. Please translate all values to Portuguese.`);
