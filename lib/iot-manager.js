const mqtt = require('mqtt');
const WebSocket = require('ws');
const EventEmitter = require('events');

class IoTManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      mqtt: {
        broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883',
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        clientId: process.env.MQTT_CLIENT_ID || `fixzit_${Date.now()}`,
      },
      websocket: {
        port: process.env.WS_PORT || 8080,
      },
      ...options
    };

    this.mqttClient = null;
    this.wsServer = null;
    this.devices = new Map();
    this.sensors = new Map();
    this.rules = new Map();
    this.alerts = [];
    
    this.deviceTypes = {
      TEMPERATURE_SENSOR: 'temperature_sensor',
      HUMIDITY_SENSOR: 'humidity_sensor',
      MOTION_DETECTOR: 'motion_detector',
      DOOR_SENSOR: 'door_sensor',
      SMOKE_DETECTOR: 'smoke_detector',
      WATER_LEAK_SENSOR: 'water_leak_sensor',
      ENERGY_METER: 'energy_meter',
      SMART_LOCK: 'smart_lock',
      HVAC_CONTROLLER: 'hvac_controller',
      LIGHTING_CONTROLLER: 'lighting_controller',
      SECURITY_CAMERA: 'security_camera',
      ACCESS_CONTROL: 'access_control',
      ELEVATOR_SENSOR: 'elevator_sensor',
      PARKING_SENSOR: 'parking_sensor',
      AIR_QUALITY_SENSOR: 'air_quality_sensor'
    };

    this.initialize();
  }

  async initialize() {
    try {
      await this.connectMQTT();
      this.setupWebSocketServer();
      this.loadDevices();
      this.loadAutomationRules();
      
      console.log('✅ IoT Manager initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ IoT Manager initialization failed:', error);
      this.emit('error', error);
    }
  }

  // MQTT Connection
  async connectMQTT() {
    return new Promise((resolve, reject) => {
      this.mqttClient = mqtt.connect(this.config.mqtt.broker, {
        username: this.config.mqtt.username,
        password: this.config.mqtt.password,
        clientId: this.config.mqtt.clientId,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      });

      this.mqttClient.on('connect', () => {
        console.log('✅ MQTT Connected');
        this.subscribeToTopics();
        resolve();
      });

      this.mqttClient.on('message', (topic, message) => {
        this.handleMQTTMessage(topic, message);
      });

      this.mqttClient.on('error', (error) => {
        console.error('❌ MQTT Error:', error);
        reject(error);
      });

      this.mqttClient.on('offline', () => {
        console.warn('⚠️ MQTT Offline');
        this.emit('mqtt_offline');
      });

      this.mqttClient.on('reconnect', () => {
        console.log('🔄 MQTT Reconnecting');
        this.emit('mqtt_reconnecting');
      });
    });
  }

  subscribeToTopics() {
    const topics = [
      'fixzit/+/+/data',        // fixzit/{propertyId}/{deviceId}/data
      'fixzit/+/+/status',      // fixzit/{propertyId}/{deviceId}/status
      'fixzit/+/+/alert',       // fixzit/{propertyId}/{deviceId}/alert
      'fixzit/system/+',        // System-wide topics
    ];

    topics.forEach(topic => {
      this.mqttClient.subscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`📡 Subscribed to ${topic}`);
        }
      });
    });
  }

  handleMQTTMessage(topic, message) {
    try {
      const topicParts = topic.split('/');
      const data = JSON.parse(message.toString());
      
      if (topicParts[0] === 'fixzit') {
        const propertyId = topicParts[1];
        const deviceId = topicParts[2];
        const messageType = topicParts[3];

        switch (messageType) {
          case 'data':
            this.handleSensorData(propertyId, deviceId, data);
            break;
          case 'status':
            this.handleDeviceStatus(propertyId, deviceId, data);
            break;
          case 'alert':
            this.handleDeviceAlert(propertyId, deviceId, data);
            break;
        }
      }
    } catch (error) {
      console.error('Error handling MQTT message:', error);
    }
  }

  // WebSocket Server for Real-time Updates
  setupWebSocketServer() {
    this.wsServer = new WebSocket.Server({ 
      port: this.config.websocket.port,
      path: '/iot'
    });

    this.wsServer.on('connection', (ws, req) => {
      console.log('🔌 IoT WebSocket client connected');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 IoT WebSocket client disconnected');
      });

      // Send initial device status
      this.sendDeviceStatus(ws);
    });
  }

  handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'subscribe':
        this.subscribeToDevice(ws, data.deviceId);
        break;
      case 'control':
        this.controlDevice(data.deviceId, data.command, data.parameters);
        break;
      case 'get_devices':
        this.sendDeviceList(ws, data.propertyId);
        break;
    }
  }

  // Device Management
  async registerDevice(deviceData) {
    const device = {
      id: deviceData.id,
      propertyId: deviceData.propertyId,
      name: deviceData.name,
      type: deviceData.type,
      location: deviceData.location,
      capabilities: deviceData.capabilities || [],
      metadata: deviceData.metadata || {},
      status: 'offline',
      lastSeen: null,
      batteryLevel: null,
      firmwareVersion: deviceData.firmwareVersion,
      registeredAt: new Date(),
      ...deviceData
    };

    this.devices.set(device.id, device);
    await this.saveDeviceToDatabase(device);
    
    this.emit('device_registered', device);
    this.broadcastToWebSockets('device_registered', device);
    
    return device;
  }

  async updateDevice(deviceId, updates) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    Object.assign(device, updates, { updatedAt: new Date() });
    this.devices.set(deviceId, device);
    
    await this.updateDeviceInDatabase(deviceId, updates);
    this.emit('device_updated', device);
    this.broadcastToWebSockets('device_updated', device);
    
    return device;
  }

  async removeDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    this.devices.delete(deviceId);
    await this.removeDeviceFromDatabase(deviceId);
    
    this.emit('device_removed', { deviceId });
    this.broadcastToWebSockets('device_removed', { deviceId });
  }

  // Sensor Data Processing
  handleSensorData(propertyId, deviceId, data) {
    const device = this.devices.get(deviceId);
    if (!device) {
      console.warn(`Received data from unknown device: ${deviceId}`);
      return;
    }

    const sensorReading = {
      deviceId,
      propertyId,
      timestamp: new Date(data.timestamp || Date.now()),
      values: data.values || data,
      metadata: data.metadata || {}
    };

    // Store sensor reading
    this.storeSensorReading(sensorReading);
    
    // Update device status
    device.lastSeen = sensorReading.timestamp;
    device.status = 'online';
    if (data.batteryLevel) device.batteryLevel = data.batteryLevel;
    
    // Process automation rules
    this.processAutomationRules(sensorReading);
    
    // Emit events
    this.emit('sensor_data', sensorReading);
    this.broadcastToWebSockets('sensor_data', sensorReading);
    
    // Check for alerts
    this.checkAlertConditions(device, sensorReading);
  }

  handleDeviceStatus(propertyId, deviceId, statusData) {
    const device = this.devices.get(deviceId);
    if (!device) return;

    device.status = statusData.status;
    device.lastSeen = new Date();
    
    if (statusData.batteryLevel) device.batteryLevel = statusData.batteryLevel;
    if (statusData.firmwareVersion) device.firmwareVersion = statusData.firmwareVersion;
    if (statusData.metadata) Object.assign(device.metadata, statusData.metadata);

    this.emit('device_status', { deviceId, status: statusData });
    this.broadcastToWebSockets('device_status', { deviceId, status: statusData });
  }

  handleDeviceAlert(propertyId, deviceId, alertData) {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId,
      propertyId,
      type: alertData.type,
      severity: alertData.severity || 'medium',
      message: alertData.message,
      data: alertData.data || {},
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);
    this.emit('device_alert', alert);
    this.broadcastToWebSockets('device_alert', alert);
    
    // Create work order for critical alerts
    if (alert.severity === 'critical') {
      this.createAlertWorkOrder(alert);
    }
  }

  // Device Control
  async controlDevice(deviceId, command, parameters = {}) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    const controlMessage = {
      command,
      parameters,
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    const topic = `fixzit/${device.propertyId}/${deviceId}/control`;
    
    return new Promise((resolve, reject) => {
      this.mqttClient.publish(topic, JSON.stringify(controlMessage), (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`📤 Control command sent to ${deviceId}: ${command}`);
          resolve(controlMessage);
        }
      });
    });
  }

  // Smart Building Automation
  createAutomationRule(ruleData) {
    const rule = {
      id: ruleData.id || `rule_${Date.now()}`,
      name: ruleData.name,
      description: ruleData.description,
      propertyId: ruleData.propertyId,
      enabled: ruleData.enabled !== false,
      conditions: ruleData.conditions, // Array of conditions
      actions: ruleData.actions, // Array of actions
      schedule: ruleData.schedule, // Optional schedule
      createdAt: new Date(),
      ...ruleData
    };

    this.rules.set(rule.id, rule);
    this.emit('rule_created', rule);
    
    return rule;
  }

  processAutomationRules(sensorReading) {
    const { propertyId, deviceId, values } = sensorReading;
    
    this.rules.forEach(rule => {
      if (!rule.enabled || rule.propertyId !== propertyId) return;
      
      // Check if rule conditions are met
      const conditionsMet = this.evaluateRuleConditions(rule.conditions, sensorReading);
      
      if (conditionsMet) {
        console.log(`🤖 Automation rule triggered: ${rule.name}`);
        this.executeRuleActions(rule.actions, sensorReading);
        this.emit('rule_triggered', { rule, sensorReading });
      }
    });
  }

  evaluateRuleConditions(conditions, sensorReading) {
    return conditions.every(condition => {
      const { field, operator, value, deviceId } = condition;
      
      // If condition specifies a different device, skip for now
      if (deviceId && deviceId !== sensorReading.deviceId) return true;
      
      const sensorValue = this.getNestedValue(sensorReading.values, field);
      
      switch (operator) {
        case '>': return sensorValue > value;
        case '<': return sensorValue < value;
        case '>=': return sensorValue >= value;
        case '<=': return sensorValue <= value;
        case '==': return sensorValue == value;
        case '!=': return sensorValue != value;
        case 'contains': return String(sensorValue).includes(String(value));
        default: return false;
      }
    });
  }

  async executeRuleActions(actions, sensorReading) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'control_device':
            await this.controlDevice(action.deviceId, action.command, action.parameters);
            break;
          case 'send_notification':
            this.emit('send_notification', {
              type: action.notificationType || 'iot_alert',
              title: action.title,
              message: action.message,
              data: { sensorReading, action }
            });
            break;
          case 'create_work_order':
            this.emit('create_work_order', {
              title: action.title,
              description: action.description,
              priority: action.priority || 'medium',
              propertyId: sensorReading.propertyId,
              metadata: { triggeredBy: 'iot_rule', sensorReading }
            });
            break;
          case 'log_event':
            console.log(`📝 IoT Event: ${action.message}`, { sensorReading });
            break;
        }
      } catch (error) {
        console.error(`Failed to execute action ${action.type}:`, error);
      }
    }
  }

  // Energy Management
  async getEnergyConsumption(propertyId, timeRange) {
    const energyMeters = Array.from(this.devices.values()).filter(
      device => device.propertyId === propertyId && device.type === this.deviceTypes.ENERGY_METER
    );

    const consumptionData = [];
    
    for (const meter of energyMeters) {
      const readings = await this.getSensorReadings(meter.id, timeRange);
      const consumption = this.calculateEnergyConsumption(readings);
      
      consumptionData.push({
        deviceId: meter.id,
        location: meter.location,
        consumption,
        cost: consumption * 0.15 // SAR per kWh
      });
    }

    return {
      propertyId,
      timeRange,
      totalConsumption: consumptionData.reduce((sum, data) => sum + data.consumption, 0),
      totalCost: consumptionData.reduce((sum, data) => sum + data.cost, 0),
      devices: consumptionData
    };
  }

  // Environmental Monitoring
  async getEnvironmentalStatus(propertyId) {
    const environmentalSensors = Array.from(this.devices.values()).filter(
      device => device.propertyId === propertyId && 
      [this.deviceTypes.TEMPERATURE_SENSOR, this.deviceTypes.HUMIDITY_SENSOR, this.deviceTypes.AIR_QUALITY_SENSOR]
        .includes(device.type)
    );

    const status = {
      propertyId,
      temperature: { avg: 0, min: 0, max: 0, sensors: [] },
      humidity: { avg: 0, min: 0, max: 0, sensors: [] },
      airQuality: { avg: 0, status: 'unknown', sensors: [] },
      timestamp: new Date()
    };

    for (const sensor of environmentalSensors) {
      const latestReading = await this.getLatestSensorReading(sensor.id);
      
      if (latestReading) {
        if (sensor.type === this.deviceTypes.TEMPERATURE_SENSOR) {
          status.temperature.sensors.push({
            deviceId: sensor.id,
            location: sensor.location,
            value: latestReading.values.temperature
          });
        } else if (sensor.type === this.deviceTypes.HUMIDITY_SENSOR) {
          status.humidity.sensors.push({
            deviceId: sensor.id,
            location: sensor.location,
            value: latestReading.values.humidity
          });
        } else if (sensor.type === this.deviceTypes.AIR_QUALITY_SENSOR) {
          status.airQuality.sensors.push({
            deviceId: sensor.id,
            location: sensor.location,
            value: latestReading.values.aqi
          });
        }
      }
    }

    // Calculate averages
    if (status.temperature.sensors.length > 0) {
      const temps = status.temperature.sensors.map(s => s.value);
      status.temperature.avg = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
      status.temperature.min = Math.min(...temps);
      status.temperature.max = Math.max(...temps);
    }

    if (status.humidity.sensors.length > 0) {
      const humidity = status.humidity.sensors.map(s => s.value);
      status.humidity.avg = humidity.reduce((sum, hum) => sum + hum, 0) / humidity.length;
      status.humidity.min = Math.min(...humidity);
      status.humidity.max = Math.max(...humidity);
    }

    if (status.airQuality.sensors.length > 0) {
      const aqi = status.airQuality.sensors.map(s => s.value);
      status.airQuality.avg = aqi.reduce((sum, val) => sum + val, 0) / aqi.length;
      status.airQuality.status = this.getAirQualityStatus(status.airQuality.avg);
    }

    return status;
  }

  // Security & Access Control
  async getSecurityStatus(propertyId) {
    const securityDevices = Array.from(this.devices.values()).filter(
      device => device.propertyId === propertyId && 
      [this.deviceTypes.DOOR_SENSOR, this.deviceTypes.MOTION_DETECTOR, this.deviceTypes.SECURITY_CAMERA, this.deviceTypes.ACCESS_CONTROL]
        .includes(device.type)
    );

    const status = {
      propertyId,
      armed: false,
      breaches: [],
      openDoors: [],
      recentAccess: [],
      cameras: [],
      timestamp: new Date()
    };

    for (const device of securityDevices) {
      const latestReading = await this.getLatestSensorReading(device.id);
      
      if (latestReading) {
        switch (device.type) {
          case this.deviceTypes.DOOR_SENSOR:
            if (latestReading.values.open) {
              status.openDoors.push({
                deviceId: device.id,
                location: device.location,
                openedAt: latestReading.timestamp
              });
            }
            break;
          case this.deviceTypes.MOTION_DETECTOR:
            if (latestReading.values.motion) {
              status.breaches.push({
                deviceId: device.id,
                location: device.location,
                detectedAt: latestReading.timestamp
              });
            }
            break;
          case this.deviceTypes.ACCESS_CONTROL:
            status.recentAccess.push({
              deviceId: device.id,
              location: device.location,
              userId: latestReading.values.userId,
              accessTime: latestReading.timestamp,
              granted: latestReading.values.granted
            });
            break;
          case this.deviceTypes.SECURITY_CAMERA:
            status.cameras.push({
              deviceId: device.id,
              location: device.location,
              status: device.status,
              recording: latestReading.values.recording
            });
            break;
        }
      }
    }

    return status;
  }

  // Predictive Maintenance
  async getPredictiveMaintenanceInsights(propertyId) {
    const devices = Array.from(this.devices.values()).filter(
      device => device.propertyId === propertyId
    );

    const insights = [];

    for (const device of devices) {
      const readings = await this.getSensorReadings(device.id, { 
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      });

      const analysis = this.analyzeDeviceHealth(device, readings);
      
      if (analysis.maintenanceRequired) {
        insights.push({
          deviceId: device.id,
          deviceName: device.name,
          location: device.location,
          issue: analysis.issue,
          severity: analysis.severity,
          recommendedAction: analysis.recommendedAction,
          estimatedCost: analysis.estimatedCost,
          urgency: analysis.urgency
        });
      }
    }

    return {
      propertyId,
      insights,
      totalDevices: devices.length,
      devicesNeedingMaintenance: insights.length,
      estimatedTotalCost: insights.reduce((sum, insight) => sum + insight.estimatedCost, 0)
    };
  }

  // Utility Methods
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  getAirQualityStatus(aqi) {
    if (aqi <= 50) return 'good';
    if (aqi <= 100) return 'moderate';
    if (aqi <= 150) return 'unhealthy_sensitive';
    if (aqi <= 200) return 'unhealthy';
    if (aqi <= 300) return 'very_unhealthy';
    return 'hazardous';
  }

  calculateEnergyConsumption(readings) {
    // Simple calculation - implement based on your meter type
    return readings.reduce((sum, reading) => sum + (reading.values.power || 0), 0) / 1000; // kWh
  }

  analyzeDeviceHealth(device, readings) {
    // Simple health analysis - implement ML-based analysis for production
    const analysis = {
      maintenanceRequired: false,
      issue: null,
      severity: 'low',
      recommendedAction: null,
      estimatedCost: 0,
      urgency: 'low'
    };

    // Check battery level
    if (device.batteryLevel && device.batteryLevel < 20) {
      analysis.maintenanceRequired = true;
      analysis.issue = 'Low battery level';
      analysis.severity = 'medium';
      analysis.recommendedAction = 'Replace battery';
      analysis.estimatedCost = 50;
      analysis.urgency = 'medium';
    }

    // Check last seen
    const lastSeen = new Date(device.lastSeen);
    const hoursSinceLastSeen = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastSeen > 24) {
      analysis.maintenanceRequired = true;
      analysis.issue = 'Device offline for extended period';
      analysis.severity = 'high';
      analysis.recommendedAction = 'Check device connectivity and power';
      analysis.estimatedCost = 100;
      analysis.urgency = 'high';
    }

    return analysis;
  }

  broadcastToWebSockets(type, data) {
    if (this.wsServer) {
      this.wsServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type, data }));
        }
      });
    }
  }

  // Abstract methods - implement based on your database
  async loadDevices() { /* Load devices from database */ }
  async loadAutomationRules() { /* Load automation rules from database */ }
  async saveDeviceToDatabase(device) { /* Save device to database */ }
  async updateDeviceInDatabase(deviceId, updates) { /* Update device in database */ }
  async removeDeviceFromDatabase(deviceId) { /* Remove device from database */ }
  async storeSensorReading(reading) { /* Store sensor reading in database */ }
  async getSensorReadings(deviceId, timeRange) { /* Get sensor readings from database */ }
  async getLatestSensorReading(deviceId) { /* Get latest sensor reading from database */ }
  async createAlertWorkOrder(alert) { /* Create work order for alert */ }

  // Health check
  getHealthStatus() {
    return {
      mqtt: {
        connected: this.mqttClient && this.mqttClient.connected,
        reconnecting: this.mqttClient && this.mqttClient.reconnecting
      },
      websocket: {
        running: this.wsServer !== null,
        clients: this.wsServer ? this.wsServer.clients.size : 0
      },
      devices: {
        total: this.devices.size,
        online: Array.from(this.devices.values()).filter(d => d.status === 'online').length,
        offline: Array.from(this.devices.values()).filter(d => d.status === 'offline').length
      },
      rules: {
        total: this.rules.size,
        enabled: Array.from(this.rules.values()).filter(r => r.enabled).length
      },
      alerts: {
        active: this.alerts.filter(a => !a.acknowledged).length,
        total: this.alerts.length
      }
    };
  }
}

module.exports = IoTManager;