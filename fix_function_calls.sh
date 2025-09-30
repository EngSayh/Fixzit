#!/bin/bash

# Update function calls from connectDb() to connectToDatabase()

echo "Updating function calls from connectDb() to connectToDatabase()..."

# Get script directory and derive target path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${SCRIPT_DIR}/app/api"

# Use relative path to replace in all .ts files in app/api
find "${TARGET_DIR}" -name "*.ts" -type f -exec sed -i 's/await connectDb()/await connectToDatabase()/g' {} \;
find "${TARGET_DIR}" -name "*.ts" -type f -exec sed -i 's/connectDb()/connectToDatabase()/g' {} \;

echo "✅ Updated all connectDb() function calls to connectToDatabase()"