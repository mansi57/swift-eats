const kafka = require('kafka-node');
const logger = require('./logger');

const DEFAULT_BROKERS = process.env.KAFKA_BROKERS || 'localhost:9092';

class KafkaClient {
  constructor(brokers = DEFAULT_BROKERS) {
    this.kafkaClient = new kafka.KafkaClient({ kafkaHost: brokers });
    this.producer = new kafka.Producer(this.kafkaClient, { requireAcks: 1 });
    this.ready = false;

    this.producer.on('ready', () => {
      this.ready = true;
      logger.info('✅ Kafka producer ready');
    });

    this.producer.on('error', (err) => {
      logger.error('Kafka producer error', { error: err.message });
    });
  }

  async send({ topic, messages, key, headers }) {
    if (!this.ready) {
      await new Promise((resolve) => {
        this.producer.once('ready', resolve);
      });
    }

    const payloads = [
      {
        topic,
        messages: [
          new kafka.KeyedMessage(key || null, typeof messages === 'string' ? messages : JSON.stringify(messages))
        ]
      }
    ];

    return new Promise((resolve, reject) => {
      this.producer.send(payloads, (err, data) => {
        if (err) {
          logger.error('Kafka send error', { topic, error: err.message });
          return reject(err);
        }
        logger.debug('Kafka message sent', { topic, data });
        resolve(data);
      });
    });
  }

  createConsumerGroup({ groupId, topics }) {
    const options = {
      kafkaHost: DEFAULT_BROKERS,
      groupId,
      fromOffset: 'latest',
      encoding: 'utf8',
      keyEncoding: 'utf8'
    };
    const consumer = new kafka.ConsumerGroup(options, topics);

    consumer.on('error', (err) => {
      logger.error('Kafka consumer error', { groupId, error: err.message });
    });

    consumer.on('connect', () => {
      logger.info(`✅ Kafka consumer connected (group=${groupId})`);
    });

    return consumer;
  }
}

module.exports = {
  KafkaClient
};


