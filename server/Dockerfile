# Step 1: Build with full Node.js 20 image
FROM registry.access.redhat.com/ubi8/nodejs-20:latest AS build

WORKDIR /opt/app-root/src

# Copy package.json (+ lock file if present)
COPY package.json package-lock.json* ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the full source
COPY . .

# Step 2: Slim runtime image
FROM registry.access.redhat.com/ubi8/nodejs-20-minimal:latest

WORKDIR /opt/app-root/src

# Copy files and node_modules with proper ownership for OpenShift random UID
COPY --from=build --chown=1001:0 /opt/app-root/src/node_modules ./node_modules
COPY --from=build --chown=1001:0 /opt/app-root/src ./

USER 1001

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npm", "start"]
