FROM node:16

RUN corepack enable
RUN yarn set version stable

WORKDIR /app

USER node

EXPOSE 3000
