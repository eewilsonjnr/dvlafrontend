# DVLA IDP frontend — Next.js 16
FROM node:20-bookworm-slim

WORKDIR /app

# Skip husky during image build (no .git in the build context)
ENV HUSKY=0

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* is inlined into the client bundle at BUILD time, so the API URL
# must be provided as a build arg before `next build`.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Bump heap for the build (low-RAM host)
RUN NODE_OPTIONS=--max-old-space-size=2048 npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
