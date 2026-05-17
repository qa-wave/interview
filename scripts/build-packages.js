#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, execSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const binDir = path.join(distDir, 'bin');
const packageDir = path.join(distDir, 'packages');

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PKG_CACHE_PATH: path.join(distDir, 'pkg-cache')
    },
    ...options
  });
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function createArchive(sourceDir, archivePath) {
  fs.rmSync(archivePath, { force: true });
  run('zip', ['-qr', archivePath, path.basename(sourceDir)], { cwd: path.dirname(sourceDir) });
}

resetDir(binDir);
resetDir(packageDir);

run(path.join(root, 'node_modules', '.bin', 'pkg'), [
  '.',
  '--targets',
  'node24-macos-arm64,node24-macos-x64,node24-win-x64',
  '--out-path',
  binDir
]);

const clientDir = path.join(packageDir, 'books-mock-client');
copyDir(path.join(root, 'client'), clientDir);
copyDir(path.join(root, 'sql'), path.join(clientDir, 'sql'));
createArchive(clientDir, path.join(packageDir, 'books-mock-client.zip'));

const serverPackages = [
  {
    name: 'books-mock-server-macos-arm64',
    sourceBinary: 'books-mock-macos-arm64',
    targetBinary: 'books-mock',
    startScript: 'start-macos.sh',
    startContents: '#!/bin/sh\nDIR="$(cd "$(dirname "$0")" && pwd)"\nPORT="${PORT:-4010}" MOCK_DATA_PATH="${MOCK_DATA_PATH:-$DIR/mocks/books.mock.json}" "$DIR/books-mock" "$@"\n'
  },
  {
    name: 'books-mock-server-macos-x64',
    sourceBinary: 'books-mock-macos-x64',
    targetBinary: 'books-mock',
    startScript: 'start-macos.sh',
    startContents: '#!/bin/sh\nDIR="$(cd "$(dirname "$0")" && pwd)"\nPORT="${PORT:-4010}" MOCK_DATA_PATH="${MOCK_DATA_PATH:-$DIR/mocks/books.mock.json}" "$DIR/books-mock" "$@"\n'
  },
  {
    name: 'books-mock-server-windows-x64',
    sourceBinary: 'books-mock-win-x64.exe',
    targetBinary: 'books-mock.exe',
    startScript: 'start-windows.cmd',
    startContents: '@echo off\r\nset DIR=%~dp0\r\nif "%PORT%"=="" set PORT=4010\r\nif "%MOCK_DATA_PATH%"=="" set MOCK_DATA_PATH=%DIR%mocks\\books.mock.json\r\nstart "" "http://localhost:4010/services"\r\n"%DIR%books-mock.exe" %*\r\n'
  }
];

for (const item of serverPackages) {
  const targetDir = path.join(packageDir, item.name);
  fs.mkdirSync(targetDir, { recursive: true });
  copyDir(path.join(root, 'server'), targetDir);
  fs.copyFileSync(path.join(root, 'README.md'), path.join(targetDir, 'README.md'));
  // openapi.yaml now lives in server/ and is copied by copyDir above.
  fs.copyFileSync(path.join(binDir, item.sourceBinary), path.join(targetDir, item.targetBinary));
  fs.chmodSync(path.join(targetDir, item.targetBinary), 0o755);
  fs.writeFileSync(path.join(targetDir, item.startScript), item.startContents);
  fs.chmodSync(path.join(targetDir, item.startScript), 0o755);
  if (item.name.includes('windows')) {
    fs.copyFileSync(path.join(root, 'scripts', 'setup-windows.bat'), path.join(targetDir, 'setup-windows.bat'));
  }
  createArchive(targetDir, path.join(packageDir, `${item.name}.zip`));
}

console.log(`Packages created in ${packageDir}`);

try {
  execSync('makensis -VERSION', { stdio: 'ignore' });
  const version = require(path.join(root, 'package.json')).version;
  const winSourceDir = path.join(packageDir, 'books-mock-server-windows-x64');
  const installerFile = path.join(packageDir, `books-mock-${version}-setup.exe`);

  run('makensis', [
    `-DPRODUCT_VERSION=${version}`,
    `-DSOURCE_DIR=${winSourceDir}`,
    `-DCLIENT_DIR=${path.join(root, 'client')}`,
    `-DSQL_DIR=${path.join(root, 'sql')}`,
    `-DSETUP_SCRIPT=${path.join(root, 'scripts', 'setup-windows.bat')}`,
    `-DOUT_FILE=${installerFile}`,
    path.join(root, 'scripts', 'installer.nsi')
  ]);

  console.log(`Windows installer created: ${installerFile}`);
} catch {
  console.log('Skipping Windows installer (makensis not found).');
}
