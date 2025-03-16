FROM node:lts-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY ../ /app
RUN npm run build

# Production
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
EXPOSE 80
RUN addgroup nginx www-data
RUN mkdir -p /data/temp_nginx /data/saved
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY webdav.conf /webdav.conf
COPY entrypoint.sh /docker-entrypoint.d/50-entrypoint.sh

# Development
FROM build-stage as development-stage
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production proxy to development
FROM production-stage as production-proxy-stage
COPY nginx-proxy.conf /etc/nginx/conf.d/default.conf

