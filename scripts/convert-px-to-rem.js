const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'frontend');
const EXTENSIONS = new Set(['.html', '.css', '.scss', '.sass', '.ts']);

const EXCLUDED_DIRS = ['node_modules', 'dist', '.git', '.idea'];

function shouldProcess(filePath) {
  const ext = path.extname(filePath);
  return EXTENSIONS.has(ext);
}

function isExcludedDir(dir) {
  return EXCLUDED_DIRS.some(ex => dir.includes(ex));
}

function toRem(px) {
  const rem = px / 16;
  let s = rem.toFixed(4);
  s = s.replace(/\.?0+$/, '');
  if (s === '' || s === '.') s = '0';
  return s + 'rem';
}

function convertLine(line, isCssFile, isTsFile) {
  const original = line;

  // Skip media queries entirely
  if (/\@media\s*\(/.test(line)) {
    return line;
  }

  // Skip lines with runtime template literals that compute px (e.g. `${left}px`)
  if (isTsFile && /\$\{[^}]+\}px/.test(line)) {
    return line;
  }

  // Skip box-shadow, text-shadow, filter blur, backdrop-filter, background-size, letter-spacing, transition
  if (/\b(box-shadow|text-shadow|filter\s*:|backdrop-filter\s*:|background-size\s*:|letter-spacing\s*:|transition\s*:)/.test(line)) {
    return line;
  }

  // Skip border-width declarations in CSS (but NOT border-radius)
  if (isCssFile && /\bborder(-top|-right|-bottom|-left)?\s*:\s*\d/.test(line) && !/border-radius/.test(line)) {
    return line;
  }

  // Skip keyframe transforms in CSS
  if (isCssFile && /\btransform\s*:/.test(line) && /\d+px/.test(line)) {
    return line;
  }

  // For CSS files: convert px values anywhere in the line (with context checks)
  if (isCssFile) {
    // Convert inside calc(...)
    line = line.replace(/calc\(([^)]+)\)/g, (match, inner) => {
      const converted = inner.replace(/(\d+(?:\.\d+)?)px/g, (m, num) => toRem(parseFloat(num)));
      return `calc(${converted})`;
    });

    // Convert inside clamp(...)
    line = line.replace(/clamp\(([^)]+)\)/g, (match, inner) => {
      const converted = inner.replace(/(\d+(?:\.\d+)?)px/g, (m, num) => toRem(parseFloat(num)));
      return `clamp(${converted})`;
    });

    // Convert inside min(...)
    line = line.replace(/min\(([^)]+)\)/g, (match, inner) => {
      const converted = inner.replace(/(\d+(?:\.\d+)?)px/g, (m, num) => toRem(parseFloat(num)));
      return `min(${converted})`;
    });

    // Convert inside max(...)
    line = line.replace(/max\(([^)]+)\)/g, (match, inner) => {
      const converted = inner.replace(/(\d+(?:\.\d+)?)px/g, (m, num) => toRem(parseFloat(num)));
      return `max(${converted})`;
    });

    // General: replace all remaining px values with context checks
    line = line.replace(/(\d+(?:\.\d+)?)px/g, (m, num, offset, string) => {
      // Don't convert 0px
      if (parseFloat(num) === 0) return m;

      const before = string.slice(0, offset);

      // Don't convert inside quoted strings (content: "...")
      const quoteCount = (before.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) return m;

      // Don't convert if this is part of a border property (heuristic)
      if (/(^|;)\s*border(-top|-right|-bottom|-left)?\s*:\s*[^:]*$/.test(before)) {
        return m;
      }

      // Don't convert if part of a transform inside keyframes (rough check)
      if (/\btransform\s*:\s*[^:]*$/.test(before)) {
        return m;
      }

      return toRem(parseFloat(num));
    });

    return line;
  }

  // For HTML / TS template files: convert Tailwind bracket utilities
  const utilities = [
    'text', 'w', 'h', 'min-w', 'max-w', 'min-h', 'max-h',
    'p', 'px', 'py', 'pt', 'pb', 'pl', 'pr',
    'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr',
    'gap', 'gap-x', 'gap-y',
    'inset', 'top', 'left', 'right', 'bottom',
    'rounded', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l', 'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl',
    'space-x', 'space-y',
    'translate-x', 'translate-y',
    'scroll-m', 'scroll-mx', 'scroll-my', 'scroll-mt', 'scroll-mb', 'scroll-ml', 'scroll-mr',
    'scroll-p', 'scroll-px', 'scroll-py', 'scroll-pt', 'scroll-pb', 'scroll-pl', 'scroll-pr',
  ];

  for (const util of utilities) {
    const regex = new RegExp(`\\b${util}-\\[(\\d+(?:\\.\\d+)?)px\\]`, 'g');
    line = line.replace(regex, (m, num) => `${util}-[${toRem(parseFloat(num))}]`);
  }

  // Convert px inside arbitrary values with calc e.g. min-h-[calc(100vh-64px)]
  line = line.replace(/\[([^\]]*calc\([^\]]+\)[^\]]*)\]/g, (match, inner) => {
    const converted = inner.replace(/(\d+(?:\.\d+)?)px/g, (m, num) => toRem(parseFloat(num)));
    return `[${converted}]`;
  });

  // Handle style attributes with px values in HTML/TS templates
  if (!isCssFile) {
    line = line.replace(/style="([^"]*)"/g, (match, styles) => {
      let converted = styles;
      converted = converted.replace(/(\d+(?:\.\d+)?)px/g, (m, num) => {
        if (parseFloat(num) === 0) return m;
        const before = converted.slice(0, converted.indexOf(m));
        if (/border(-top|-right|-bottom|-left)?\s*:\s*\d*$/.test(before)) {
          return m;
        }
        return toRem(parseFloat(num));
      });
      return `style="${converted}"`;
    });
  }

  return line;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath);
  const isCssFile = ext === '.css' || ext === '.scss' || ext === '.sass';
  const isTsFile = ext === '.ts';

  const lines = content.split('\n');
  let changed = false;
  const newLines = lines.map(line => {
    const converted = convertLine(line, isCssFile, isTsFile);
    if (converted !== line) changed = true;
    return converted;
  });

  if (changed) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    console.log('Updated:', filePath.replace(process.cwd(), ''));
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!isExcludedDir(fullPath)) {
        walk(fullPath);
      }
    } else if (shouldProcess(fullPath)) {
      processFile(fullPath);
    }
  }
}

console.log('Starting px -> rem conversion in src/frontend...');
walk(ROOT);
console.log('Done.');
