# Dockerfile for React client

# Build react client
FROM node:17-alpine

# Working directory be app
RUN mkdir -p /usr/src/app/
WORKDIR /usr/src/app/
ENV PATH /usr/src/app/node_modules/.bin:$PATH

COPY package*.json ./

###  Installing dependencies
COPY package*.json ./
RUN npm install --silent
RUN npm install react-scripts@4.0.1 -g

# Give permission to access node_modules
# RUN mkdir -p node_modules/.cache && chmod -R 777 node_modules/.cache

# copy local files to app folder
COPY . .

EXPOSE 3000

CMD ["npm","start"]
