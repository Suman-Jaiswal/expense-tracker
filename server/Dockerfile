FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install only production dependencies
RUN npm install

# Copy rest of app
COPY . .

# Expose port
EXPOSE 3000

# Start app
CMD ["npm", "start"]
