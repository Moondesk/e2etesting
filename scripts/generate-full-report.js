#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const featuresDir = path.join(rootDir, 'tests', 'bdd', 'features');
const artifactsDir = path.join(rootDir, 'artifacts');
const testResultsDir = path.join(rootDir, 'test-results');
const cucumberJsonPath = path.join(testResultsDir, 'cucumber-report.json');
const fullReportPath = path.join(testResultsDir, 'full_report.html');

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function getAllFeatureFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const results = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFeatureFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.feature')) {
      results.push(fullPath);
    }
  }

  return results.sort();
}

function parseFeatureCatalog() {
  const files = getAllFeatureFiles(featuresDir);
  const scenarios = [];

  for (const filePath of files) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    let featureName = path.basename(filePath);
    let pendingTags = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return;
      }

      if (trimmed.startsWith('@')) {
        pendingTags = trimmed.split(/\s+/);
        return;
      }

      if (trimmed.startsWith('Feature:')) {
        featureName = trimmed.replace(/^Feature:\s*/, '').trim();
        pendingTags = [];
        return;
      }

      if (trimmed.startsWith('Scenario:')) {
        const scenarioName = trimmed.replace(/^Scenario:\s*/, '').trim();
        scenarios.push({
          key: `${featureName}::${scenarioName}`,
          featureName,
          scenarioName,
          relativePath: normalizePath(path.relative(rootDir, filePath)),
          line: index + 1,
          tags: pendingTags,
        });
        pendingTags = [];
      }
    });
  }

  return scenarios;
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function formatDurationFromNs(durationNs) {
  const totalMs = Math.round((durationNs || 0) / 1e6);
  if (totalMs < 1000) {
    return `${totalMs} ms`;
  }

  const seconds = totalMs / 1000;
  return `${seconds.toFixed(seconds >= 10 ? 1 : 2)} s`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractProfile(args) {
  const profileIndex = args.indexOf('--profile');
  if (profileIndex >= 0 && args[profileIndex + 1]) {
    return args[profileIndex + 1];
  }

  return 'default';
}

function collectScreenshots() {
  if (!fs.existsSync(artifactsDir)) {
    return [];
  }

  return fs.readdirSync(artifactsDir)
    .filter((fileName) => fileName.endsWith('.png'))
    .sort()
    .map((fileName) => ({
      name: fileName,
      absolutePath: path.join(artifactsDir, fileName),
      relativeFromReport: normalizePath(path.relative(testResultsDir, path.join(artifactsDir, fileName))),
    }));
}

function deriveScenarioStatus(steps) {
  const statuses = steps.map((step) => step.result?.status).filter(Boolean);

  if (statuses.some((status) => ['failed', 'ambiguous', 'undefined'].includes(status))) {
    return 'failed';
  }

  if (statuses.some((status) => ['pending'].includes(status))) {
    return 'pending';
  }

  if (statuses.length > 0 && statuses.every((status) => status === 'skipped')) {
    return 'skipped';
  }

  if (statuses.length > 0 && statuses.every((status) => status === 'passed')) {
    return 'passed';
  }

  return statuses[0] || 'unknown';
}

function parseExecutionResults(cucumberJson, screenshots) {
  if (!Array.isArray(cucumberJson)) {
    return [];
  }

  const screenshotMap = new Map(screenshots.map((item) => [path.parse(item.name).name, item]));

  return cucumberJson.flatMap((feature) => {
    const featureName = feature.name || 'Unnamed Feature';
    const featureUri = feature.uri ? normalizePath(path.relative(rootDir, feature.uri)) : '';
    const scenarios = Array.isArray(feature.elements) ? feature.elements : [];

    return scenarios.map((scenario) => {
      const visibleSteps = (scenario.steps || []).filter((step) => !step.hidden);
      const durationNs = visibleSteps.reduce((total, step) => total + (step.result?.duration || 0), 0);
      const validations = visibleSteps
        .filter((step) => step.keyword?.trim() === 'Then' || /^I should\b/i.test(step.name || ''))
        .map((step) => step.name);
      const evidence = visibleSteps
        .map((step) => {
          const match = (step.name || '').match(/I take a screenshot named "([^"]+)"/i);
          return match ? screenshotMap.get(match[1]) : null;
        })
        .filter(Boolean);
      const uniqueEvidence = Array.from(new Map(evidence.map((item) => [item.name, item])).values());

      return {
        key: `${featureName}::${scenario.name}`,
        featureName,
        featureUri,
        scenarioName: scenario.name,
        line: scenario.line,
        tags: (scenario.tags || []).map((tag) => tag.name),
        steps: visibleSteps.map((step) => ({
          keyword: step.keyword?.trim() || '',
          name: step.name || '',
          status: step.result?.status || 'unknown',
          durationNs: step.result?.duration || 0,
          durationLabel: formatDurationFromNs(step.result?.duration || 0),
          location: step.match?.location || '',
        })),
        status: deriveScenarioStatus(visibleSteps),
        durationNs,
        durationLabel: formatDurationFromNs(durationNs),
        validations,
        evidence: uniqueEvidence,
      };
    });
  });
}

function summarizeScenarioStatus(executions) {
  return executions.reduce((summary, execution) => {
    summary[execution.status] = (summary[execution.status] || 0) + 1;
    return summary;
  }, { passed: 0, failed: 0, skipped: 0, pending: 0, unknown: 0 });
}

function buildFeatureCoverage(catalog, executions) {
  const executionKeys = new Set(executions.map((execution) => execution.key));
  const executedByFeature = executions.reduce((map, execution) => {
    const current = map.get(execution.featureName) || [];
    current.push(execution);
    map.set(execution.featureName, current);
    return map;
  }, new Map());

  const catalogByFeature = catalog.reduce((map, item) => {
    const current = map.get(item.featureName) || [];
    current.push(item);
    map.set(item.featureName, current);
    return map;
  }, new Map());

  return Array.from(catalogByFeature.entries()).map(([featureName, scenarios]) => {
    const executed = executedByFeature.get(featureName) || [];
    const executedCount = scenarios.filter((scenario) => executionKeys.has(scenario.key)).length;
    return {
      featureName,
      availableCount: scenarios.length,
      executedCount,
      passedCount: executed.filter((item) => item.status === 'passed').length,
      failedCount: executed.filter((item) => item.status === 'failed').length,
      skippedCount: executed.filter((item) => item.status === 'skipped').length,
    };
  });
}

function getUncoveredScenarios(catalog, executions) {
  const executionKeys = new Set(executions.map((execution) => execution.key));
  return catalog.filter((scenario) => !executionKeys.has(scenario.key));
}

function renderTagChips(tags) {
  if (!tags.length) {
    return '<span class="muted">No tags</span>';
  }

  return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
}

function renderScenarioCards(executions) {
  if (!executions.length) {
    return '<p class="muted">No executed scenarios were found in the current Cucumber JSON report.</p>';
  }

  return executions.map((execution) => {
    const validationsHtml = execution.validations.length
      ? `<ul>${execution.validations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '<p class="muted">No explicit validation steps captured.</p>';

    const evidenceHtml = execution.evidence.length
      ? `<div class="gallery">${execution.evidence.map((item) => `
          <figure>
            <a href="${escapeHtml(item.relativeFromReport)}" target="_blank" rel="noreferrer">
              <img src="${escapeHtml(item.relativeFromReport)}" alt="${escapeHtml(item.name)}" />
            </a>
            <figcaption>${escapeHtml(item.name)}</figcaption>
          </figure>`).join('')}
        </div>`
      : '<p class="muted">No scenario screenshots were linked from executed screenshot steps.</p>';

    const stepsHtml = execution.steps.map((step) => `
      <tr>
        <td>${escapeHtml(step.keyword)}</td>
        <td>${escapeHtml(step.name)}</td>
        <td><span class="status ${escapeHtml(step.status)}">${escapeHtml(step.status)}</span></td>
        <td>${escapeHtml(step.durationLabel)}</td>
      </tr>`).join('');

    return `
      <details class="scenario-card" open>
        <summary>
          <div>
            <strong>${escapeHtml(execution.scenarioName)}</strong>
            <div class="muted">${escapeHtml(execution.featureName)}</div>
          </div>
          <div class="summary-meta">
            <span class="status ${escapeHtml(execution.status)}">${escapeHtml(execution.status)}</span>
            <span>${escapeHtml(execution.durationLabel)}</span>
          </div>
        </summary>
        <div class="scenario-body">
          <div class="meta-grid">
            <div><strong>Feature file:</strong> ${escapeHtml(execution.featureUri || 'N/A')}</div>
            <div><strong>Line:</strong> ${escapeHtml(execution.line || 'N/A')}</div>
            <div><strong>Tags:</strong> ${renderTagChips(execution.tags)}</div>
          </div>
          <h4>Validated behavior</h4>
          ${validationsHtml}
          <h4>Executed steps</h4>
          <table>
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Step</th>
                <th>Status</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>${stepsHtml}</tbody>
          </table>
          <h4>Evidence</h4>
          ${evidenceHtml}
        </div>
      </details>`;
  }).join('');
}

function renderCoverageTable(featureCoverage) {
  return featureCoverage.map((item) => `
    <tr>
      <td>${escapeHtml(item.featureName)}</td>
      <td>${item.availableCount}</td>
      <td>${item.executedCount}</td>
      <td>${item.passedCount}</td>
      <td>${item.failedCount}</td>
      <td>${item.skippedCount}</td>
    </tr>`).join('');
}

function renderUncoveredScenarioList(uncoveredScenarios) {
  if (!uncoveredScenarios.length) {
    return '<p class="success-note">All known BDD scenarios were covered by this run.</p>';
  }

  return `<ul>${uncoveredScenarios.map((scenario) => `
    <li>
      <strong>${escapeHtml(scenario.scenarioName)}</strong>
      <span class="muted">(${escapeHtml(scenario.featureName)} — ${escapeHtml(scenario.relativePath)}:${scenario.line})</span>
    </li>`).join('')}
  </ul>`;
}

function renderArtifactGallery(screenshots) {
  if (!screenshots.length) {
    return '<p class="muted">No screenshots were found in the artifacts directory.</p>';
  }

  return `<div class="gallery">${screenshots.map((item) => `
    <figure>
      <a href="${escapeHtml(item.relativeFromReport)}" target="_blank" rel="noreferrer">
        <img src="${escapeHtml(item.relativeFromReport)}" alt="${escapeHtml(item.name)}" />
      </a>
      <figcaption>${escapeHtml(item.name)}</figcaption>
    </figure>`).join('')}
  </div>`;
}

function buildHtmlReport({ profile, command, catalog, executions, screenshots }) {
  const statusSummary = summarizeScenarioStatus(executions);
  const featureCoverage = buildFeatureCoverage(catalog, executions);
  const uncoveredScenarios = getUncoveredScenarios(catalog, executions);
  const totalAvailableScenarios = catalog.length;
  const executedScenarioCount = executions.length;
  const coveragePercent = totalAvailableScenarios === 0
    ? 0
    : Math.round((executedScenarioCount / totalAvailableScenarios) * 100);
  const validationCount = executions.reduce((total, execution) => total + execution.validations.length, 0);
  const totalDurationNs = executions.reduce((total, execution) => total + execution.durationNs, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Full Execution Report</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f172a;
      --panel: #111827;
      --panel-soft: #1f2937;
      --text: #e5e7eb;
      --muted: #94a3b8;
      --border: #334155;
      --green: #22c55e;
      --red: #ef4444;
      --yellow: #f59e0b;
      --blue: #38bdf8;
    }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    h1, h2, h3, h4 { margin-bottom: 8px; }
    section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .hero {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .hero p { margin: 4px 0; }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }
    .card {
      background: var(--panel-soft);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
    }
    .card .value {
      font-size: 1.8rem;
      font-weight: bold;
    }
    .muted {
      color: var(--muted);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      border-bottom: 1px solid var(--border);
      text-align: left;
      padding: 10px 8px;
      vertical-align: top;
    }
    .status {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status.passed { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .status.failed { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .status.skipped, .status.pending { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .status.unknown { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }
    .tag {
      display: inline-block;
      margin: 0 6px 6px 0;
      padding: 2px 8px;
      background: rgba(56, 189, 248, 0.15);
      color: #bae6fd;
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 999px;
      font-size: 0.8rem;
    }
    .scenario-card {
      background: var(--panel-soft);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .scenario-card summary {
      list-style: none;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      padding: 16px;
    }
    .scenario-card summary::-webkit-details-marker { display: none; }
    .scenario-body { padding: 0 16px 16px; }
    .summary-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    figure {
      margin: 0;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    figure img {
      display: block;
      width: 100%;
      height: 140px;
      object-fit: cover;
      background: #020617;
    }
    figcaption {
      padding: 8px;
      font-size: 0.85rem;
      color: var(--muted);
    }
    .success-note {
      color: #86efac;
      font-weight: bold;
    }
    code {
      background: rgba(148, 163, 184, 0.15);
      padding: 2px 6px;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <main>
    <section>
      <div class="hero">
        <div>
          <h1>Full Execution Report</h1>
          <p class="muted">Detailed Bertrand BDD execution report generated after the latest test run.</p>
        </div>
        <div>
          <p><strong>Generated:</strong> ${escapeHtml(new Date().toLocaleString())}</p>
          <p><strong>Script:</strong> ${escapeHtml(process.env.npm_lifecycle_event || 'direct-run')}</p>
          <p><strong>Profile:</strong> ${escapeHtml(profile)}</p>
          <p><strong>Command:</strong> <code>${escapeHtml(command)}</code></p>
        </div>
      </div>
      <div class="cards">
        <div class="card">
          <div class="muted">Available BDD scenarios</div>
          <div class="value">${totalAvailableScenarios}</div>
        </div>
        <div class="card">
          <div class="muted">Executed scenarios</div>
          <div class="value">${executedScenarioCount}</div>
        </div>
        <div class="card">
          <div class="muted">Coverage</div>
          <div class="value">${coveragePercent}%</div>
        </div>
        <div class="card">
          <div class="muted">Passed</div>
          <div class="value">${statusSummary.passed}</div>
        </div>
        <div class="card">
          <div class="muted">Failed</div>
          <div class="value">${statusSummary.failed}</div>
        </div>
        <div class="card">
          <div class="muted">Skipped / Pending</div>
          <div class="value">${statusSummary.skipped + statusSummary.pending}</div>
        </div>
        <div class="card">
          <div class="muted">Validation checks captured</div>
          <div class="value">${validationCount}</div>
        </div>
        <div class="card">
          <div class="muted">Execution duration</div>
          <div class="value">${escapeHtml(formatDurationFromNs(totalDurationNs))}</div>
        </div>
      </div>
    </section>

    <section>
      <h2>Implementation and scope summary</h2>
      <ul>
        <li>Application under test: <code>https://www.bertrand.pt/</code></li>
        <li>BDD features: <code>tests/bdd/features/</code></li>
        <li>Step definitions: <code>tests/bdd/steps/</code></li>
        <li>Current cart implementation is validated through the right-side sidebar popup, not a separate cart page.</li>
        <li>This report is generated from the Cucumber JSON output and the current feature catalog.</li>
      </ul>
    </section>

    <section>
      <h2>Coverage by feature</h2>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Available scenarios</th>
            <th>Executed</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
          </tr>
        </thead>
        <tbody>
          ${renderCoverageTable(featureCoverage)}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Scenario coverage gaps</h2>
      ${renderUncoveredScenarioList(uncoveredScenarios)}
    </section>

    <section>
      <h2>Detailed executed scenarios</h2>
      ${renderScenarioCards(executions)}
    </section>

    <section>
      <h2>Artifact gallery</h2>
      <p class="muted">Screenshots captured during current and recent executions under <code>artifacts/</code>.</p>
      ${renderArtifactGallery(screenshots)}
    </section>
  </main>
</body>
</html>`;
}

function main() {
  ensureDirectory(testResultsDir);

  const args = process.argv.slice(2);
  const profile = extractProfile(args);
  const command = process.env.FULL_REPORT_COMMAND || `cucumber-js ${args.join(' ')}`.trim();
  const catalog = parseFeatureCatalog();
  const screenshots = collectScreenshots();
  const cucumberJson = readJsonIfExists(cucumberJsonPath);
  const executions = parseExecutionResults(cucumberJson, screenshots);
  const html = buildHtmlReport({ profile, command, catalog, executions, screenshots });

  fs.writeFileSync(fullReportPath, html, 'utf8');
  console.log(`📄 full_report generated: ${normalizePath(path.relative(rootDir, fullReportPath))}`);
}

main();
