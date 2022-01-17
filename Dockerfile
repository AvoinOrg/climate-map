FROM node:16
RUN mkdir -p /app/node_modules

WORKDIR /app
COPY package*.json yarn.lock? /app/
RUN yarn install

USER node

EXPOSE 3000

ENTRYPOINT ["/bin/bash", "/app/docker-entrypoint.sh"]
