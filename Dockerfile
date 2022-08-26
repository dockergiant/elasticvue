FROM debian:bullseye-slim AS builder

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ENV DEFAULT_NAME 'default cluster2222'
ENV DEFAULT_HOST 'http://localhost:9200'

RUN set -eux; \
    apt-get update; \
    apt-get install -y npm nginx curl rsync;

RUN npm install -g yarn n; \
    n install 16; \
    rm -rf /usr/local/n/versions/node;

COPY package.json .
COPY yarn.lock .
COPY . .

RUN yarn install --network-timeout 100000
RUN yarn --silent build

FROM debian:bullseye-slim

RUN set -eux; \
    apt-get update; \
    apt-get install -y nginx;

COPY create_config_js.sh .
COPY docker-entrypoint .
RUN chmod +x create_config_js.sh docker-entrypoint

COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
COPY nginx/elasticvue.conf /etc/nginx/conf.d/

EXPOSE 80
STOPSIGNAL SIGTERM

CMD ["/bin/bash", "docker-entrypoint"]
