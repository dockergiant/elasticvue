FROM debian:bullseye-slim

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

RUN set -eux; \
    apt-get update; \
    apt-get install -y npm nginx curl;

RUN npm install -g yarn n; \
    n install 16; \
    rm -rf /usr/local/n/versions/node;

COPY package.json .
COPY yarn.lock .
RUN yarn install
COPY . .

ENV DEFAULT_NAME 'default cluster'
ENV DEFAULT_HOST 'http://localhost:9200'

#RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/elasticvue.conf /etc/nginx/conf.d/

EXPOSE 80
STOPSIGNAL SIGTERM

CMD VUE_APP_DEFAULT_NAME=${DEFAULT_NAME} VUE_APP_DEFAULT_HOST=${DEFAULT_HOST} yarn --silent build; \
        mv /usr/src/app/dist/* /usr/share/nginx/html; \
        nginx -g "daemon off;"
