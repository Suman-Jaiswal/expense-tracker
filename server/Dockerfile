FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Runtime image
FROM node:20-alpine
WORKDIR /app

# Install qpdf
RUN apk add --no-cache qpdf

COPY --from=build /app ./

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
