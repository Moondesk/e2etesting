def runCommand(String unixCommand, String windowsCommand = null) {
  if (isUnix()) {
    sh unixCommand
  } else {
    bat(windowsCommand ?: unixCommand)
  }
}

pipeline {
 agent any

  tools {
     nodejs 'node26'
  }
  
  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 60, unit: 'MINUTES')
  }

  parameters {
    choice(
      name: 'TEST_COMMAND',
      choices: [
        'npm test',
        'npm run test:e2e',
        'npm run test:cart',
        'npm run test:search',
        'npm run test:exploratory',
        'npm run test:smoke'
      ],
      description: 'Select which test command Jenkins should execute.'
    )
  }

  environment {
    CI = 'true'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        runCommand('npm ci')
      }
    }

    stage('Install Playwright Browsers') {
      steps {
        script {
          if (isUnix()) {
            runCommand('npx playwright install --with-deps')
          } else {
            runCommand('npx playwright install', 'npx playwright install')
          }
        }
      }
    }

    stage('Run Tests') {
      steps {
        script {
          runCommand(params.TEST_COMMAND, params.TEST_COMMAND)
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'artifacts/**/*, test-results/**/*, playwright-report/**/*', allowEmptyArchive: true

      junit testResults: 'test-results/**/*.xml', allowEmptyResults: true

      script {
        try {
          publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: 'test-results',
            reportFiles: 'full_report.html',
            reportName: 'full_report'
          ])
        } catch (err) {
          echo "HTML Publisher plugin not available for full_report: ${err.message}"
        }

        try {
          publishHTML(target: [
            allowMissing: true,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: 'test-results',
            reportFiles: 'cucumber-report.html',
            reportName: 'cucumber-report'
          ])
        } catch (err) {
          echo "HTML Publisher plugin not available for cucumber-report: ${err.message}"
        }
      }
    }
  }
}
