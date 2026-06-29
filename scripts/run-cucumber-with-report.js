#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const testResultsDir = path.join(rootDir, 'test-results');
const cucumberJsonPath = path.join(testResultsDir, 'cucumber-report.json');
const generatorPath = path.join(__dirname, 'generate-full-report.js');
const cucumberBinary = process.platform === 'win32'
  ? path.join(rootDir, 'node_modules', '.bin', 'cucumber-js.cmd')
  : path.join(rootDir, 'node_modules', '.bin', 'cucumber-js');

const args = process.argv.slice(2);

fs.mkdirSync(testResultsDir, { recursive: true });
fs.rmSync(cucumberJsonPath, { force: true });

const cucumberRun = spawnSync(cucumberBinary, args, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const generatorRun = spawnSync(process.execPath, [generatorPath, ...args], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    FULL_REPORT_COMMAND: `cucumber-js ${args.join(' ')}`.trim(),
  },
});

if (generatorRun.status !== 0) {
  process.exit(generatorRun.status);
}

process.exit(cucumberRun.status ?? 1);
