const amqp = require('amqplib');
const Redis = require('ioredis');
const consul = require('consul');
const { Kafka } = require('kafkajs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

class MicroservicesOrchestrator {
  constructor() {
    this.services = new Map();
    this.messageQueue = null;
    this.cache = null;
    this.serviceRegistry = null;
    this.eventBus = null;
    
    this.config = {
      rabbitmq: {
        url: process.env.RABBITMQ_URL || 'amqp://localhost:5672'
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      consul: {
        host: process.env.CONSUL_HOST || 'localhost',
        port: process.env.CONSUL_PORT || 8500
      },
      kafka: {
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
        clientId: 'fixzit-orchestrator'
      }
    };

    this.initialize();
  }

  async initialize() {
    // Initialize message queue
    await this.initializeMessageQueue();
    
    // Initialize cache
    this.initializeCache();
    
    // Initialize service registry
    this.initializeServiceRegistry();
    
    // Initialize event bus
    await this.initializeEventBus();
    
    // Register core services
    this.registerCoreServices();
  }

  // Initialize RabbitMQ for message queuing
  async initializeMessageQueue() {
    try {
      const connection = await amqp.connect(this.config.rabbitmq.url);
      this.messageQueue = await connection.createChannel();
      
      // Create exchanges
      await this.messageQueue.assertExchange('fixzit.direct', 'direct', { durable: true });
      await this.messageQueue.assertExchange('fixzit.topic', 'topic', { durable: true });
      await this.messageQueue.assertExchange('fixzit.fanout', 'fanout', { durable: true });
      
      console.log('Message queue initialized');
    } catch (error) {
      console.error('Failed to initialize message queue:', error);
    }
  }

  // Initialize Redis for caching and pub/sub
  initializeCache() {
    this.cache = new Redis(this.config.redis);
    
    this.cache.on('connect', () => {
      console.log('Cache connected');
    });
    
    this.cache.on('error', (error) => {
      console.error('Cache error:', error);
    });
  }

  // Initialize Consul for service discovery
  initializeServiceRegistry() {
    this.serviceRegistry = consul(this.config.consul);
    
    // Health check endpoint
    this.registerHealthCheck();
  }

  // Initialize Kafka for event streaming
  async initializeEventBus() {
    this.eventBus = new Kafka(this.config.kafka);
    
    this.producer = this.eventBus.producer();
    await this.producer.connect();
    
    this.consumer = this.eventBus.consumer({ groupId: 'fixzit-group' });
    await this.consumer.connect();
    
    console.log('Event bus initialized');
  }

  // Register a microservice
  async registerService(serviceConfig) {
    const { name, host, port, version, healthCheck, capabilities } = serviceConfig;
    
    const serviceId = `${name}-${host}-${port}`;
    
    // Register with Consul
    await this.serviceRegistry.agent.service.register({
      id: serviceId,
      name,
      address: host,
      port,
      tags: [`version:${version}`, ...capabilities],
      check: {
        http: `http://${host}:${port}${healthCheck}`,
        interval: '10s',
        timeout: '5s'
      }
    });

    // Store service info
    this.services.set(serviceId, {
      ...serviceConfig,
      status: 'healthy',
      lastHealthCheck: new Date()
    });

    // Announce service registration
    await this.publishEvent('service.registered', { serviceId, name, capabilities });
    
    console.log(`Service registered: ${name} at ${host}:${port}`);
    
    return serviceId;
  }

  // Discover services
  async discoverService(serviceName, version = null) {
    const services = await this.serviceRegistry.health.service(serviceName);
    
    const healthyServices = services
      .filter(s => s.Checks.every(check => check.Status === 'passing'))
      .map(s => ({
        id: s.Service.ID,
        address: s.Service.Address,
        port: s.Service.Port,
        version: s.Service.Tags.find(t => t.startsWith('version:'))?.split(':')[1]
      }));

    if (version) {
      return healthyServices.filter(s => s.version === version);
    }

    return healthyServices;
  }

  // Load balancer for service calls
  async callService(serviceName, method, data, options = {}) {
    const services = await this.discoverService(serviceName);
    
    if (services.length === 0) {
      throw new Error(`No healthy instances of ${serviceName} found`);
    }

    // Round-robin load balancing
    const service = services[Math.floor(Math.random() * services.length)];
    
    // Check cache first
    const cacheKey = `${serviceName}:${method}:${JSON.stringify(data)}`;
    if (options.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Make the call
    const result = await this.makeServiceCall(service, method, data, options);
    
    // Cache result
    if (options.cache) {
      await this.cache.setex(cacheKey, options.cacheTTL || 300, JSON.stringify(result));
    }

    return result;
  }

  // Make actual service call (HTTP/gRPC)
  async makeServiceCall(service, method, data, options) {
    if (options.protocol === 'grpc') {
      return this.makeGRPCCall(service, method, data);
    }
    
    // Default to HTTP
    const axios = require('axios');
    const response = await axios({
      method: options.httpMethod || 'POST',
      url: `http://${service.address}:${service.port}${method}`,
      data,
      headers: {
        'X-Service-Version': service.version,
        'X-Request-ID': options.requestId || this.generateRequestId()
      },
      timeout: options.timeout || 5000
    });

    return response.data;
  }

  // gRPC call implementation
  async makeGRPCCall(service, method, data) {
    const protoPath = path.join(__dirname, `../protos/${service.name}.proto`);
    const packageDefinition = protoLoader.loadSync(protoPath);
    const proto = grpc.loadPackageDefinition(packageDefinition);
    
    const client = new proto[service.name](
      `${service.address}:${service.port}`,
      grpc.credentials.createInsecure()
    );

    return new Promise((resolve, reject) => {
      client[method](data, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }

  // Publish message to queue
  async publishMessage(queue, message, options = {}) {
    await this.messageQueue.assertQueue(queue, { durable: true });
    
    const messageBuffer = Buffer.from(JSON.stringify({
      ...message,
      timestamp: new Date(),
      correlationId: options.correlationId || this.generateRequestId()
    }));

    this.messageQueue.sendToQueue(queue, messageBuffer, {
      persistent: true,
      ...options
    });
  }

  // Subscribe to queue
  async subscribeToQueue(queue, handler, options = {}) {
    await this.messageQueue.assertQueue(queue, { durable: true });
    
    this.messageQueue.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          this.messageQueue.ack(msg);
        } catch (error) {
          console.error(`Error processing message from ${queue}:`, error);
          
          if (options.retry && msg.fields.deliveryTag < (options.maxRetries || 3)) {
            this.messageQueue.nack(msg, false, true);
          } else {
            this.messageQueue.nack(msg, false, false);
            
            // Send to dead letter queue
            if (options.deadLetterQueue) {
              await this.publishMessage(options.deadLetterQueue, {
                originalQueue: queue,
                error: error.message,
                message: JSON.parse(msg.content.toString())
              });
            }
          }
        }
      }
    });
  }

  // Publish event to Kafka
  async publishEvent(topic, event, key = null) {
    await this.producer.send({
      topic,
      messages: [{
        key,
        value: JSON.stringify({
          ...event,
          timestamp: new Date(),
          source: 'orchestrator'
        })
      }]
    });
  }

  // Subscribe to events
  async subscribeToEvents(topics, handler) {
    await this.consumer.subscribe({ topics, fromBeginning: false });
    
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        await handler(topic, event);
      }
    });
  }

  // Circuit breaker implementation
  createCircuitBreaker(service, options = {}) {
    const CircuitBreaker = require('opossum');
    
    const breaker = new CircuitBreaker(
      async (method, data) => this.callService(service, method, data),
      {
        timeout: options.timeout || 3000,
        errorThresholdPercentage: options.errorThreshold || 50,
        resetTimeout: options.resetTimeout || 30000,
        volumeThreshold: options.volumeThreshold || 10
      }
    );

    breaker.on('open', () => {
      console.log(`Circuit breaker opened for ${service}`);
      this.publishEvent('circuit.opened', { service });
    });

    breaker.on('halfOpen', () => {
      console.log(`Circuit breaker half-open for ${service}`);
    });

    return breaker;
  }

  // Distributed tracing
  startTrace(operationName) {
    const tracer = require('jaeger-client').initTracer({
      serviceName: 'fixzit-orchestrator',
      reporter: {
        agentHost: process.env.JAEGER_HOST || 'localhost',
        agentPort: process.env.JAEGER_PORT || 6831
      }
    });

    return tracer.startSpan(operationName);
  }

  // Saga orchestration for distributed transactions
  async executeSaga(sagaDefinition, context) {
    const { steps } = sagaDefinition;
    const executedSteps = [];
    
    try {
      for (const step of steps) {
        const result = await this.executeStep(step, context);
        executedSteps.push({ step, result });
        context[step.name] = result;
      }
      
      return { success: true, results: context };
    } catch (error) {
      // Compensate in reverse order
      for (const executed of executedSteps.reverse()) {
        if (executed.step.compensate) {
          try {
            await this.executeStep(executed.step.compensate, context);
          } catch (compensateError) {
            console.error('Compensation failed:', compensateError);
          }
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  // Execute a saga step
  async executeStep(step, context) {
    const { service, method, data } = step;
    const processedData = this.processTemplate(data, context);
    return await this.callService(service, method, processedData);
  }

  // Process data template with context
  processTemplate(template, context) {
    if (typeof template === 'string') {
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => context[key]);
    }
    
    if (typeof template === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.processTemplate(value, context);
      }
      return result;
    }
    
    return template;
  }

  // Health check for all services
  async healthCheck() {
    const health = {
      status: 'healthy',
      services: {},
      timestamp: new Date()
    };

    for (const [serviceId, service] of this.services) {
      try {
        const response = await axios.get(
          `http://${service.host}:${service.port}${service.healthCheck}`,
          { timeout: 2000 }
        );
        
        health.services[serviceId] = {
          status: 'healthy',
          responseTime: response.headers['x-response-time'] || 'N/A'
        };
      } catch (error) {
        health.services[serviceId] = {
          status: 'unhealthy',
          error: error.message
        };
        health.status = 'degraded';
      }
    }

    return health;
  }

  // Register core services
  registerCoreServices() {
    const coreServices = [
      {
        name: 'auth-service',
        capabilities: ['authentication', 'authorization', 'sso']
      },
      {
        name: 'property-service',
        capabilities: ['property-management', 'tenant-management']
      },
      {
        name: 'maintenance-service',
        capabilities: ['work-orders', 'preventive-maintenance']
      },
      {
        name: 'finance-service',
        capabilities: ['invoicing', 'payments', 'accounting']
      },
      {
        name: 'notification-service',
        capabilities: ['email', 'sms', 'push', 'whatsapp']
      },
      {
        name: 'analytics-service',
        capabilities: ['reporting', 'ml-predictions', 'insights']
      },
      {
        name: 'iot-service',
        capabilities: ['device-management', 'data-collection', 'automation']
      }
    ];

    // Register each service type
    coreServices.forEach(service => {
      this.services.set(service.name, {
        ...service,
        instances: [],
        loadBalancer: 'round-robin'
      });
    });
  }

  // Generate unique request ID
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Graceful shutdown
  async shutdown() {
    console.log('Shutting down microservices orchestrator...');
    
    // Close connections
    if (this.messageQueue) await this.messageQueue.close();
    if (this.cache) await this.cache.quit();
    if (this.producer) await this.producer.disconnect();
    if (this.consumer) await this.consumer.disconnect();
    
    // Deregister services
    for (const [serviceId] of this.services) {
      await this.serviceRegistry.agent.service.deregister(serviceId);
    }
    
    console.log('Orchestrator shutdown complete');
  }
}

module.exports = new MicroservicesOrchestrator();