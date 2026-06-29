const stepDefinitions = ['tests/bdd/steps/**/*.ts'];
const allFeatures = ['tests/bdd/features/**/*.feature'];
const jsonReport = 'json:test-results/cucumber-report.json';
const progressFormat = 'progress-bar';

module.exports = {
  default: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: allFeatures,
    format: [
      progressFormat,
      'html:test-results/cucumber-report.html',
      jsonReport,
      'junit:test-results/cucumber-report.xml',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    parallel: 2,
    dryRun: false,
    strict: true,
    timeout: 30000,
    tags: 'not @fixme',
  },

  smoke: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: allFeatures,
    tags: '@smoke',
    format: [progressFormat, jsonReport],
  },

  exploratory: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: ['tests/bdd/features/exploratory.feature'],
    format: [progressFormat, jsonReport, 'html:test-results/exploratory-report.html'],
  },

  e2e: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: ['tests/bdd/features/bertrand-e2e.feature'],
    format: [progressFormat, jsonReport, 'html:test-results/e2e-report.html'],
    tags: 'not @fixme',
    timeout: 30000,  // 30 seconds per step for E2E tests
  },

  search: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: allFeatures,
    tags: '@search',
    format: [progressFormat, jsonReport, 'html:test-results/search-report.html'],
  },

  cart: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: allFeatures,
    tags: '@cart',
    format: [progressFormat, jsonReport, 'html:test-results/cart-report.html'],
  },

  registration: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: allFeatures,
    tags: '@registration',
    format: [progressFormat, jsonReport, 'html:test-results/registration-report.html'],
  },

  chrome: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: allFeatures,
    tags: '@chrome or not @firefox and not @webkit',
    format: [progressFormat, jsonReport],
  },

  firefox: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: allFeatures,
    tags: '@firefox',
    format: [progressFormat, jsonReport],
  },

  webkit: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: allFeatures,
    tags: '@webkit',
    format: [progressFormat, jsonReport],
  },

  debug: {
    require: stepDefinitions,
    requireModule: ['ts-node/register'],
    paths: allFeatures,
    format: [progressFormat, jsonReport],
    dryRun: false,
    publishQuiet: false,
  },
};
