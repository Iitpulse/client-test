# Dockerfile for React client

# Stage 1
# Build react client
FROM node:17-alpine

# Working directory be app
RUN mkdir -p /usr/src/app/
WORKDIR /usr/src/app/
ENV PATH /usr/src/app/node_modules/.bin:$PATH


###  Installing dependencies
COPY package*.json ./
RUN npm install --silent
RUN npm install react-scripts@4.0.1 -g


# copy local files to app folder
COPY . .

RUN npm run build

# Stage 2
FROM nginx:1.17.0-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /usr/src/app/build /usr/share/nginx/html
EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]