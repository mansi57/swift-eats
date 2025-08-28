#!/usr/bin/env node

/**
 * Health check script for Swift Eats microservices
 * Used by Docker HEALTHCHECK directive
 */

const http = require('http');
const url = require('url');

const port = process.env.PORT || 3000;
const serviceName = process.env.SERVICE_NAME || 'unknown-service';

// Health check endpoint
const healthCheckUrl = `http://localhost:${port}/health`;

function checkHealth() {
    return new Promise((resolve, reject) => {
        const req = http.get(healthCheckUrl, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const healthData = JSON.parse(data);
                    
                    if (res.statusCode === 200 && healthData.status === 'healthy') {
                        console.log(`${serviceName} health check: OK`);
                        resolve(true);
                    } else {
                        console.error(`${serviceName} health check: FAILED - Status: ${healthData.status}`);
                        reject(new Error(`Service unhealthy: ${healthData.status}`));
                    }
                } catch (error) {
                    console.error(`${serviceName} health check: FAILED - Invalid JSON response`);
                    reject(error);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error(`${serviceName} health check: FAILED - Connection error:`, error.message);
            reject(error);
        });
        
        req.setTimeout(5000, () => {
            console.error(`${serviceName} health check: FAILED - Timeout`);
            req.destroy();
            reject(new Error('Health check timeout'));
        });
    });
}

// Run health check
checkHealth()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Health check failed:', error.message);
        process.exit(1);
    });

