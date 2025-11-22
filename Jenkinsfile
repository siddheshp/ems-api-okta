pipeline {
  agent any
  environment {
    // Set environment variables - UPDATE with your AWS details
    AWS_REGION = 'us-east-1'  // Change to your AWS region
    AWS_ACCOUNT_ID = '797721580785'  // Change to your AWS account ID
    ECR_REPOSITORY = 'test-ems-api'  // Change to your ECR repository name
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    IMAGE_NAME = "${ECR_REGISTRY}/${ECR_REPOSITORY}"
  }
  stages {
    stage('Ensure Podman Machine') {
      steps {
        bat 'whoami'
        bat 'podman system connection ls'
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
    stage('Push to AWS ECR') {
      steps {
        script {
          withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-credentials']]) {
            // debug: show which AWS identity and whoami (will help root-cause)
            bat '''
            echo ===== whoami =====
            whoami
            echo ===== AWS identity =====
            aws sts get-caller-identity --region %AWS_REGION%
          '''

              // backup existing docker/podman config (so stale auth won't be used)
              bat '''
            if exist "%USERPROFILE%\\.docker\\config.json" (
              echo Backing up existing docker config
              move "%USERPROFILE%\\.docker\\config.json" "%USERPROFILE%\\.docker\\config.json.jenkinsbak" || echo backup failed
            )
          '''

              // login to ECR (single-line pipeline); this should return "Login Succeeded"
              bat '''
            echo Logging into ECR...
            aws ecr get-login-password --region %AWS_REGION% | podman login --username AWS --password-stdin %ECR_REGISTRY%
          '''

              // push images
              bat """
            echo Pushing image: ${IMAGE_NAME}:${IMAGE_TAG}
            podman push ${IMAGE_NAME}:${IMAGE_TAG}
            podman push ${IMAGE_NAME}:latest
          """
        } // withCredentials
      } // script
    } // steps
  } // stage
  }
  post {
    always {
      cleanWs()
    }
  }
}
