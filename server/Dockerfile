FROM nginx
EXPOSE 80

RUN usermod -aG www-data nginx

RUN mkdir -p /data/temp_nginx /data/saved

COPY default.conf /etc/nginx/conf.d/

COPY entrypoint.sh .

ENTRYPOINT ["./entrypoint.sh"]

