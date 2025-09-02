# Swift Eats Data Simulator - Quick Usage Guide

## Getting Started

### 1. Verify Services are Running

Since services are running in Docker containers:

```bash
# Quick health check
npm run docker:test

# Or manually check Docker status
docker-compose ps

# Should show services running on ports:
# - Orders Service: 3001
# - Restaurant Service: 3002
# - GPS Service: 3003
# - Location Service: 3004
# - Driver Assignment: 3005
```

### 2. Run Simulation

```bash
# Light test (10 drivers, 2 events/sec, 2 min)
npm run simulate:light

# Target load (50 drivers, 10 events/sec, 5 min)
npm run simulate:heavy

# Custom configuration
npm run simulate -- --drivers 30 --rate 8 --duration 3
```

### 3. View Results

Results are automatically saved to:
- `simulation_results.txt` - Latest summary
- `simulation_results_YYYY-MM-DD-HH-mm-ss.json` - Detailed report

## Example Output

```
🎯 Swift Eats Data Simulator v1.0.0
====================================

📋 Using predefined configuration: heavy
📝 Heavy load test - 50 drivers, 10 events/sec for 5 minutes

🔍 Checking service health...
   ✅ GPS Service is running
   ✅ Order Service is running

🚀 Starting Swift Eats Load Simulation...
📊 Configuration:
   - Drivers: 50
   - Events per second: 10
   - Duration: 5 minutes
   - Total events expected: 15000

✅ Simulation started! Press Ctrl+C to stop early.

📊 Runtime: 30s | GPS: 1500 (50.0/s) | Orders: 12 | Errors: 0 | Avg Response: 25ms
📊 Runtime: 40s | GPS: 2000 (50.0/s) | Orders: 16 | Errors: 1 | Avg Response: 28ms
...

🛑 Stopping simulation...
📄 Report saved to: simulation_results_2024-01-15T10-35-00-000Z.json
📄 Summary updated in: simulation_results.txt

📊 SIMULATION SUMMARY
=====================
Drivers Simulated: 50
Total Events Generated: 15075
Overall Success Rate: 99.65%
Average Response Time: 45ms
```

## Quick Commands

| Command | Description |
|---------|-------------|
| `npm run simulate:light` | Light load (10 drivers, 2/s) |
| `npm run simulate:medium` | Medium load (25 drivers, 5/s) |
| `npm run simulate:heavy` | Heavy load (50 drivers, 10/s) |
| `npm run simulate:stress` | Stress test (100 drivers, 20/s) |
| `npm run simulate -- --help` | Show all options |

For detailed documentation, see `scripts/README-Simulator.md`.
