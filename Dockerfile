# Статичный лендинг «Весточки» — отдаём nginx.
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
