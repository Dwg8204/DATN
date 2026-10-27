FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development
ENV NODE_ENV=development \
    TSC_WATCHFILE=DynamicPriorityPolling \
    TSC_WATCHDIRECTORY=RecursiveDirectoryUsingDynamicPriorityPolling
COPY --chown=node:node nest-cli.json tsconfig.json tsconfig.build.json docker-entrypoint.sh ./
COPY --chown=node:node src ./src
COPY --chown=node:node resources ./resources
RUN mkdir -p uploads && chown node:node /app uploads
USER node
EXPOSE 3000
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
# Launch Node directly so Nest waits for the old API process to exit on reload.
# A shell wrapper can leave it holding port 3000 in slim Linux images.
CMD ["npm", "run", "start:dev", "--", "--no-shell"]

FROM dependencies AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node resources ./resources
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN mkdir -p uploads && chown node:node uploads
USER node
EXPOSE 3000
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
