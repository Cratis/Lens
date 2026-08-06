const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const versionOverride = process.argv[2] || null;
const sourceRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '..', '..');
const distDir = path.join(sourceRoot, 'dist');
const outputDist = path.join(repoRoot, 'dist');
const zipName = versionOverride ? `lens-extension-${versionOverride}.zip` : 'lens-extension.zip';
const zipPath = path.join(outputDist, zipName);

function run(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status);
  }
}

console.log('Building extension...');
run('yarn', ['build'], { cwd: sourceRoot });

if (!fs.existsSync(outputDist)) {
  fs.mkdirSync(outputDist, { recursive: true });
}

if (versionOverride) {
  const manifestPath = path.join(distDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`Expected manifest not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = versionOverride;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Applied version override to dist/manifest.json: ${versionOverride}`);
}

console.log(`Creating package ${zipName} in ${outputDist}...`);
fs.rmSync(zipPath, { force: true });
run('zip', ['-r', zipPath, '.'], { cwd: distDir });

console.log(`Package created at ${zipPath}`);
