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
    ...options
  });
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyCommonFiles(targetDir) {
  fs.mkdirSync(path.join(targetDir, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'mocks'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'postman'), { recursive: true });
  fs.copyFileSync(path.join(root, 'README.md'), path.join(targetDir, 'README.md'));
  fs.copyFileSync(path.join(root, 'openapi.yaml'), path.join(targetDir, 'openapi.yaml'));
  fs.copyFileSync(path.join(root, 'mocks', 'interview.mock.json'), path.join(targetDir, 'mocks', 'interview.mock.json'));
  fs.copyFileSync(path.join(root, 'docs', 'test-requests.http'), path.join(targetDir, 'docs', 'test-requests.http'));
  fs.copyFileSync(path.join(root, 'docs', 'soap-create-interview.xml'), path.join(targetDir, 'docs', 'soap-create-interview.xml'));
  fs.copyFileSync(path.join(root, 'docs', 'soap-update-status.xml'), path.join(targetDir, 'docs', 'soap-update-status.xml'));
  fs.copyFileSync(
    path.join(root, 'postman', 'interview-mock.postman_collection.json'),
    path.join(targetDir, 'postman', 'interview-mock.postman_collection.json')
  );
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
  'node20-macos-arm64,node20-macos-x64,node20-win-x64',
  '--out-path',
  binDir
]);

const packages = [
  {
    name: 'interview-mock-macos-arm64',
    binary: 'interview-mock-macos-arm64',
    startScript: 'start-macos.sh',
    startContents: '#!/bin/sh\nDIR="$(cd "$(dirname "$0")" && pwd)"\nPORT="${PORT:-4010}" MOCK_DATA_PATH="${MOCK_DATA_PATH:-$DIR/mocks/interview.mock.json}" "$DIR/interview-mock" "$@"\n'
  },
  {
    name: 'interview-mock-macos-x64',
    binary: 'interview-mock-macos-x64',
    startScript: 'start-macos.sh',
    startContents: '#!/bin/sh\nDIR="$(cd "$(dirname "$0")" && pwd)"\nPORT="${PORT:-4010}" MOCK_DATA_PATH="${MOCK_DATA_PATH:-$DIR/mocks/interview.mock.json}" "$DIR/interview-mock" "$@"\n'
  },
  {
    name: 'interview-mock-windows-x64',
    binary: 'interview-mock-win-x64.exe',
    startScript: 'start-windows.cmd',
    startContents: '@echo off\r\nset DIR=%~dp0\r\nif "%PORT%"=="" set PORT=4010\r\nif "%MOCK_DATA_PATH%"=="" set MOCK_DATA_PATH=%DIR%mocks\\interview.mock.json\r\n"%DIR%interview-mock.exe" %*\r\n'
  }
];

for (const item of packages) {
  const targetDir = path.join(packageDir, item.name);
  fs.mkdirSync(targetDir, { recursive: true });
  copyCommonFiles(targetDir);

  const binaryName = item.name.includes('windows') ? 'interview-mock.exe' : 'interview-mock';
  fs.copyFileSync(path.join(binDir, item.binary), path.join(targetDir, binaryName));
  fs.chmodSync(path.join(targetDir, binaryName), 0o755);

  fs.writeFileSync(path.join(targetDir, item.startScript), item.startContents);
  fs.chmodSync(path.join(targetDir, item.startScript), 0o755);

  createArchive(targetDir, path.join(packageDir, `${item.name}.zip`));
}

console.log(`Packages created in ${packageDir}`);

// Build Windows installer (NSIS)
try {
  execSync('makensis -VERSION', { stdio: 'ignore' });

  const version = require(path.join(root, 'package.json')).version;
  const nsiScript = path.join(root, 'scripts', 'installer.nsi');
  const winSourceDir = path.join(packageDir, 'interview-mock-windows-x64');
  const installerFile = path.join(packageDir, `interview-mock-${version}-setup.exe`);

  const soapuiDir = path.join(root, 'soapui');
  const sqlDir = path.join(root, 'sql');
  const docsDir = path.join(root, 'docs');

  run('makensis', [
    `-DPRODUCT_VERSION=${version}`,
    `-DSOURCE_DIR=${winSourceDir}`,
    `-DDOCS_DIR=${docsDir}`,
    `-DSOAPUI_DIR=${soapuiDir}`,
    `-DSQL_DIR=${sqlDir}`,
    `-DOUT_FILE=${installerFile}`,
    nsiScript
  ]);

  console.log(`Windows installer created: ${installerFile}`);
} catch {
  console.log('Skipping Windows installer (makensis not found). Install NSIS: brew install nsis');
}
