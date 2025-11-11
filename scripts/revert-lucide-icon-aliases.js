const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'apps', 'web');
const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);

const importRegex = /import\s*{([^}]+)}\s*from\s*['"]lucide-react['"];?/gs;

const walk = (dir, files = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    if (entry.name === 'node_modules' || entry.name === '.next') {
      return;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (exts.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  });
  return files;
};

const transformSpecifiers = (raw) => {
  const result = raw
    .split(',')
    .map((spec) => spec.trim())
    .filter(Boolean)
    .map((spec) => {
      const aliasMatch = spec.match(/^([A-Za-z0-9_]+)Icon\s+as\s+([A-Za-z0-9_]+)$/i);
      if (aliasMatch) {
        const [, base, alias] = aliasMatch;
        return base === alias ? base : `${base} as ${alias}`;
      }

      if (spec.endsWith('Icon')) {
        return spec.slice(0, -4);
      }

      return spec;
    })
    .join(', ');

  return `import { ${result} } from 'lucide-react';`;
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

