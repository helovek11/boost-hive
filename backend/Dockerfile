FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install prisma@4.15.0 @prisma/client@4.15.0 --save-exact --legacy-peer-deps
COPY . .
RUN npx prisma generate
RUN npm run build
RUN chmod +x ./entrypoint.sh
EXPOSE 3000
CMD ["./entrypoint.sh"]
