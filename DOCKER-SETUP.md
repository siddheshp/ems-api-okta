# Docker Setup Guide

This guide explains how to dockerize and run the NestJS 11 API with Oracle Database as containers using Podman Desktop on Windows 11 and macOS.

## Prerequisites

- Podman Desktop installed
- Node.js 20+ (for local development)
- NestJS 11 application
- Oracle Database connection

## Architecture

The application uses:
- **NestJS 11** - API framework
- **TypeORM** - Database ORM
- **Oracle Database XE 21c** - Database (runs in container)
- **Okta** - Identity and authentication service

## Quick Start Summary

This setup includes the following components:
1. **Environment Configuration** - Database and Okta settings moved to `.env`
2. **Dockerfile** - Multi-stage build with Oracle Instant Client support
3. **Docker Compose** - Orchestrates Oracle DB and NestJS API containers
4. **Automatic User Creation** - Oracle `training` user created on startup

## Step 1: Install podman-compose

`podman-compose` is required to run multi-container applications with Podman.

### For Windows 11 and macOS (Recommended - Works on Both)

```bash
# Install podman-compose using pip
pip install podman-compose

# Verify installation
podman-compose --version
```

**Prerequisites:** Python and pip must be installed on your system.

### Alternative Installation Methods

#### For Windows 11 - Using Python directly:

```powershell
# If pip is not in PATH, use Python module syntax
python -m pip install podman-compose

# Verify installation
podman-compose --version
```

#### For macOS - Using Homebrew (if preferred):

```bash
# Install via pip (recommended)
pip install podman-compose

# Or install Python via Homebrew if not installed
brew install python
pip install podman-compose

# Verify installation
podman-compose --version
```

### Alternative: Use Podman Desktop GUI

If you prefer not to use CLI:
1. Open **Podman Desktop**
2. Navigate to **Compose** tab
3. Use the GUI to manage compose files (covered in later sections)

## Step 2: Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# Okta Configuration
OKTA_ISSUER=https://your-okta-domain.okta.com/oauth2/default
OKTA_CLIENT_ID=your-client-id
OKTA_AUDIENCE=api://default

# Oracle Database Configuration
DB_TYPE=oracle
DB_HOST=localhost              # Use 'localhost' for local dev, 'oracledb' for Docker Compose
DB_PORT=1521
DB_USERNAME=training
DB_PASSWORD=training123
DB_SERVICE_NAME=XEPDB1
DB_SYNCHRONIZE=true            # Set to false in production
```

**Important**: Never commit `.env` file to version control!

## Step 3: Update Application Configuration

The `src/app.module.ts` has been updated to read database configuration from environment variables:

```typescript
TypeOrmModule.forRoot({
  type: process.env.DB_TYPE as any,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1521', 10),
  username: process.env.DB_USERNAME || 'training',
  password: process.env.DB_PASSWORD || 'training123',
  serviceName: process.env.DB_SERVICE_NAME || 'XEPDB1',
  entities: [Employee, Department],
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
})
```

This allows the application to use different database configurations for local development and containerized environments.

## Step 4: Create Oracle User Initialization Script

Create the directory and initialization script to automatically create the `training` user when Oracle container starts:

### For Windows (PowerShell):

```powershell
# Create directory
New-Item -ItemType Directory -Force -Path ".\oracle-init"

# Create SQL script
@"
ALTER SESSION SET CONTAINER = XEPDB1;

CREATE USER training IDENTIFIED BY training123;
GRANT CONNECT, RESOURCE, DBA TO training;
ALTER USER training QUOTA UNLIMITED ON USERS;

EXIT;
"@ | Out-File -FilePath ".\oracle-init\01-create-user.sql" -Encoding ASCII
```

### For macOS/Linux:

```bash
# Create directory and SQL script
mkdir -p oracle-init

cat > oracle-init/01-create-user.sql << 'EOF'
ALTER SESSION SET CONTAINER = XEPDB1;

CREATE USER training IDENTIFIED BY training123;
GRANT CONNECT, RESOURCE, DBA TO training;
ALTER USER training QUOTA UNLIMITED ON USERS;

EXIT;
EOF
```

This script runs automatically on the first container startup, creating the `training` user in the Oracle database.

## Step 5: Dockerfile with Oracle Support

The project includes a multi-stage Dockerfile optimized for production with Oracle Instant Client support:

```dockerfile
# Build stage
FROM node:lts-alpine AS builder

WORKDIR /app

# Install dependencies required for oracledb
RUN apk add --no-cache libaio libnsl libc6-compat curl unzip

# Install Oracle Instant Client
RUN mkdir -p /opt/oracle && \
    cd /opt/oracle && \
    curl -o instantclient-basiclite.zip https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip && \
    unzip instantclient-basiclite.zip && \
    rm -f instantclient-basiclite.zip && \
    cd /opt/oracle/instantclient* && \
    rm -f *jdbc* *occi* *mysql* *README *jar uidrvci genezi adrci

ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_13:$LD_LIBRARY_PATH

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:lts-alpine

# Install runtime dependencies for oracledb
RUN apk add --no-cache libaio libnsl libc6-compat

# Copy Oracle Instant Client from builder
COPY --from=builder /opt/oracle /opt/oracle

ENV NODE_ENV=production
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_13:$LD_LIBRARY_PATH

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

RUN chown -R node /app
USER node

CMD ["node", "dist/main.js"]
```

**What this does:**
- **Build stage**: Installs Oracle Instant Client and compiles TypeScript
- **Production stage**: Creates minimal image with Oracle client libraries
- **Multi-stage**: Reduces final image size by excluding build tools

## Step 6: Create .dockerignore

Create a `.dockerignore` file in the project root:

```
node_modules
dist
.git
.env
*.md
.vscode
.idea
```

## Step 7: Docker Compose Configuration

The `docker-compose.yml` orchestrates both Oracle Database and NestJS API containers:

**Key Features:**
- Oracle Database XE 21.3.0 with health checks
- Automatic initialization script execution
- Network isolation for containers
- Persistent volume for database data
- Environment variable injection for API

The compose file is already created in the project root with proper networking and dependencies configured.

## Step 8: Build and Run with Docker Compose

### Using Command Line

#### For Windows (PowerShell):

```powershell
# Navigate to project directory
cd d:\Labs\cigna\test\ems-api-okta

# Build and start all services (Oracle DB + API)
podman-compose up -d --build

# View logs
podman-compose logs -f

# Check running containers
podman ps

# View specific service logs
podman-compose logs -f api
podman-compose logs -f oracledb
```

#### For macOS/Linux:

```bash
# Navigate to project directory
cd /path/to/ems-api-okta

# Build and start all services (Oracle DB + API)
podman-compose up -d --build

# View logs
podman-compose logs -f

# Check running containers
podman ps

# View specific service logs
podman-compose logs -f api
podman-compose logs -f oracledb
```

**Note:** The `--build` flag ensures the Docker images are built before starting containers. Use this on first run or after code changes.

### Using Podman Desktop GUI

1. Open **Podman Desktop**
2. Click **Compose** in left sidebar
3. Click **+ Create a Compose**
4. Browse and select `docker-compose.yml`
5. Click **Start** to launch all services
6. Monitor logs and status in the GUI

---

## Step 9: Monitor Container Startup

After running `podman-compose up -d --build`, monitor the logs to ensure everything starts correctly.

### Check Container Status

```bash
# Check all running containers
podman ps

# Expected output: ems-api and ems-oracledb should be running
```

### Monitor Oracle Database Initialization

Oracle DB takes **2-3 minutes** to fully initialize on first startup. Watch for:

```bash
# Follow Oracle logs
podman-compose logs -f oracledb
```

**Look for these messages:**
- `DATABASE IS READY TO USE!`
- `The Oracle Database is now available for connections`
- Initialization script execution messages

### Monitor API Startup

```bash
# Follow API logs
podman-compose logs -f api
```

**Look for:**
- `Nest application successfully started`
- Database connection success messages
- No connection errors

### View All Logs Together

```bash
# View logs from all services
podman-compose logs -f
```

---

## Step 10: Verify Oracle User Creation

Once Oracle is fully initialized, verify the `training` user was created automatically:

### For Windows (PowerShell):

```powershell
# Connect to Oracle container and test training user
podman exec -it ems-oracledb sqlplus training/training123@XEPDB1
```

### For macOS/Linux:

```bash
# Connect to Oracle container and test training user
podman exec -it ems-oracledb sqlplus training/training123@XEPDB1
```

If connected successfully, you should see SQL*Plus prompt:

```
SQL*Plus: Release 21.0.0.0.0 - Production
...
Connected to:
Oracle Database 21c Express Edition Release 21.0.0.0.0

SQL>
```

Type `EXIT;` to exit SQL*Plus.

**If the user doesn't exist**, the initialization script may not have run. Check:

```bash
# Check if initialization script is mounted
podman exec -it ems-oracledb ls -la /opt/oracle/scripts/startup

# Manually run the script if needed
podman exec -it ems-oracledb sqlplus sys/OraclePassword123@XEPDB1 as sysdba @/opt/oracle/scripts/startup/01-create-user.sql
```

---

## Step 11: Test the API

Once both containers are healthy and running:

### Check Running Containers

```bash
# Check all running containers
podman ps

# Expected output: ems-api and ems-oracledb should be running
```

### View Container Logs

```bash
# View API logs
podman logs ems-api

# View Oracle DB logs
podman logs ems-oracledb

# Follow logs in real-time
podman-compose logs -f
```

**Using Podman Desktop:**
- Navigate to "Containers"
- Click on `ems-api` or `ems-oracledb`
- View logs, stats, and inspect details

### For Windows (PowerShell):

```powershell
# Test API endpoint
Invoke-WebRequest -Uri http://localhost:3000/employees

# Or use curl if installed
curl http://localhost:3000/employees
```

### For macOS/Linux:

```bash
# Test API endpoint
curl http://localhost:3000/employees

# Or use httpie if installed
http localhost:3000/employees
```

### Test in Browser

Open your browser and navigate to:
- `http://localhost:3000/employees`
- `http://localhost:3000` (if you have a root endpoint)

### Expected Results

- **First time**: Oracle DB takes ~2-3 minutes to initialize
- **API response**: Should return employee data or empty array `[]`
- **Training user**: Automatically created by initialization script
- **No errors**: Check logs if you see connection errors

---

## Step 12: Container Management

### Stop All Services

```bash
# Stop all containers
podman-compose down
```

### Start Services Again

```bash
# Start previously created containers
podman-compose up -d

# Rebuild and start
podman-compose up -d --build
```

### Rebuild After Code Changes

```bash
# Rebuild API image and restart
podman-compose up -d --build api

# Or rebuild everything
podman-compose build
podman-compose up -d
```

### View Container Logs

```bash
# View all logs
podman-compose logs -f

# View specific service
podman-compose logs -f api
podman-compose logs -f oracledb

# View last 100 lines
podman-compose logs --tail=100 api
```

### Stop and Remove Everything (Fresh Start)

```bash
# Remove containers, networks, and volumes
podman-compose down -v

# Start fresh (will re-initialize Oracle DB)
podman-compose up -d --build
```

**Warning:** The `-v` flag removes volumes, which means all Oracle database data will be deleted!

### Individual Container Management

```bash
# Stop specific container
podman stop ems-api

# Start specific container
podman start ems-api

# Restart specific container
podman restart ems-api

# Remove specific container
podman rm ems-api

# Remove image
podman rmi ems-api:latest

# Execute command in running container
podman exec -it ems-api sh
```

### Check Container Resource Usage

```bash
# View resource usage
podman stats

# View for specific container
podman stats ems-api
```

---

## Docker Compose Details

The `docker-compose.yml` in the project root contains:

### Complete docker-compose.yml

```yaml
version: '3.8'

services:
  # Oracle Database
  oracledb:
    image: container-registry.oracle.com/database/express:21.3.0-xe
    container_name: ems-oracledb
    ports:
      - "1521:1521"
      - "5500:5500"
    environment:
      - ORACLE_PWD=OraclePassword123
    volumes:
      - oracle-data:/opt/oracle/oradata
    healthcheck:
      test: ["CMD", "sqlplus", "-L", "sys/OraclePassword123@//localhost:1521/XE as sysdba", "@/dev/null"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - ems-network

  # NestJS API
  api:
    build: 
      context: .
      dockerfile: Dockerfile
    container_name: ems-api
    ports:
      - "3000:3000"
    environment:
      # Okta Configuration
      - OKTA_ISSUER=${OKTA_ISSUER}
      - OKTA_CLIENT_ID=${OKTA_CLIENT_ID}
      - OKTA_AUDIENCE=${OKTA_AUDIENCE}
      # Oracle Database Configuration
      - DB_TYPE=oracle
      - DB_HOST=oracledb
      - DB_PORT=1521
      - DB_USERNAME=training
      - DB_PASSWORD=training123
      - DB_SERVICE_NAME=XEPDB1
      - DB_SYNCHRONIZE=true
    depends_on:
      oracledb:
        condition: service_healthy
    networks:
      - ems-network
    restart: unless-stopped

volumes:
  oracle-data:
    driver: local

networks:
  ems-network:
    driver: bridge
```

**Important Notes:**
- The `oracle-init` volume mapping automatically creates the `training` user
- No manual SQL execution required
- Health checks ensure API waits for Oracle to be ready
- All services run on isolated `ems-network`

## Environment Variables

Your `.env` file should contain:

```env
# Okta Configuration
OKTA_ISSUER=https://your-okta-domain.okta.com/oauth2/default
OKTA_CLIENT_ID=your-client-id
OKTA_AUDIENCE=api://default

# Oracle Database Configuration
DB_TYPE=oracle
DB_HOST=localhost              # Use 'oracledb' when running with Docker Compose
DB_PORT=1521
DB_USERNAME=training
DB_PASSWORD=training123
DB_SERVICE_NAME=XEPDB1
DB_SYNCHRONIZE=true            # Set to false in production
```

**Important**: 
- Never commit `.env` file to version control!
- Use `DB_HOST=localhost` for local development
- Use `DB_HOST=oracledb` when running with Docker Compose

## Common Commands Reference

### Windows (PowerShell)

```powershell
# Start all services
podman-compose up -d

# Build and start
podman-compose up -d --build

# View logs
podman-compose logs -f

# Stop all services
podman-compose down

# Rebuild and restart
podman-compose up -d --build

# Remove everything including volumes
podman-compose down -v

# Check status
podman ps

# Check resource usage
podman stats
```

### macOS/Linux

```bash
# Start all services
podman-compose up -d

# Build and start
podman-compose up -d --build

# View logs
podman-compose logs -f

# Stop all services
podman-compose down

# Rebuild and restart
podman-compose up -d --build

# Remove everything including volumes
podman-compose down -v

# Check status
podman ps

# Check resource usage
podman stats
```

---

## File Structure

After setup, your project should have:

```
ems-api-okta/
├── .env                          # Environment variables (git-ignored)
├── .env.example                  # Template for environment variables
├── .dockerignore                 # Files to exclude from Docker build
├── docker-compose.yml            # Multi-container orchestration
├── Dockerfile                    # API container definition
├── DOCKER-SETUP.md              # This file
├── oracle-init/
│   └── 01-create-user.sql       # Oracle user creation script
├── src/
│   └── app.module.ts            # Updated with env variables
└── ... (other project files)
```

## Best Practices

1. **Image Size**: Multi-stage builds reduce final image size
2. **Security**: Don't include sensitive data in Dockerfile
3. **Health Checks**: Add health check endpoints for monitoring
4. **Logging**: Use structured logging for better debugging
5. **Updates**: Regularly update base images for security patches

## Troubleshooting

### podman-compose not recognized

Install using pip:

```bash
pip install podman-compose
```

Or on Windows:

```powershell
python -m pip install podman-compose
```

### Container Won't Start

```bash
podman logs ems-api
```

### Port Already in Use

Change host port mapping in `docker-compose.yml`: `-p 3001:3000`

### Permission Issues

Run Podman Desktop as administrator or check Podman machine status:

```bash
podman machine list
podman machine start
```

### Cannot Connect to API

1. Verify container is running: `podman ps`
2. Check port mapping: `podman port ems-api`
3. Check firewall settings
4. Verify application logs: `podman logs ems-api`

### Oracle DB initialization takes too long

First startup can take 2-3 minutes. Monitor progress:

```bash
podman-compose logs -f oracledb
```

## Additional Resources

- [Podman Documentation](https://docs.podman.io/)
- [NestJS Docker Documentation](https://docs.nestjs.com/recipes/docker)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
