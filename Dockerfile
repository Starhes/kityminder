FROM node:20-alpine

# Install git for bower/cloning
RUN apk add --no-cache git

# Install root dependencies (Grunt, etc)
COPY package.json .
RUN npm install

# Install bower globally
RUN npm install -g bower grunt-cli

# Copy bower config and install bower deps
COPY bower.json .
COPY .bowerrc .
RUN bower install --allow-root

# Manually clone missing dependencies (fui, kity) - simplistic approach
RUN mkdir -p lib \
    && git clone https://github.com/fex-team/kity.git lib/kity \
    && git clone https://github.com/fex-team/fui.git lib/fui

# Copy the rest of the application
COPY . .

# Build frontend assets (CSS)
# Force is used because some grunt tasks might warn
RUN grunt less autoprefixer --force

# Install server dependencies
RUN cd server && npm install --production

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["node", "server/app.js"]
