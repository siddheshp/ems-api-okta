# Jenkins AWS ECR Setup Guide

This guide explains how to configure Jenkins to push Docker/Podman images to AWS Elastic Container Registry (ECR).

## Prerequisites

- Jenkins installed on Windows
- AWS CLI installed on the Jenkins agent machine
- Podman installed and configured
- AWS account with appropriate permissions

---

## 1. Install AWS CLI on Jenkins Agent

If AWS CLI is not installed, download and install it:

1. Download AWS CLI from: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run the installer
3. Verify installation by opening PowerShell and running:
   ```powershell
   aws --version
   ```

---

## 2. Get AWS Access Key ID and Secret Access Key

### Option A: Create New IAM User (Recommended)

1. **Log in to AWS Console** at https://console.aws.amazon.com
2. Navigate to **IAM** (Identity and Access Management)
3. Click **Users** in the left sidebar
4. Click **Create user**
5. Enter a username (e.g., `jenkins-ecr-user`)
6. Click **Next**
7. **Attach policies directly**:
   - Search for and select **AmazonEC2ContainerRegistryPowerUser**
   - Or create a custom policy with these permissions:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "ecr:GetAuthorizationToken",
             "ecr:BatchCheckLayerAvailability",
             "ecr:InitiateLayerUpload",
             "ecr:UploadLayerPart",
             "ecr:CompleteLayerUpload",
             "ecr:PutImage"
           ],
           "Resource": "*"
         }
       ]
     }
     ```
8. Click **Next**, then **Create user**
9. Click on the created user, then go to **Security credentials** tab
10. Scroll to **Access keys** section
11. Click **Create access key**
12. Select **Application running outside AWS**
13. Click **Next**, optionally add a description tag
14. Click **Create access key**
15. **IMPORTANT**: Copy both:
    - **Access key ID** (e.g., `AKIAIOSFODNN7EXAMPLE`)
    - **Secret access key** (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
16. **Save these securely** - the secret key won't be shown again!

### Option B: Use Existing IAM User

1. Go to **IAM** → **Users**
2. Select your existing user
3. Go to **Security credentials** tab
4. Under **Access keys**, click **Create access key**
5. Follow steps 12-16 above

---

## 3. Create ECR Repository

### Option A: Using AWS Console

1. Log in to **AWS Console**
2. Navigate to **Amazon ECR** (Elastic Container Registry)
3. Click **Get Started** or **Create repository**
4. Select **Private** repository
5. Enter repository name: `test-ems-api`
6. Leave other settings as default (or configure as needed)
7. Click **Create repository**
8. Note your repository URI: `<account-id>.dkr.ecr.<region>.amazonaws.com/test-ems-api`

### Option B: Using AWS CLI

Open PowerShell and run:

```powershell
# Set your region
$AWS_REGION = "us-east-1"

# Create repository
aws ecr create-repository --repository-name test-ems-api --region $AWS_REGION

# Optional: Add image scanning
aws ecr put-image-scanning-configuration `
  --repository-name test-ems-api `
  --image-scanning-configuration scanOnPush=true `
  --region $AWS_REGION

# Optional: Set lifecycle policy to keep only last 10 images
aws ecr put-lifecycle-policy `
  --repository-name test-ems-api `
  --lifecycle-policy-text '{
    "rules": [{
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": { "type": "expire" }
    }]
  }' `
  --region $AWS_REGION
```

---

## 4. Install Jenkins Plugins

1. Go to **Jenkins Dashboard**
2. Click **Manage Jenkins** → **Manage Plugins**
3. Go to **Available plugins** tab
4. Search for and install:
   - **Pipeline: AWS Steps** (required for AWS credentials binding)
   - **CloudBees AWS Credentials** (should be installed as dependency)
5. Click **Install without restart** or **Download now and install after restart**
6. Restart Jenkins if required

---

## 5. Configure AWS Credentials in Jenkins

1. Go to **Jenkins Dashboard**
2. Click **Manage Jenkins** → **Manage Credentials**
3. Click on **(global)** domain
4. Click **Add Credentials** in the left sidebar
5. Fill in the form:
   - **Kind**: Select **AWS Credentials**
   - **Scope**: Global (Jenkins, nodes, items, all child items, etc)
   - **ID**: `aws-credentials` (must match the credentialsId in Jenkinsfile)
   - **Description**: `AWS ECR Credentials` (optional)
   - **Access Key ID**: Paste your AWS Access Key ID
   - **Secret Access Key**: Paste your AWS Secret Access Key
6. Click **Create**

---

## 6. Update Jenkinsfile Variables

Edit the `Jenkinsfile` and update these environment variables:

```groovy
environment {
  AWS_REGION = 'us-east-1'              // Change to your AWS region
  AWS_ACCOUNT_ID = '123456789012'       // Change to your 12-digit AWS account ID
  ECR_REPOSITORY = 'test-ems-api'       // Change if you used a different name
  IMAGE_TAG = "${env.BUILD_NUMBER}"
  ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
  IMAGE_NAME = "${ECR_REGISTRY}/${ECR_REPOSITORY}"
}
```

### How to Find Your AWS Account ID

**Method 1: AWS Console**
- Log in to AWS Console
- Click on your username in the top right
- Your 12-digit account ID is displayed

**Method 2: AWS CLI**
```powershell
aws sts get-caller-identity --query Account --output text
```

---

## 7. Test the Pipeline

1. Commit and push the updated `Jenkinsfile` to your repository
2. Go to your Jenkins job
3. Click **Build Now**
4. Monitor the console output

The pipeline will:
- Check out the code
- Install dependencies
- Build the Docker image with Podman
- Authenticate to AWS ECR
- Push the image to ECR with two tags: `<build-number>` and `latest`

---

## 8. Verify Image in ECR

### Using AWS Console
1. Go to **Amazon ECR** in AWS Console
2. Click on your repository (`test-ems-api`)
3. You should see your images with tags

### Using AWS CLI
```powershell
aws ecr describe-images --repository-name test-ems-api --region us-east-1
```

---

## Troubleshooting

### AWS CLI Not Found
- Ensure AWS CLI is installed and added to system PATH
- Restart Jenkins service after installing AWS CLI
- Check with: `aws --version`

### Authentication Errors
- Verify AWS credentials are correct in Jenkins
- Check IAM user has ECR permissions
- Ensure credential ID in Jenkinsfile matches: `aws-credentials`

### Repository Does Not Exist
- Create the ECR repository first (see Section 3)
- Verify repository name matches `ECR_REPOSITORY` variable

### Podman Login Fails
- Check that AWS CLI can authenticate: `aws ecr get-login-password --region us-east-1`
- Verify the ECR registry URL is correct
- Ensure Podman is running and accessible

### Permission Denied Errors
Ensure your IAM user/role has these ECR permissions:
- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`
- `ecr:PutImage`

---

## Security Best Practices

1. **Use IAM Roles** (if Jenkins is on EC2): Instead of access keys, attach an IAM role to the EC2 instance
2. **Rotate Access Keys**: Regularly rotate AWS access keys
3. **Least Privilege**: Only grant necessary ECR permissions
4. **Enable Image Scanning**: Use ECR's built-in vulnerability scanning
5. **Use Lifecycle Policies**: Automatically clean up old images to save costs
6. **Enable Audit Logging**: Use AWS CloudTrail to log ECR API calls

---

## Additional Resources

- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [Jenkins AWS Steps Plugin](https://plugins.jenkins.io/pipeline-aws/)
- [AWS CLI ECR Commands](https://docs.aws.amazon.com/cli/latest/reference/ecr/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
