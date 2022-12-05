FROM node:18

RUN corepack enable
RUN yarn set version stable

WORKDIR /app

USER node

EXPOSE 3000

ENTRYPOINT ["/bin/bash", "/app/docker-entrypoint.sh"]
