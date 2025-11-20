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
