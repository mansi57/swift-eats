const { KafkaClient } = require('./kafka');
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
    this.kafka = kafkaClient;
    this.consumer = null;
  }

  start() {
    const topic = `driver_assignment.responses`;
    this.consumer = this.kafka.createConsumerGroup({
      groupId: `orders-service-assignment-responses`,
      topics: [topic]
    });

    this.consumer.on('message', async (message) => {
      try {
        const event = JSON.parse(message.value);
        
        if (event.status === 'assigned' && this.onAssigned) {
          await this.onAssigned(event);
        } else if (event.status === 'failed' && this.onFailed) {
          await this.onFailed(event);
        }
      } catch (err) {
        logger.error('Error handling assignment event', { error: err.message });
      }
    });

    logger.info(`Listening for assignment responses on ${topic}`);
  }
}

module.exports = {
  DriverAssignmentPublisher,
  AssignmentEventsConsumer
};


