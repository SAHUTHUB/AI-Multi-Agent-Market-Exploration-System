# Use Node.js Alpine as base
FROM node:20-alpine

# 1. Docker Optimization: Install Python 3 within the Node container
# This is required because our Next.js backend uses child_process.spawn('python3')
RUN apk add --no-cache python3 py3-pip

WORKDIR /workspace

# 2. Setup Python Environment
COPY AI-agents/requirements.txt ./AI-agents/
# Install Python dependencies globally within the container
RUN pip3 install --no-cache-dir -r ./AI-agents/requirements.txt --break-system-packages

# 3. Setup Node.js Environment
COPY frontend/package*.json ./frontend/
WORKDIR /workspace/frontend
RUN npm install

# 4. Copy Application Source Code
WORKDIR /workspace
# Copy Python agents
COPY AI-agents/ ./AI-agents/
# Copy TS backend schemas/tools used by Next.js API
COPY backend/ ./backend/
# Copy Next.js frontend
COPY frontend/ ./frontend/

# 5. Build Next.js
WORKDIR /workspace/frontend
RUN npm run build

# Start the Next.js server
EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
