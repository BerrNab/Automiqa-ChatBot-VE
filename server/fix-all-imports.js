import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getAllTsFiles(dir) {
  const files = [];
  try {
    const items = await readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = join(dir, item.name);
      if (item.isDirectory() && item.name !== 'node_modules' && item.name !== 'dist' && item.name !== '.git') {
        files.push(...await getAllTsFiles(fullPath));
      } else if (item.isFile() && item.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
  
  return files;
}

async function fixImports(filePath) {
  let content = await readFile(filePath, 'utf-8');
  let modified = false;
  const originalContent = content;
  
  // Fix relative imports: from "./something" or from "../something" to add .js
  // Match: from "relative/path" or from 'relative/path'
  const importRegex = /from\s+(['"])(\.[^'"]+)(['"])/g;
  
  content = content.replace(importRegex, (match, quote1, importPath, quote2) => {
    // Skip if already has .js extension
    if (importPath.endsWith('.js')) {
      return match;
    }
    
    // Skip if it's a directory import or has other extension
    if (importPath.endsWith('/') || importPath.includes('.json') || importPath.includes('.css')) {
      return match;
    }
    
    modified = true;
    return `from ${quote1}${importPath}.js${quote2}`;
  });
  
  if (modified) {
    await writeFile(filePath, content, 'utf-8');
    console.log(`✓ Fixed: ${filePath}`);
    return true;
  }
  return false;
}

async function main() {
  const serverDir = __dirname;
  console.log(`Scanning ${serverDir} for TypeScript files...\n`);
  
  const tsFiles = await getAllTsFiles(serverDir);
  console.log(`Found ${tsFiles.length} TypeScript files\n`);
  
  let fixedCount = 0;
  for (const file of tsFiles) {
    const fixed = await fixImports(file);
    if (fixed) fixedCount++;
  }
  
  console.log(`\n✓ Done! Fixed ${fixedCount} files`);
}

main().catch(console.error);
