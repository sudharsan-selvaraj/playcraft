#!/bin/bash
set -e

# Build the React app
cd web
npm install
npm run build
cd ..

# Create the destination directory if it doesn't exist
mkdir -p lib/public

# Remove old assets
rm -rf lib/public/*

# Move new build assets
cp -r web/dist/* lib/public/

echo "React app built and assets moved to lib/public." 