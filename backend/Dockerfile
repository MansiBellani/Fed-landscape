# Step 1: Use an official Python runtime as a parent image
FROM python:3.9-slim

# Step 2: Set the working directory in the container
WORKDIR /app

# Step 3: Copy just the requirements file and install dependencies
# This leverages Docker's layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Step 4: Pre-download the SentenceTransformer model
# This is the crucial step to prevent runtime downloads and restarts
COPY download_model.py .
RUN python download_model.py

# Step 5: Copy the rest of the backend application code
COPY . .

# Step 6: Expose the port the app runs on
EXPOSE 8000

# Step 7: Define the command to run the application
# We use 0.0.0.0 to allow traffic from outside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
