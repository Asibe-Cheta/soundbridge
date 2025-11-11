const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'apps', 'web');

const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);

const importRegex = /import\s*{([^}]+)}\s*from\s*['"]lucide-react['"];?/gs;

const walk = (dir, files = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') {
        return;
      }
      walk(fullPath, files);
    } else if (exts.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  });
  return files;
};

const transformSpecifiers = (rawSpecifiers) => {
  const updated = rawSpecifiers
    .split(',')
    .map((spec) => spec.trim())
    .filter(Boolean)
    .map((spec) => {
      if (/Icon\s+as/.test(spec)) {
        return spec;
      }

      const aliasMatch = spec.match(/^([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)$/i);

      if (aliasMatch) {
        const [, original, alias] = aliasMatch;
        if (original.endsWith('Icon')) {
          return spec;
        }
        return `${original}Icon as ${alias}`;
      }

      if (spec.endsWith('Icon')) {
        return spec;
      }

      return `${spec}Icon as ${spec}`;
    })
    .join(', ');

  return `import { ${updated} } from 'lucide-react';`;
};

const files = walk(ROOT);

files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  if (!importRegex.test(content)) {
    return;
  }

  const nextContent = content.replace(importRegex, (_, specifiers) => transformSpecifiers(specifiers));

  if (nextContent !== content) {
    fs.writeFileSync(file, nextContent, 'utf8');
    console.log(`Updated ${path.relative(ROOT, file)}`);
  }
});

