# Market Data Collector - Deployment Instructions

This document provides step-by-step instructions for deploying the Market Data Collector application to Render using Docker.

## Prerequisites

Before you begin, ensure you have the following:

1. A Render account (https://render.com)
2. A Firebase project with Realtime Database and Storage enabled
3. API keys for the exchanges you want to use (Binance, Bybit)
4. Git installed on your local machine

## Deployment Steps

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd market-data-collector
```

### 2. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and fill in your specific values:
   ```
   # Firebase configuration
   FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
   FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

   # Email configuration for alerts
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USER=alerts@example.com
   EMAIL_PASSWORD=your-email-password
   ALERT_RECIPIENTS=user@example.com

   # Exchange API keys
   BINANCE_API_KEY=your-binance-api-key
   BINANCE_API_SECRET=your-binance-api-secret
   BYBIT_API_KEY=your-bybit-api-key
   BYBIT_API_SECRET=your-bybit-api-secret
   ```

### 3. Deploy to Render

#### Option 1: Using Render Dashboard

1. Log in to your Render account
2. Create a new "Blueprint" from your GitHub repository
3. Render will automatically detect the `render.yaml` file
4. Create an Environment Group for your secrets:
   - Go to "Environment Groups" in the Render dashboard
   - Create a new group named "market-data-collector-secrets"
   - Add all the environment variables from your `.env` file
5. Link the Environment Group to your Blueprint
6. Deploy the Blueprint

#### Option 2: Using Render CLI

1. Install the Render CLI:
   ```bash
   curl -s https://render.com/download/cli | bash
   ```

2. Log in to Render:
   ```bash
   render login
   ```

3. Deploy using the render.yaml file:
   ```bash
   render blueprint create
   ```

4. Follow the prompts to complete the deployment

### 4. Verify Deployment

1. Once deployment is complete, Render will provide URLs for your services
2. Access the web application URL to verify the frontend is working
3. Check the health endpoint to verify the backend is working:
   ```
   https://your-app-url/health
   ```

4. Check the logs in the Render dashboard to ensure there are no errors

### 5. Set Up Continuous Deployment (Optional)

If you want to enable continuous deployment:

1. Ensure your GitHub repository has the `.github/workflows/render-deploy.yml` file
2. Create a Render API key in the Render dashboard
3. Add the API key as a secret in your GitHub repository:
   - Go to your GitHub repository
   - Navigate to Settings > Secrets and variables > Actions
   - Create a new repository secret named `RENDER_API_KEY`
   - Paste your Render API key as the value

### 6. Configure Backup and Recovery (Optional)

To set up automated backups:

1. SSH into your Render service:
   ```bash
   render ssh <service-name>
   ```

2. Create the backup directories:
   ```bash
   mkdir -p /backups/redis /backups/application /backups/configuration
   ```

3. Set up a cron job for the backup script:
   ```bash
   crontab -e
   ```

4. Add the following line to run daily backups:
   ```
   0 0 * * * /app/backup.sh
   ```

## Troubleshooting

### Common Issues

1. **Deployment fails with environment variable errors**:
   - Ensure all required environment variables are set in your Environment Group
   - Check that the Environment Group is linked to your Blueprint

2. **Application shows "Cannot connect to Redis" error**:
   - Verify that the Redis service is running
   - Check the Redis connection URL in your environment variables

3. **Scheduled jobs are not running**:
   - Check the worker service logs for errors
   - Ensure the worker service is running

4. **API requests fail with authentication errors**:
   - Verify your exchange API keys are correct
   - Check that the Firebase service account has the necessary permissions

### Getting Help

If you encounter issues not covered in this guide:

1. Check the application logs in the Render dashboard
2. Refer to the full documentation in `RENDER_DEPLOYMENT.md`
3. Contact support for assistance

## Next Steps

After successful deployment:

1. Set up monitoring alerts in the Render dashboard
2. Configure custom domains if needed
3. Set up regular backups
4. Test the recovery procedures

## Maintenance

To maintain your deployment:

1. Regularly update dependencies
2. Monitor resource usage
3. Review logs for errors
4. Test backup and recovery procedures periodically
