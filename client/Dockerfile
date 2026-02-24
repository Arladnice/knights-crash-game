# Build client
FROM node:20-alpine as build
WORKDIR /app

# Install dependencies
COPY client/package*.json ./client/
RUN cd client && npm install --legacy-peer-deps

# Copy source and shared
COPY client/ ./client/
COPY shared/ ./shared/

# Build client
RUN cd client && npm run build

# Nginx production stage 
FROM nginx:alpine

# Copy default nginx configuration if needed (or just use default)
# COPY client/nginx.conf /etc/nginx/conf.d/default.conf

# Copy dist to nginx
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
