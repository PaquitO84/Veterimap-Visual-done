# Paso 1: Construcción (Build)
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Paso 2: Servidor de producción (Nginx)
FROM nginx:stable-alpine
# Copiamos el build de React/Vite a la carpeta de Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Copiamos una configuración básica para que las rutas de React funcionen (SPA)
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]