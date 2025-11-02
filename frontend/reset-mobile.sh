#!/bin/bash

# Mobile App Reset and Install Script

echo "🔄 Cleaning up..."

# Remove node_modules
rm -rf node_modules

# Clear npm cache
npm cache clean --force

# Remove package-lock.json
rm -f package-lock.json

echo "📦 Installing dependencies..."
npm install

echo "🧹 Clearing Expo cache..."
expo start -c &
sleep 5
kill %1 2>/dev/null

echo "✅ Done! Run 'npm run android' or 'npm run ios' to test the app"
