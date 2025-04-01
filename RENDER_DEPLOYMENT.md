# Market Data Collector - Render Docker Deployment Documentation

## Overview

This document provides comprehensive documentation for deploying the Market Data Collector application using Docker on Render. The application has been fully adapted from its original Netlify serverless architecture to a containerized Docker deployment that provides 24/7 remote access to all functions.

## Architecture

The Market Data Collector application is deployed as a multi-container Docker application with the following components:

1. **Web Application Container**: Serves the React frontend and API endpoints
2. **Worker Container**: Handles scheduled jobs and background processing
3. **Redis Database**: Provides caching, job queues, and data persistence

### Component Diagram

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│  Web Application│     │  Worker Service │
│  (Express + React)    │  (Background Jobs)
│                 │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │                       │
         │      ┌────────────────┘
         │      │
         ▼      ▼
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│  Redis Database │     │  Firebase Storage│
│  (Data & Queues)│     │  (Cloud Storage) │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
```

## Deployment Files

The following files are used for deployment:

- `Dockerfile`: Multi-stage build for the web application
- `Dockerfile.worker`: Configuration for the worker service
- `docker-compose.yml`: Local development and testing configuration
- `render.yaml`: Render deployment configuration
- `docker-network.yml`: Network configuration for Docker containers
- `security-config.yml`: Security measures for Docker deployment
- `backup-recovery.yml`: Backup and recovery procedures
- `.env.example`: Template for environment variables
- `.dockerignore`: Files to exclude from Docker build context

## Environment Variables

The application requires the following environment variables:

### Server Configuration
- `PORT`: Port for the web server (default: 8080)
- `NODE_ENV`: Environment (production, development)

### Firebase Configuration
- `FIREBASE_DATABASE_URL`: Firebase Realtime Database URL
- `FIREBASE_STORAGE_BUCKET`: Firebase Storage bucket name
- `FIREBASE_SERVICE_ACCOUNT`: Firebase service account JSON

### Redis Configuration
- `REDIS_URL`: Redis connection URL

### Email Configuration
- `EMAIL_HOST`: SMTP server host
- `EMAIL_PORT`: SMTP server port
- `EMAIL_USER`: SMTP username
- `EMAIL_PASSWORD`: SMTP password
- `ALERT_RECIPIENTS`: Comma-separated list of alert recipients

### API Configuration
- `API_RATE_LIMIT`: Rate limit for API requests
- `API_TIMEOUT`: API request timeout in milliseconds

### Exchange API Keys
- `BINANCE_API_KEY`: Binance API key
- `BINANCE_API_SECRET`: Binance API secret
- `BYBIT_API_KEY`: Bybit API key
- `BYBIT_API_SECRET`: Bybit API secret

### Data Collection Configuration
- `DEFAULT_SYMBOLS`: Default trading symbols
- `DEFAULT_TIMEFRAMES`: Default timeframes
- `DEFAULT_LOOKBACK_DAYS`: Default lookback period
- `MAX_CONCURRENT_REQUESTS`: Maximum concurrent API requests

### Monitoring Configuration
- `MONITORING_ENABLED`: Enable monitoring
- `ALERT_THRESHOLD_CPU`: CPU usage alert threshold
- `ALERT_THRESHOLD_MEMORY`: Memory usage alert threshold
- `ALERT_THRESHOLD_DISK`: Disk usage alert threshold
- `ALERT_THRESHOLD_ERROR_RATE`: Error rate alert threshold

## Deployment to Render

### Prerequisites

1. A Render account
2. A Firebase project with Realtime Database and Storage
3. API keys for the exchanges you want to use

### Deployment Steps

1. **Create a new Render Blueprint**:
   - Push the code to a GitHub repository
   - Connect your Render account to GitHub
   - Create a new Blueprint using the `render.yaml` file

2. **Set up Environment Variables**:
   - Create a new Environment Group in Render
   - Add all required environment variables from the `.env.example` file
   - Link the Environment Group to your Blueprint

3. **Deploy the Blueprint**:
   - Render will automatically create the web service, worker, and Redis database
   - The deployment will take a few minutes to complete

4. **Verify Deployment**:
   - Check the deployment logs for any errors
   - Access the web application URL provided by Render
   - Verify that the health check endpoint returns a 200 status

## Security Measures

The application includes the following security measures:

1. **HTTPS**: All traffic is encrypted using HTTPS
2. **Content Security Policy**: Restricts resource loading to trusted sources
3. **Rate Limiting**: Prevents abuse of the API
4. **Authentication**: JWT-based authentication for API access
5. **Docker Security**: Non-root user, capability restrictions, read-only filesystem
6. **Secrets Management**: Environment variables for sensitive information
7. **Dependency Security**: Regular updates and vulnerability scanning

## Backup and Recovery

The application includes comprehensive backup and recovery procedures:

1. **Scheduled Backups**: Daily backups of Redis data, application data, and configuration
2. **Backup Storage**: Local and cloud storage options with encryption
3. **Recovery Procedures**: Automated and manual recovery options
4. **Disaster Recovery**: Cross-region replication and alternative deployment

## Monitoring and Alerts

The application includes a monitoring system that tracks:

1. **System Metrics**: CPU, memory, disk usage
2. **Application Metrics**: Error rates, job performance, API performance
3. **Alerts**: Email notifications for threshold violations

## Continuous Deployment

The application is set up for continuous deployment using GitHub Actions:

1. **GitHub Workflow**: Automatically deploys to Render on push to main branch
2. **Render CLI**: Uses the Render CLI for deployment
3. **API Key**: Securely stored in GitHub Secrets

## Networking

The application uses a dedicated Docker network with:

1. **Bridge Network**: Isolated network for containers
2. **Fixed IP Addresses**: Predictable addressing for services
3. **Security Rules**: Restricted traffic between containers

## Troubleshooting

### Common Issues

1. **Application not starting**:
   - Check the logs for errors
   - Verify that all environment variables are set correctly
   - Ensure Redis is running and accessible

2. **Scheduled jobs not running**:
   - Check the worker logs for errors
   - Verify that Redis is running and accessible
   - Ensure the worker container is running

3. **API errors**:
   - Check the application logs for errors
   - Verify that the exchange API keys are valid
   - Check rate limits on the exchange APIs

### Logs

- Web Application Logs: Available in the Render dashboard
- Worker Logs: Available in the Render dashboard
- Redis Logs: Available in the Render dashboard

## Support

For support, please contact the development team or refer to the GitHub repository issues section.

## License

This application is proprietary and confidential. Unauthorized use, distribution, or modification is prohibited.
