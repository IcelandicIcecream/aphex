#!/bin/bash
echo "📦 Current bundle size:"
ls -lh apps/studio/.svelte-kit/output/server/chunks/aphex.config.js 2>/dev/null || echo "Not built yet"
wc -l apps/studio/.svelte-kit/output/server/chunks/aphex.config.js 2>/dev/null | awk '{print $1 " lines"}' || echo ""

echo ""
echo "🔨 Rebuilding..."
cd apps/studio && npm run build

echo ""
echo "📦 New bundle size:"
ls -lh .svelte-kit/output/server/chunks/aphex.config.js
wc -l .svelte-kit/output/server/chunks/aphex.config.js | awk '{print $1 " lines"}'
