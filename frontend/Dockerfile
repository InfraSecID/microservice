FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN mkdir -p public && printf '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Microservices Demo</title></head><body><div id="root"></div></body></html>' > public/index.html
COPY src ./src
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
