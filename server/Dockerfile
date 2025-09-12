FROM registry.access.redhat.com/ubi8/nodejs-20:latest AS build
WORKDIR /opt/app-root/src

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Runtime image
FROM registry.access.redhat.com/ubi8/nodejs-20-minimal:latest
WORKDIR /opt/app-root/src

# Install build dependencies and compile qpdf
USER 0
RUN microdnf install -y make gcc gcc-c++ zlib-devel wget tar && \
    wget https://github.com/qpdf/qpdf/releases/download/release-qpdf-11.9.1/qpdf-11.9.1.tar.gz && \
    tar -xvzf qpdf-11.9.1.tar.gz && \
    cd qpdf-11.9.1 && ./configure && make && make install && \
    cd .. && rm -rf qpdf-11.9.1* && \
    microdnf clean all
USER 1001

# Copy everything from builder with correct ownership
COPY --from=build --chown=1001:0 /opt/app-root/src ./

RUN ls -a

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
