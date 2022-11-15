#!/bin/bash
if [ "$NODE_ENV" = "production" ]; then
    yarn install --only=prod && node start;
else
    yarn install && yarn dev;
fi
