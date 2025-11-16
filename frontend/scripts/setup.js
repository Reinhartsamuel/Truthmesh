#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 TruthMesh Frontend Setup Script\n');

// Check if Node.js version is sufficient
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required. Current version:', nodeVersion);
  process.exit(1);
}

// Check if package.json exists
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found. Please run this script from the frontend directory.');
  process.exit(1);
}

// Create .env.local from .env.example if it doesn't exist
const envExamplePath = path.join(__dirname, '..', '.env.example');
const envLocalPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envLocalPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envLocalPath);
    console.log('✅ Created .env.local from .env.example');
    console.log('📝 Please update .env.local with your contract addresses and WalletConnect Project ID');
  } else {
    console.error('❌ .env.example not found');
    process.exit(1);
  }
} else {
  console.log('✅ .env.local already exists');
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  // Check if bun is available
  try {
    execSync('bun --version', { stdio: 'ignore' });
    console.log('🐰 Using Bun package manager');
    execSync('bun install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (bunError) {
    console.log('📦 Using npm package manager');
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  }
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Build the project
console.log('\n🔨 Building project...');
try {
  // Check if bun is available
  try {
    execSync('bun --version', { stdio: 'ignore' });
    execSync('bun run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (bunError) {
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  }
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.log('💡 This might be expected if contract addresses are not set yet');
}

console.log('\n🎉 Setup completed!');
console.log('\n📋 Next steps:');
console.log('1. Update .env.local with your contract addresses');
console.log('2. Get a WalletConnect Project ID from https://cloud.walletconnect.com/');
console.log('3. Run the development server:');
console.log('   bun run dev  (if using Bun)');
console.log('   npm run dev  (if using npm)');
console.log('4. Open http://localhost:3000 in your browser');
console.log('\n🔗 Contract addresses needed:');
console.log('   - NEXT_PUBLIC_PREDICTION_ORACLE_ADDRESS');
console.log('   - NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS');
console.log('\n🌐 WalletConnect Project ID needed:');
console.log('   - NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID');

// Make the script executable on Unix-like systems
if (process.platform !== 'win32') {
  try {
    fs.chmodSync(__filename, '755');
  } catch (error) {
    // Ignore chmod errors
  }
}