#!/bin/bash
set -e

# Build the React app
cd web
npm install
npm run build
# Remove all folders in basic-languages except javascript and typescript
BASIC_LANG_DIR="dist/assets/monaco-editor/vs/basic-languages"
for dir in "$BASIC_LANG_DIR"/*; do
  case "$(basename "$dir")" in
    javascript|typescript) ;; # keep
    *) rm -rf "$dir" ;;
  esac
done

cd ..
# Create the destination directory if it doesn't exist
mkdir -p lib/public

# Remove old assets
rm -rf lib/public/*

# Move new build assets
cp -r web/dist/* lib/public/

echo "React app built and assets moved to lib/public." 