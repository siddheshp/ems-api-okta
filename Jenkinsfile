pipeline {
  agent any
  environment {
    // Set environment variables
    IMAGE_NAME = "myorg/nestjs-api"
    IMAGE_TAG  = "${env.BUILD_NUMBER}"
    COMPOSE_FILE = "docker-compose.yml"
  }
  stages {
    stage('Checkout') {
      steps {
        git url: 'https://github.com/siddheshp/ems-api-okta.git', branch: 'main'
      }
    }
    stage('Install & Test') {
      steps {
        // assume Node.js is installed on agent
        bat 'npm install'
        bat 'npm test'
      }
    }
    stage('Build API Image') {
      steps {
        script {
          // Build the API image via Docker
          bat "docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f Dockerfile ."
        }
      }
    }
  }
  post {
    always {
      cleanWs()
    }
  }
}
