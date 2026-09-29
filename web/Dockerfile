FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/landing ./landing
COPY --from=build /app/next.config.js ./
RUN npm install --omit=dev --no-audit --no-fund
EXPOSE 3000
CMD ["npm", "start"]
