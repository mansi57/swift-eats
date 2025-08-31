const { KafkaClient } = require('./kafka');
const kafka = require('kafka-node');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

const getGeoKey = (restaurantLocation) => {
  // Placeholder: derive zone id from location; production would use geohash or grid id
  return process.env.DEFAULT_GEO_KEY || 'default-geo';
};

class DriverAssignmentPublisher {
  constructor(kafkaClient = new KafkaClient()) {
    this.kafka = kafkaClient;
  }

  async publishAssignmentRequested(assignmentRequest) {
    const geoKey = getGeoKey({ 
      latitude: assignmentRequest.restaurantLatitude, 
      longitude: assignmentRequest.restaurantLongitude 
    });
    const topic = `driver_assignment.requests.${geoKey}`;
    const payload = {
      eventId: uuidv4(),
      eventType: 'AssignmentRequested',
      occurredAt: new Date().toISOString(),
      ...assignmentRequest,
      geoKey
    };

    await this.kafka.send({ topic, key: assignmentRequest.orderId, messages: payload });
    logger.info('Published AssignmentRequested', { topic, orderId: assignmentRequest.orderId, geoKey });
    return payload;
  }
}

class AssignmentEventsConsumer {
  constructor({ geoKey, onAssigned, onFailed, kafkaClient = new KafkaClient() }) {
    this.geoKey = geoKey || process.env.DEFAULT_GEO_KEY || 'default-geo';
    this.onAssigned = onAssigned;
    this.onFailed = onFailed;
    this.consumer = null;
  }

  start() {
    const topic = `driver_assignment.responses`;
    
    console.log('🎯 Order Service: Starting assignment events consumer...');
    
    // Use kafka-node ConsumerGroup directly
    this.consumer = new kafka.ConsumerGroup({
      kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
      groupId: 'orders-service-assignment-responses',
      sessionTimeout: 15000,
      protocol: ['roundrobin'],
      fromOffset: 'earliest',
      outOfRangeOffset: 'earliest'
    }, [topic]);

    this.consumer.on('connect', () => {
      console.log('✅ Order Service: Assignment events consumer connected');
    });

    this.consumer.on('message', async (message) => {
      try {
        console.log('📨 Order Service: Received assignment response:', {
          topic: message.topic,
          partition: message.partition,
          offset: message.offset
        });
        
        const event = JSON.parse(message.value);
        console.log('📨 Order Service: Parsed assignment event:', event);
        
        if (event.status === 'assigned' && this.onAssigned) {
          console.log('✅ Order Service: Processing driver assigned event');
          await this.onAssigned(event);
        } else if (event.status === 'failed' && this.onFailed) {
          console.log('❌ Order Service: Processing assignment failed event');
          await this.onFailed(event);
        }
      } catch (err) {
        console.error('❌ Order Service: Error handling assignment event:', err);
        logger.error('Error handling assignment event', { error: err.message });
      }
    });

    this.consumer.on('error', (error) => {
      console.error('❌ Order Service: Assignment consumer error:', error);
    });

    logger.info(`Listening for assignment responses on ${topic}`);
  }
}

module.exports = {
  DriverAssignmentPublisher,
  AssignmentEventsConsumer
};


