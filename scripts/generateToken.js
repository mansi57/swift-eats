#!/usr/bin/env node

/**
 * JWT Token Generator for Swift Eats
 * 
 * Generates valid JWT tokens for testing and simulation purposes.
 */

const jwt = require('jsonwebtoken');

// Use the same JWT secret as in docker-compose.yml
const JWT_SECRET = 'your_jwt_secret_key_here_development_only';

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role || 'customer'
    };

    const options = {
        expiresIn: '24h',
        issuer: 'swift-eats',
        audience: 'swift-eats-api'
    };

    return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verify a JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw new Error(`Invalid token: ${error.message}`);
    }
}

/**
 * Generate tokens for simulation users
 */
function generateSimulationTokens() {
    const users = [
        { id: 'sim_customer_1', email: 'customer1@simulator.com', role: 'customer' },
        { id: 'sim_customer_2', email: 'customer2@simulator.com', role: 'customer' },
        { id: 'sim_customer_3', email: 'customer3@simulator.com', role: 'customer' },
        { id: 'sim_customer_4', email: 'customer4@simulator.com', role: 'customer' },
        { id: 'sim_customer_5', email: 'customer5@simulator.com', role: 'customer' }
    ];

    const tokens = {};
    users.forEach(user => {
        tokens[user.id] = generateToken(user);
    });

    return tokens;
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🔐 Swift Eats JWT Token Generator
================================

Usage:
  node scripts/generateToken.js [options]

Options:
  --user-id ID     Generate token for specific user ID (default: sim_customer_1)
  --email EMAIL    User email (default: customer@simulator.com)
  --role ROLE      User role: customer, driver, admin (default: customer)
  --verify TOKEN   Verify an existing token
  --simulation     Generate multiple tokens for simulation
  --help           Show this help

Examples:
  node scripts/generateToken.js
  node scripts/generateToken.js --user-id customer_123 --email john@example.com
  node scripts/generateToken.js --simulation
  node scripts/generateToken.js --verify eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
`);
        process.exit(0);
    }

    if (args.includes('--simulation')) {
        console.log('🔐 Generating simulation tokens...\n');
        const tokens = generateSimulationTokens();
        
        Object.entries(tokens).forEach(([userId, token]) => {
            console.log(`${userId}:`);
            console.log(`  Token: ${token}`);
            console.log(`  Header: Authorization: Bearer ${token}`);
            console.log('');
        });
        
        console.log('✅ Simulation tokens generated successfully!');
        console.log('💡 Copy any token above to use in your simulator or API calls.\n');
        return;
    }

    const verifyIndex = args.indexOf('--verify');
    if (verifyIndex !== -1 && args[verifyIndex + 1]) {
        const token = args[verifyIndex + 1];
        try {
            const decoded = verifyToken(token);
            console.log('✅ Token is valid!');
            console.log('📋 Token details:');
            console.log(JSON.stringify(decoded, null, 2));
        } catch (error) {
            console.log('❌ Token verification failed:', error.message);
            process.exit(1);
        }
        return;
    }

    // Generate single token
    const userIdIndex = args.indexOf('--user-id');
    const emailIndex = args.indexOf('--email');
    const roleIndex = args.indexOf('--role');

    const user = {
        id: userIdIndex !== -1 ? args[userIdIndex + 1] : 'sim_customer_1',
        email: emailIndex !== -1 ? args[emailIndex + 1] : 'customer@simulator.com',
        role: roleIndex !== -1 ? args[roleIndex + 1] : 'customer'
    };

    const token = generateToken(user);

    console.log('🔐 JWT Token Generated');
    console.log('=====================');
    console.log(`User ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log('');
    console.log('Token:');
    console.log(token);
    console.log('');
    console.log('Authorization Header:');
    console.log(`Authorization: Bearer ${token}`);
    console.log('');
    console.log('✅ Token generated successfully! Valid for 24 hours.');
}

module.exports = {
    generateToken,
    verifyToken,
    generateSimulationTokens,
    JWT_SECRET
};
