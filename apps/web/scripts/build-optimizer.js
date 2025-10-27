#!/usr/bin/env node

/**
 * Build Optimization Script for SoundBridge
 * 
 * This script helps optimize the build process to avoid hitting Vercel's build limits
 * by providing build validation, caching strategies, and deployment optimization.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  // Build limits
  MAX_BUILD_TIME: 10 * 60 * 1000, // 10 minutes
  MAX_BUILD_SIZE: 100 * 1024 * 1024, // 100MB
  
  // Critical files that should trigger a build
  CRITICAL_PATHS: [
    'apps/web/app',
    'apps/web/src/lib',
    'apps/web/src/components',
    'apps/web/next.config.ts',
    'apps/web/package.json',
    'apps/web/tsconfig.json'
  ],
  
  // Files that can be ignored for builds
  IGNORE_PATHS: [
    'apps/web/.next',
    'apps/web/node_modules',
    'apps/web/public',
    'apps/web/src/types',
    'README.md',
    '*.md'
  ]
};

class BuildOptimizer {
  constructor() {
    this.startTime = Date.now();
    this.buildLog = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.buildLog.push(logMessage);
  }

  // Check if changes require a build
  checkBuildNeeded(changedFiles = []) {
    this.log('🔍 Checking if build is needed...');
    
    if (changedFiles.length === 0) {
      this.log('❌ No changed files detected');
      return false;
    }

    const criticalChanges = changedFiles.some(file => 
      CONFIG.CRITICAL_PATHS.some(path => file.startsWith(path))
    );

    if (criticalChanges) {
      this.log('✅ Critical changes detected - build required');
      return true;
    }

    this.log('⚠️  Only non-critical changes detected - consider skipping build');
    return false;
  }

  // Validate build before deployment
  async validateBuild() {
    this.log('🔧 Validating build...');
    
    // Check TypeScript errors
    this.log('📝 Checking TypeScript errors...');
    try {
      execSync('npm run type-check', { 
        cwd: process.cwd(),
        stdio: 'pipe',
        shell: true
      });
      this.log('✅ TypeScript check passed');
    } catch (error) {
      this.log('⚠️  TypeScript errors found (will be ignored in production)');
      this.log(`   Errors: ${error.message.split('\n').slice(0, 3).join(' ')}`);
    }

    // Check build size
    this.log('📦 Checking build size...');
    const buildDir = 'apps/web/.next';
    if (fs.existsSync(buildDir)) {
      const buildSize = this.getDirectorySize(buildDir);
      if (buildSize > CONFIG.MAX_BUILD_SIZE) {
        this.log(`⚠️  Build size (${this.formatBytes(buildSize)}) exceeds limit`);
      } else {
        this.log(`✅ Build size (${this.formatBytes(buildSize)}) is acceptable`);
      }
    }

    return true;
  }

  // Get directory size recursively
  getDirectorySize(dirPath) {
    let totalSize = 0;
    
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += this.getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }

  // Format bytes to human readable
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Generate build report
  generateReport() {
    const buildTime = Date.now() - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      buildTime: buildTime,
      buildTimeFormatted: this.formatTime(buildTime),
      log: this.buildLog,
      recommendations: this.getRecommendations(buildTime)
    };

    // Save report
    const reportPath = 'build-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📊 Build report saved to ${reportPath}`);
    return report;
  }

  // Get build recommendations
  getRecommendations(buildTime) {
    const recommendations = [];
    
    if (buildTime > CONFIG.MAX_BUILD_TIME) {
      recommendations.push('Consider optimizing build time - exceeds 10 minutes');
    }
    
    if (this.buildLog.some(log => log.includes('TypeScript errors'))) {
      recommendations.push('Fix TypeScript errors to improve build reliability');
    }
    
    recommendations.push('Use Vercel Pro for higher build limits if needed');
    recommendations.push('Consider implementing build caching strategies');
    
    return recommendations;
  }

  // Format time in human readable format
  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  // Main optimization workflow
  async optimize() {
    this.log('🚀 Starting build optimization...');
    
    // Check if build is needed
    const buildNeeded = this.checkBuildNeeded();
    if (!buildNeeded) {
      this.log('⏭️  Skipping build - no critical changes detected');
      return;
    }

    // Validate build
    await this.validateBuild();
    
    // Generate report
    const report = this.generateReport();
    
    this.log('✅ Build optimization complete');
    this.log(`📈 Build time: ${report.buildTimeFormatted}`);
    
    return report;
  }
}

// CLI usage
if (require.main === module) {
  const optimizer = new BuildOptimizer();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'check':
      optimizer.checkBuildNeeded(args.slice(1));
      break;
    case 'validate':
      optimizer.validateBuild();
      break;
    case 'optimize':
      optimizer.optimize();
      break;
    default:
      console.log(`
SoundBridge Build Optimizer

Usage:
  node scripts/build-optimizer.js check [files...]  - Check if build is needed
  node scripts/build-optimizer.js validate          - Validate current build
  node scripts/build-optimizer.js optimize          - Run full optimization

Examples:
  node scripts/build-optimizer.js check apps/web/app/page.tsx
  node scripts/build-optimizer.js validate
  node scripts/build-optimizer.js optimize
      `);
  }
}

module.exports = BuildOptimizer;
