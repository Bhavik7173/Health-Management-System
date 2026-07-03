# Build stage
FROM node:20-slim AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json yarn.lock* package-lock.json* ./
RUN npm install

# Copy the rest of the application and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
