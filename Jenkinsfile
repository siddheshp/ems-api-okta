pipeline {
  agent any
  environment {
    // Set environment variables - UPDATE with your Docker Hub username
    DOCKER_HUB_USERNAME = 'siddheshp'
    IMAGE_NAME = "${DOCKER_HUB_USERNAME}/test-ems-api"
    IMAGE_TAG  = "${env.BUILD_NUMBER}"
  }
  stages {
    stage('Ensure Podman Machine') {
      steps {
        bat 'echo Checking Podman Machine connection…'
        bat 'echo Jenkins build running as user: %USERNAME%'
        bat 'whoami'
        // list machine & connections
        bat 'podman machine list'
        bat 'podman system connection ls'
        // set the correct connection
        bat 'podman system connection default podman-machine1'
        // optionally set rootful if needed
        // bat 'podman machine set podman-machine1 --rootful=true'
        // show info
        bat 'podman info'
      }
    }
    stage('Checkout') {
      steps {
        git url: 'https://github.com/siddheshp/ems-api-okta.git', branch: 'main'
      }
    }
    stage('Install & Test') {
      steps {
        // assume Node.js is installed on agent
        bat 'npm install'
      // bat 'npm test'
      }
    }
    stage('Build API Image') {
      steps {
        script {
          // Build the API image via Podman
          bat "podman build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest -f Dockerfile ."
        }
      }
    }
    stage('Push to Docker Hub') {
      steps {
        script {
          withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', passwordVariable: 'DOCKER_PASSWORD', usernameVariable: 'DOCKER_USERNAME')]) {
            bat 'podman login -u %DOCKER_USERNAME% -p %DOCKER_PASSWORD% docker.io'
            bat "podman push ${IMAGE_NAME}:${IMAGE_TAG}"
            bat "podman push ${IMAGE_NAME}:latest"
          }
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
