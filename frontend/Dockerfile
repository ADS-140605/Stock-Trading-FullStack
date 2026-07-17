FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Build the app for production (or just run dev server for demo purposes)
# For this docker-compose we'll just run the dev server so live reload works
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
