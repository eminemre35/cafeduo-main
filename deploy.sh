#!/bin/bash
# CafeDuo VPS Deployment Script
# Run this on your VPS after git pull

echo "🚀 Starting CafeDuo Deployment..."

# Navigate to project folder
cd ~/cafeduo-main || cd /var/www/cafeduo || { echo "❌ Project folder not found!"; exit 1; }

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Restart backend with PM2
echo "🔄 Restarting backend..."
pm2 restart all

# Verify services
echo "✅ Deployment complete! Checking status..."
pm2 list

echo "🎉 Done! Check your site at https://cafeduotr.com"
