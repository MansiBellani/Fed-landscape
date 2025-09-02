# Step 1: Use a Node.js runtime as the base image
FROM node:18

# Step 2: Set the working directory
WORKDIR /app

# Step 3: Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Step 4: Copy the rest of the frontend application code
COPY . .

# Step 5: Expose the port React runs on
EXPOSE 5173

# Step 6: The command to start the app
CMD ["npm", "run", "dev"]
