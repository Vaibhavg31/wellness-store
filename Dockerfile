# One image = the whole site: Vite builds the storefront, the Node API serves it plus /api and /uploads.
# (.npmrc is deliberately not copied — it points npm at a Windows Git Bash path.)

# ---- 1. Build the storefront -------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .

# Public (browser-visible) settings are baked in at build time. Pass them with --build-arg; blanks fall back to
# the empty "production" block in config.json.
ARG VITE_SITE_URL=""
ARG VITE_API_URL=""
ARG VITE_ADMIN_PATH="/chikit-studio"
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_RAZORPAY_KEY_ID=""
ARG VITE_MSG91_WIDGET_ID=""
ARG VITE_MSG91_TOKEN_AUTH=""
ARG VITE_SKIP_PHONE_VERIFY="false"
ENV CONFIG_ENV=production \
    VITE_SITE_URL=$VITE_SITE_URL \
    VITE_API_URL=$VITE_API_URL \
    VITE_ADMIN_PATH=$VITE_ADMIN_PATH \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID \
    VITE_MSG91_WIDGET_ID=$VITE_MSG91_WIDGET_ID \
    VITE_MSG91_TOKEN_AUTH=$VITE_MSG91_TOKEN_AUTH \
    VITE_SKIP_PHONE_VERIFY=$VITE_SKIP_PHONE_VERIFY
# `vite build` directly: the repo's SEO post-build step needs a live API, which doesn't exist at image-build time.
RUN npx vite build

# ---- 2. Runtime image --------------------------------------------------------------------------------------
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production CONFIG_ENV=production NODE_PORT=8000

COPY backend-node/package.json backend-node/package-lock.json ./backend-node/
RUN cd backend-node && npm ci --omit=dev --include=optional --no-audit --no-fund

COPY backend-node/src ./backend-node/src
COPY backend-node/scripts ./backend-node/scripts
COPY database ./database
COPY config.json ./config.json
COPY --from=web /app/dist ./dist

# Customer/admin uploads live on a mounted volume (see infra/aws/task-definition.json), owned by the node user.
RUN mkdir -p backend-node/uploads && chown -R node:node backend-node/uploads
USER node
EXPOSE 8000
CMD ["node", "backend-node/src/server.js"]
