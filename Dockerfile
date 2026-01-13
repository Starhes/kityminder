FROM node:20-alpine

WORKDIR /app

# Copy server dependency definitions
COPY server/package.json ./server/

# Install server dependencies
RUN cd server && npm install --production

# Copy the rest of the application
COPY . .

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["node", "server/app.js"]
