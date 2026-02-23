#!/bin/bash

SERVER_IP="3.19.218.90"
KEY_PATH="NexDerm-Key-2.pem"

# Fix key permissions
chmod 400 "$KEY_PATH"

# Copy the contents of the current backend folder to the remote server
scp -i "$KEY_PATH" -r . ubuntu@"$SERVER_IP":/home/ubuntu/backend

echo "Files copied successfully."
echo "To log in, run: ssh -i $KEY_PATH ubuntu@$SERVER_IP"