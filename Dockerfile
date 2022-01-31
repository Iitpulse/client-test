# Dockerfile for React client

# Build react client
FROM node:17-alpine

# Working directory be src
WORKDIR /usr/src/app

COPY package*.json ./

###  Installing dependencies
RUN npm install --silent

# Give permission to access node_modules
RUN mkdir -p node_modules/.cache && chmod -R 777 node_modules/.cache

# copy local files to app folder
COPY . .

EXPOSE 3001

USER node

CMD ["npm","start"]
