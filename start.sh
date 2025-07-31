#!/bin/bash
# Big Brother AutoHealer v2 Startup Script

echo "🚀 Starting Big Brother AutoHealer v2..."
echo "⚡ Performance Target: <100ms response, <50MB memory"
echo "🏗️  Architecture: Big Brother Compliant"

# Load environment variables
if [ -f .env-bigbrother ]; then
    export $(cat .env-bigbrother | grep -v '#' | grep -v '^$' | xargs)
    echo "✅ Environment variables loaded from .env-bigbrother"
else
    echo "⚠️  No .env-bigbrother file found, using system environment"
fi

# Verify Big Brother compliance
echo "🔍 Verifying Big Brother compliance..."

# Check Node.js version
NODE_VERSION=$(node --version)
echo "📦 Node.js: $NODE_VERSION"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install --production
fi

# Run pre-flight tests
echo "🧪 Running Big Brother compliance tests..."
if npm run test > /dev/null 2>&1; then
    echo "✅ All compliance tests passed"
else
    echo "❌ Compliance tests failed - check logs"
    echo "🔧 Attempting to start anyway..."
fi

# Set up log directory
mkdir -p logs

# Start the server
echo "🎯 Starting Big Brother AutoHealer v2 Server..."
echo "📍 Port: ${PORT:-3000}"
echo "🌍 Environment: ${NODE_ENV:-development}"
echo "🎛️  V2 Features: ${ERROR_FIXER_V2_ENABLED:-true}"

# Use pm2 if available, otherwise direct node
if command -v pm2 &> /dev/null; then
    echo "🔄 Using PM2 for process management"
    pm2 start src/server-bigbrother.js --name "autohealer-bb-v2" --watch
else
    echo "📝 Starting with direct Node.js"
    node src/server-bigbrother.js
fi