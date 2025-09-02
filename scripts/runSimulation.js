#!/usr/bin/env node

/**
 * Swift Eats Simulation Runner
 * 
 * Easy-to-use script for running the Swift Eats data simulator
 * with predefined configurations.
 */

const SwiftEatsSimulator = require('./dataSimulator');

// Predefined simulation configurations
const configs = {
    light: {
        maxDrivers: 10,
        eventsPerSecond: 2,
        simulationDurationMinutes: 2,
        description: 'Light load test - 10 drivers, 2 events/sec for 2 minutes'
    },
    medium: {
        maxDrivers: 25,
        eventsPerSecond: 5,
        simulationDurationMinutes: 3,
        description: 'Medium load test - 25 drivers, 5 events/sec for 3 minutes'
    },
    heavy: {
        maxDrivers: 50,
        eventsPerSecond: 10,
        simulationDurationMinutes: 5,
        description: 'Heavy load test - 50 drivers, 10 events/sec for 5 minutes'
    },
    stress: {
        maxDrivers: 100,
        eventsPerSecond: 20,
        simulationDurationMinutes: 2,
        description: 'Stress test - 100 drivers, 20 events/sec for 2 minutes'
    }
};

function showHelp() {
    console.log(`
🎯 Swift Eats Simulation Runner
==============================

Usage: node runSimulation.js [config] [options]

Predefined Configurations:
`);
    
    Object.entries(configs).forEach(([name, config]) => {
        console.log(`  ${name.padEnd(8)} - ${config.description}`);
    });
    
    console.log(`
Options:
  --drivers N      Number of drivers to simulate (default: 50)
  --rate N         Events per second (default: 10)
  --duration N     Duration in minutes (default: 5)
  --gps-port N     GPS service port (default: 3003)
  --order-port N   Order service port (default: 3001)
  --gps-url URL    Custom GPS service URL
  --order-url URL  Custom Order service URL
  --help           Show this help message

Examples:
  node runSimulation.js light                    # Run light configuration
  node runSimulation.js heavy                    # Run heavy configuration
  node runSimulation.js --drivers 30 --rate 8   # Custom configuration
  node runSimulation.js stress --duration 1     # Stress test for 1 minute

Make sure the Swift Eats services are running in Docker:
  docker-compose up -d     # Start all services
  docker-compose ps        # Check service status
`);
}

function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    let config = {};
    let configName = null;
    
    // Check if first argument is a predefined config
    if (args.length > 0 && configs[args[0]]) {
        configName = args[0];
        config = { ...configs[configName] };
        args.shift(); // Remove config name from args
    }
    
    // Parse additional options
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];
        
        switch (key) {
            case '--drivers':
                config.maxDrivers = parseInt(value);
                break;
            case '--rate':
                config.eventsPerSecond = parseInt(value);
                break;
            case '--duration':
                config.simulationDurationMinutes = parseInt(value);
                break;
            case '--gps-port':
                config.gpsServiceUrl = `http://localhost:${value}`;
                break;
            case '--order-port':
                config.orderServiceUrl = `http://localhost:${value}`;
                break;
            case '--gps-url':
                config.gpsServiceUrl = value;
                break;
            case '--order-url':
                config.orderServiceUrl = value;
                break;
        }
    }
    
    return { config, configName };
}

async function main() {
    console.log('🎯 Swift Eats Simulation Runner v1.0.0');
    console.log('=======================================\n');
    
    const { config, configName } = parseArgs();
    
    if (configName) {
        console.log(`📋 Using predefined configuration: ${configName}`);
        console.log(`📝 ${configs[configName].description}\n`);
    } else {
        console.log('📋 Using custom configuration\n');
    }
    
    // Validate configuration
    if (!config.maxDrivers || config.maxDrivers < 1) {
        console.error('❌ Invalid number of drivers. Must be at least 1.');
        process.exit(1);
    }
    
    if (!config.eventsPerSecond || config.eventsPerSecond < 1) {
        console.error('❌ Invalid events per second. Must be at least 1.');
        process.exit(1);
    }
    
    if (!config.simulationDurationMinutes || config.simulationDurationMinutes < 1) {
        console.error('❌ Invalid duration. Must be at least 1 minute.');
        process.exit(1);
    }
    
    // Create and start simulator
    const simulator = new SwiftEatsSimulator(config);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n\n⚡ Received interrupt signal...');
        simulator.stop();
    });
    
    process.on('SIGTERM', () => {
        console.log('\n\n⚡ Received termination signal...');
        simulator.stop();
    });
    
    try {
        await simulator.start();
    } catch (error) {
        console.error('❌ Simulation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { configs };
