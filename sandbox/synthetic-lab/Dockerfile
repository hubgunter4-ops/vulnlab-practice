FROM node:22-alpine

RUN addgroup -S lab && adduser -S lab -G lab
WORKDIR /opt/lab
COPY server.mjs ./server.mjs
COPY evidence ./evidence
RUN chown -R lab:lab /opt/lab
USER lab
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
