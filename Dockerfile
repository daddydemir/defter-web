FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./
COPY src ./src
COPY public/* ./
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
#COPY --from=build /app/dist/favicon.svg /usr/share/nginx/html/favicon.svg
#COPY --from=build /app/public/favicon.ico /usr/share/nginx/html/favicon.ico
#COPY --from=build /app/public/favicon-32.png /usr/share/nginx/html/favicon-32.png
#COPY --from=build /app/public/favicon-16.png /usr/share/nginx/html/favicon-16.png
#COPY --from=build /app/public/apple-touch-icon.png /usr/share/nginx/html/apple-touch-icon.png
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
