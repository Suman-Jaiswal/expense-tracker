FROM registry.access.redhat.com/ubi8/nodejs-20:latest AS build
WORKDIR /opt/app-root/src

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Runtime image
FROM registry.access.redhat.com/ubi8/nodejs-20-minimal:latest
WORKDIR /opt/app-root/src

# Copy everything from builder with correct ownership
COPY --from=build --chown=1001:0 /opt/app-root/src ./

RUN ls -a

USER 1001
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
