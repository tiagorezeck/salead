import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function runDiagnostics() {
  console.log("=== COMET CRM DIAGNOSTICS ===\n");

  // 1. Node Version
  console.log(`1. Node Version: ${process.version}`);

  // 2. Package Manager (Detection)
  const agent = process.env.npm_config_user_agent || '';
  let pm = 'Unknown';
  if (agent.includes('bun')) pm = 'Bun';
  else if (agent.includes('pnpm')) pm = 'pnpm';
  else if (agent.includes('yarn')) pm = 'Yarn';
  else if (agent.includes('npm')) pm = 'npm';
  console.log(`2. Package Manager: ${pm} (${agent || 'No agent found'})\n`);

  // 3. Installed Versions & 4. Physical Paths
  const packages = [
    '@tanstack/react-query',
    '@tanstack/query-core',
    '@tanstack/react-router',
    '@tanstack/react-start'
  ];

  console.log("3 & 4. Installed Packages & Resolved Paths:");
  packages.forEach(pkg => {
    try {
      const pkgPath = require.resolve(`${pkg}/package.json`, { paths: [process.cwd()] });
      const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      console.log(`- ${pkg}: ${pkgJson.version}`);
      console.log(`  Path: ${path.dirname(pkgPath)}`);
    } catch (e) {
      console.log(`- ${pkg}: NOT FOUND`);
    }
  });

  // 5 & 6. Lockfiles
  const lockfiles = ['bun.lock', 'bun.lockb', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'];
  console.log("\n5 & 6. Lockfiles found in root:");
  lockfiles.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      console.log(`[FOUND] ${file}`);
    }
  });

  // 7 & 8. Duplicate Search (query-core)
  console.log("\n7 & 8. Searching for multiple instances of @tanstack/query-core...");
  const searchInNodeModules = (dir: string, results: string[] = []) => {
    if (!fs.existsSync(dir)) return results;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (file === '@tanstack') {
        const subFiles = fs.readdirSync(fullPath);
        if (subFiles.includes('query-core')) {
          results.push(path.join(fullPath, 'query-core'));
        }
      }
      if (file === 'node_modules' || file.startsWith('.')) {
        if (fs.statSync(fullPath).isDirectory()) {
          // Check nested node_modules
          if (file === 'node_modules') {
             searchInNodeModules(fullPath, results);
          }
        }
      }
    }
    return results;
  };

  const foundPaths = searchInNodeModules(path.join(process.cwd(), 'node_modules'));
  
  if (foundPaths.length > 0) {
    console.log(`Found ${foundPaths.length} instances:`);
    foundPaths.forEach(p => {
      try {
        const pj = JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8'));
        console.log(`- Version: ${pj.version} | Path: ${p}`);
      } catch (err) {
        console.log(`- Path: ${p} (could not read package.json)`);
      }
    });
  } else {
    console.log("No instances of @tanstack/query-core found via manual scan.");
  }

  console.log("\n=== DIAGNOSTICS COMPLETE ===");
}

runDiagnostics().catch(console.error);