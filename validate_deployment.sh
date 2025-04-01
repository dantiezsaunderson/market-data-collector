#!/bin/bash

# Deployment Validation Script for Market Data Collector
# This script validates that the Docker deployment is ready for Render

echo "=========================================================="
echo "Market Data Collector - Deployment Validation"
echo "=========================================================="

# Create validation report file
REPORT_FILE="deployment_validation_report.md"
echo "# Market Data Collector - Deployment Validation Report" > $REPORT_FILE
echo "**Date:** $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# Check required files
echo "## 1. Required Files Check" >> $REPORT_FILE
echo "Checking for required files..." 

REQUIRED_FILES=(
  "Dockerfile"
  "Dockerfile.worker"
  "docker-compose.yml"
  "render.yaml"
  "server.js"
  "worker.js"
  "monitoring-service.js"
  ".env.example"
  "docker-network.yml"
  "security-config.yml"
  "backup-recovery.yml"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "- ✅ $file" >> $REPORT_FILE
  else
    echo "- ❌ $file (MISSING)" >> $REPORT_FILE
    MISSING_FILES=$((MISSING_FILES+1))
  fi
done

if [ $MISSING_FILES -eq 0 ]; then
  echo "All required files are present."
  echo "" >> $REPORT_FILE
  echo "**Status:** All required files are present ✅" >> $REPORT_FILE
else
  echo "Error: $MISSING_FILES required files are missing."
  echo "" >> $REPORT_FILE
  echo "**Status:** $MISSING_FILES required files are missing ❌" >> $REPORT_FILE
fi
echo "" >> $REPORT_FILE

# Check Docker installation
echo "## 2. Docker Environment Check" >> $REPORT_FILE
echo "Checking Docker environment..."

if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version)
  echo "- ✅ Docker is installed: $DOCKER_VERSION" >> $REPORT_FILE
else
  echo "- ❌ Docker is not installed" >> $REPORT_FILE
fi

if command -v docker-compose &> /dev/null; then
  COMPOSE_VERSION=$(docker-compose --version)
  echo "- ✅ Docker Compose is installed: $COMPOSE_VERSION" >> $REPORT_FILE
else
  echo "- ❌ Docker Compose is not installed" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Validate Dockerfile
echo "## 3. Dockerfile Validation" >> $REPORT_FILE
echo "Validating Dockerfile..."

if [ -f "Dockerfile" ]; then
  # Check for required stages
  if grep -q "FROM.*AS build" Dockerfile && grep -q "FROM.*AS production" Dockerfile; then
    echo "- ✅ Multi-stage build configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ Multi-stage build configuration not found" >> $REPORT_FILE
  fi
  
  # Check for exposed port
  if grep -q "EXPOSE" Dockerfile; then
    echo "- ✅ Port exposure configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No port exposure configuration found" >> $REPORT_FILE
  fi
  
  # Check for CMD
  if grep -q "CMD" Dockerfile; then
    echo "- ✅ Command configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No command configuration found" >> $REPORT_FILE
  fi
else
  echo "- ❌ Dockerfile not found" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Validate Render configuration
echo "## 4. Render Configuration Validation" >> $REPORT_FILE
echo "Validating render.yaml..."

if [ -f "render.yaml" ]; then
  # Check for web service
  if grep -q "type: web" render.yaml; then
    echo "- ✅ Web service configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No web service configuration found" >> $REPORT_FILE
  fi
  
  # Check for worker service
  if grep -q "type: worker" render.yaml; then
    echo "- ✅ Worker service configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No worker service configuration found" >> $REPORT_FILE
  fi
  
  # Check for database
  if grep -q "type: redis" render.yaml; then
    echo "- ✅ Redis database configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No Redis database configuration found" >> $REPORT_FILE
  fi
  
  # Check for environment variables
  if grep -q "envVars" render.yaml; then
    echo "- ✅ Environment variables configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No environment variables configuration found" >> $REPORT_FILE
  fi
else
  echo "- ❌ render.yaml not found" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Validate environment variables
echo "## 5. Environment Variables Validation" >> $REPORT_FILE
echo "Validating environment variables..."

if [ -f ".env.example" ]; then
  # Count required variables
  REQUIRED_VARS=$(grep -v "^#" .env.example | grep "=" | wc -l)
  echo "- ✅ Environment variables template found with $REQUIRED_VARS variables" >> $REPORT_FILE
  
  # Check for sensitive variables
  SENSITIVE_VARS=$(grep -E "(SECRET|PASSWORD|KEY)" .env.example | wc -l)
  echo "- ✅ $SENSITIVE_VARS sensitive variables identified" >> $REPORT_FILE
  
  # Check if .env exists (should not be in the repository)
  if [ -f ".env" ]; then
    echo "- ⚠️ .env file exists and should not be included in the repository" >> $REPORT_FILE
  else
    echo "- ✅ No .env file in the repository (as expected)" >> $REPORT_FILE
  fi
else
  echo "- ❌ .env.example not found" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Validate Docker Compose configuration
echo "## 6. Docker Compose Validation" >> $REPORT_FILE
echo "Validating docker-compose.yml..."

if [ -f "docker-compose.yml" ]; then
  # Check for services
  SERVICES=$(grep -E "^  [a-zA-Z0-9_-]+:" docker-compose.yml | wc -l)
  echo "- ✅ $SERVICES services defined in docker-compose.yml" >> $REPORT_FILE
  
  # Check for volumes
  if grep -q "volumes:" docker-compose.yml; then
    echo "- ✅ Volume configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No volume configuration found" >> $REPORT_FILE
  fi
  
  # Check for networks
  if grep -q "networks:" docker-compose.yml; then
    echo "- ✅ Network configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No network configuration found" >> $REPORT_FILE
  fi
else
  echo "- ❌ docker-compose.yml not found" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Validate security configuration
echo "## 7. Security Configuration Validation" >> $REPORT_FILE
echo "Validating security configuration..."

if [ -f "security-config.yml" ]; then
  # Check for HTTPS configuration
  if grep -q "https:" security-config.yml; then
    echo "- ✅ HTTPS configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No HTTPS configuration found" >> $REPORT_FILE
  fi
  
  # Check for authentication
  if grep -q "authentication:" security-config.yml; then
    echo "- ✅ Authentication configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No authentication configuration found" >> $REPORT_FILE
  fi
  
  # Check for Docker security
  if grep -q "docker:" security-config.yml; then
    echo "- ✅ Docker security configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No Docker security configuration found" >> $REPORT_FILE
  fi
else
  echo "- ❌ security-config.yml not found" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Validate backup and recovery configuration
echo "## 8. Backup and Recovery Validation" >> $REPORT_FILE
echo "Validating backup and recovery configuration..."

if [ -f "backup-recovery.yml" ]; then
  # Check for backup configuration
  if grep -q "backup:" backup-recovery.yml; then
    echo "- ✅ Backup configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No backup configuration found" >> $REPORT_FILE
  fi
  
  # Check for recovery configuration
  if grep -q "recovery:" backup-recovery.yml; then
    echo "- ✅ Recovery configuration detected" >> $REPORT_FILE
  else
    echo "- ❌ No recovery configuration found" >> $REPORT_FILE
  fi
  
  # Check for scripts
  if grep -q "scripts:" backup-recovery.yml; then
    echo "- ✅ Backup/recovery scripts detected" >> $REPORT_FILE
  else
    echo "- ❌ No backup/recovery scripts found" >> $REPORT_FILE
  fi
else
  echo "- ❌ backup-recovery.yml not found" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Validate documentation
echo "## 9. Documentation Validation" >> $REPORT_FILE
echo "Validating documentation..."

if [ -f "RENDER_DEPLOYMENT.md" ]; then
  echo "- ✅ Deployment documentation found" >> $REPORT_FILE
else
  echo "- ❌ Deployment documentation not found" >> $REPORT_FILE
fi

if [ -f "DEPLOYMENT_INSTRUCTIONS.md" ]; then
  echo "- ✅ Deployment instructions found" >> $REPORT_FILE
else
  echo "- ❌ Deployment instructions not found" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Validate continuous deployment configuration
echo "## 10. Continuous Deployment Validation" >> $REPORT_FILE
echo "Validating continuous deployment configuration..."

if [ -d ".github/workflows" ]; then
  if [ -f ".github/workflows/render-deploy.yml" ]; then
    echo "- ✅ GitHub Actions workflow for Render deployment found" >> $REPORT_FILE
  else
    echo "- ❌ GitHub Actions workflow for Render deployment not found" >> $REPORT_FILE
  fi
else
  echo "- ❌ GitHub workflows directory not found" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE

# Generate summary
echo "## Summary" >> $REPORT_FILE
echo "Generating validation summary..."

TOTAL_CHECKS=10
PASSED_CHECKS=0

if [ $MISSING_FILES -eq 0 ]; then
  PASSED_CHECKS=$((PASSED_CHECKS+1))
fi

if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
  PASSED_CHECKS=$((PASSED_CHECKS+1))
fi

if [ -f "Dockerfile" ] && grep -q "FROM.*AS build" Dockerfile && grep -q "FROM.*AS production" Dockerfile && grep -q "EXPOSE" Dockerfile && grep -q "CMD" Dockerfile; then
  PASSED_CHECKS=$((PASSED_CHECKS+1))
fi

if [ -f "render.yaml" ] && grep -q "type: web" render.yaml && grep -q "type: worker" render.yaml && grep -q "type: redis" render.yaml && grep -q "envVars" render.yaml; then
  PASSED_CHECKS=$((PASSED_CHECKS+1))
fi

if [ -f ".env.example" ]; then
  PASSED_CHECKS=$((PASSED_CHECKS+1))
fi

if [ -f "docker-compose.yml" ] && grep -q "volumes:" docker-compose.yml && grep -q "networks:" docker-compose.yml; then
  PASSED_CHECKS=$((PASSED_CHECKS+1))
fi

if [ -f "security-config.yml" ] && grep -q "https:" security-config.yml && grep -q "authentication:" security-config.yml && grep -q "docker:" security-config.yml; then
  PASSED_CHECKS=$((PASSED_CHECKS+1))
fi

if [ -f "backup-recovery.yml" ] && grep -q "backup:" backup-recovery.yml && grep -q "recovery:" backup-recovery.yml && grep -q "scripts:" backup-recovery.yml; then
  PASSED_CHECKS=$((PASSED_CHECKS+1))
fi

if [ -f "RENDER_DEPLOYMENT.md" ] && [ -f "DEPLOYMENT_INSTRUCTIONS.md" ]; then
  PASSED_CHECKS=$((PASSED_CHECKS+1))
fi

if [ -f ".github/workflows/render-deploy.yml" ]; then
  PASSED_CHECKS=$((PASSED_CHECKS+1))
fi

PERCENTAGE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo "**Validation Score:** $PASSED_CHECKS/$TOTAL_CHECKS ($PERCENTAGE%)" >> $REPORT_FILE
echo "" >> $REPORT_FILE

if [ $PERCENTAGE -eq 100 ]; then
  echo "**Overall Status:** ✅ READY FOR DEPLOYMENT" >> $REPORT_FILE
  echo "The Market Data Collector application is ready for deployment to Render." >> $REPORT_FILE
elif [ $PERCENTAGE -ge 80 ]; then
  echo "**Overall Status:** ⚠️ MOSTLY READY FOR DEPLOYMENT" >> $REPORT_FILE
  echo "The Market Data Collector application is mostly ready for deployment to Render, but some minor issues should be addressed." >> $REPORT_FILE
else
  echo "**Overall Status:** ❌ NOT READY FOR DEPLOYMENT" >> $REPORT_FILE
  echo "The Market Data Collector application is not ready for deployment to Render. Please address the issues above." >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "## Next Steps" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "1. Address any issues identified in this validation report" >> $REPORT_FILE
echo "2. Run this validation script again to ensure all issues are resolved" >> $REPORT_FILE
echo "3. Follow the deployment instructions in DEPLOYMENT_INSTRUCTIONS.md" >> $REPORT_FILE
echo "4. Monitor the deployment in the Render dashboard" >> $REPORT_FILE
echo "5. Verify the application is working correctly" >> $REPORT_FILE

echo "=========================================================="
echo "Validation complete! Report saved to $REPORT_FILE"
echo "=========================================================="

# Display summary
echo "Validation Score: $PASSED_CHECKS/$TOTAL_CHECKS ($PERCENTAGE%)"
if [ $PERCENTAGE -eq 100 ]; then
  echo "Overall Status: READY FOR DEPLOYMENT"
elif [ $PERCENTAGE -ge 80 ]; then
  echo "Overall Status: MOSTLY READY FOR DEPLOYMENT"
else
  echo "Overall Status: NOT READY FOR DEPLOYMENT"
fi
