#!/usr/bin/env node

/**
 * Docker Services Health Check
 * 
 * Quick utility to test if all Swift Eats Docker services are running
 * and ready for simulation.
 */

const axios = require('axios');

const services = [
    { name: 'Orders Service', url: 'http://localhost:3001/health', required: true },
    { name: 'Restaurant Service', url: 'http://localhost:3002/health', required: false },
    { name: 'GPS Service', url: 'http://localhost:3003/health', required: true },
    { name: 'Location Service', url: 'http://localhost:3004/health', required: false },
    { name: 'Driver Assignment', url: 'http://localhost:3005/health', required: false }
];

async function checkService(service) {
    try {
        const response = await axios.get(service.url, { timeout: 5000 });
        return {
            ...service,
            status: 'healthy',
            responseTime: Date.now(),
            data: response.data
        };
    } catch (error) {
        return {
            ...service,
            status: 'unhealthy',
            error: error.message
        };
    }
}

async function main() {
    console.log('🔍 Checking Swift Eats Docker Services...\n');
    
    const results = await Promise.all(services.map(checkService));
    
    let allHealthy = true;
    let requiredHealthy = true;
    
    results.forEach(result => {
        const icon = result.status === 'healthy' ? '✅' : '❌';
        const required = result.required ? '(required)' : '(optional)';
        
        console.log(`${icon} ${result.name} ${required}`);
        console.log(`   URL: ${result.url}`);
        
        if (result.status === 'healthy') {
            console.log(`   Status: Healthy`);
            if (result.data) {
                console.log(`   Response: ${JSON.stringify(result.data).substring(0, 80)}...`);
            }
        } else {
            console.log(`   Status: ${result.error}`);
            if (result.required) {
                requiredHealthy = false;
            }
            allHealthy = false;
        }
        console.log('');
    });
    
    console.log('📊 SUMMARY');
    console.log('==========');
    
    if (allHealthy) {
        console.log('🎉 All services are healthy and ready for simulation!');
        console.log('\nReady to run:');
        console.log('  npm run simulate:light   # Quick test');
        console.log('  npm run simulate:heavy   # Full load test');
    } else if (requiredHealthy) {
        console.log('⚠️  Some optional services are down, but simulation can proceed');
        console.log('✅ Required services (Orders + GPS) are healthy');
        console.log('\nReady to run:');
        console.log('  npm run simulate:light   # Quick test');
    } else {
        console.log('❌ Required services are not healthy');
        console.log('\nTo start services:');
        console.log('  docker-compose up -d');
        console.log('  docker-compose ps');
        console.log('\nThen run this check again:');
        console.log('  node scripts/docker-test.js');
    }
    
    process.exit(allHealthy ? 0 : 1);
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Health check failed:', error.message);
        process.exit(1);
    });
}

module.exports = { checkService, services };
