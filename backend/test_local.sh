#!/bin/bash

# Build the Docker image with the tag nexderm-backend
# The '.' refers to the current directory containing the Dockerfile
echo "Building Docker image..."
docker build -t nexderm-backend .

# Run the container, mapping port 8000 to 8000
echo "Running Docker container on port 8000..."
docker run -p 8000:8000 nexderm-backend