# Build state
FROM node:20-alpine as build

WORKDIR /app

# Install dependencies (only server)
COPY server/package*.json ./server/
RUN cd server && npm install

# Copy source and shared types
COPY server/ ./server/
COPY shared/ ./shared/

# Build
RUN cd server && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package.json
COPY server/package*.json ./

# Copy built artifacts from the build stage (from the dist folder)
COPY --from=build /app/server/dist/ /app/dist/

# Install only production dependencies
RUN npm install --production

EXPOSE 3001

CMD ["npm", "start"]
