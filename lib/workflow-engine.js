const EventEmitter = require('events');

class WorkflowEngine extends EventEmitter {
  constructor() {
    super();
    this.workflows = new Map();
    this.activeInstances = new Map();
    this.taskQueue = [];
    this.isProcessing = false;
  }

  // Workflow Definition Management
  async createWorkflow(workflowData) {
    const workflow = {
      id: workflowData.id || this.generateId(),
      name: workflowData.name,
      description: workflowData.description,
      version: workflowData.version || '1.0.0',
      triggers: workflowData.triggers || [],
      nodes: workflowData.nodes || [],
      edges: workflowData.edges || [],
      variables: workflowData.variables || {},
      settings: {
        timeout: workflowData.settings?.timeout || 3600000, // 1 hour default
        retryAttempts: workflowData.settings?.retryAttempts || 3,
        retryDelay: workflowData.settings?.retryDelay || 5000,
        parallel: workflowData.settings?.parallel || false,
        ...workflowData.settings
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate workflow
    const validation = this.validateWorkflow(workflow);
    if (!validation.isValid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    this.workflows.set(workflow.id, workflow);
    this.emit('workflow_created', workflow);
    
    return workflow;
  }

  validateWorkflow(workflow) {
    const errors = [];

    // Check required fields
    if (!workflow.name) errors.push('Workflow name is required');
    if (!workflow.nodes || workflow.nodes.length === 0) errors.push('Workflow must have at least one node');

    // Check for start node
    const startNodes = workflow.nodes.filter(node => node.type === 'start');
    if (startNodes.length === 0) errors.push('Workflow must have a start node');
    if (startNodes.length > 1) errors.push('Workflow can only have one start node');

    // Check for end nodes
    const endNodes = workflow.nodes.filter(node => node.type === 'end');
    if (endNodes.length === 0) errors.push('Workflow must have at least one end node');

    // Validate node connections
    workflow.nodes.forEach(node => {
      if (node.type !== 'start' && node.type !== 'end') {
        const incomingEdges = workflow.edges.filter(edge => edge.target === node.id);
        const outgoingEdges = workflow.edges.filter(edge => edge.source === node.id);
        
        if (incomingEdges.length === 0 && node.type !== 'start') {
          errors.push(`Node ${node.id} has no incoming connections`);
        }
        if (outgoingEdges.length === 0 && node.type !== 'end') {
          errors.push(`Node ${node.id} has no outgoing connections`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Workflow Execution
  async startWorkflow(workflowId, initialData = {}, context = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'active') {
      throw new Error(`Workflow ${workflowId} is not active`);
    }

    const instance = {
      id: this.generateId(),
      workflowId: workflow.id,
      status: 'running',
      currentNodeId: null,
      data: { ...workflow.variables, ...initialData },
      context: {
        userId: context.userId,
        organizationId: context.organizationId,
        requestId: context.requestId,
        ...context
      },
      history: [],
      startTime: new Date(),
      endTime: null,
      error: null,
      retryCount: 0
    };

    this.activeInstances.set(instance.id, instance);
    this.emit('workflow_started', instance);

    // Find start node
    const startNode = workflow.nodes.find(node => node.type === 'start');
    if (startNode) {
      await this.executeNode(instance.id, startNode.id);
    }

    return instance;
  }

  async executeNode(instanceId, nodeId) {
    const instance = this.activeInstances.get(instanceId);
    const workflow = this.workflows.get(instance.workflowId);
    const node = workflow.nodes.find(n => n.id === nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found in workflow ${instance.workflowId}`);
    }

    instance.currentNodeId = nodeId;
    instance.history.push({
      nodeId,
      startTime: new Date(),
      status: 'running'
    });

    this.emit('node_started', { instance, node });

    try {
      let result;
      
      switch (node.type) {
        case 'start':
          result = await this.executeStartNode(instance, node);
          break;
        case 'task':
          result = await this.executeTaskNode(instance, node);
          break;
        case 'approval':
          result = await this.executeApprovalNode(instance, node);
          break;
        case 'condition':
          result = await this.executeConditionNode(instance, node);
          break;
        case 'notification':
          result = await this.executeNotificationNode(instance, node);
          break;
        case 'delay':
          result = await this.executeDelayNode(instance, node);
          break;
        case 'script':
          result = await this.executeScriptNode(instance, node);
          break;
        case 'api':
          result = await this.executeApiNode(instance, node);
          break;
        case 'end':
          result = await this.executeEndNode(instance, node);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Update history
      const historyEntry = instance.history[instance.history.length - 1];
      historyEntry.endTime = new Date();
      historyEntry.status = 'completed';
      historyEntry.result = result;

      this.emit('node_completed', { instance, node, result });

      // Move to next node(s)
      if (node.type !== 'end') {
        await this.moveToNextNode(instance, node, result);
      }

    } catch (error) {
      console.error(`Error executing node ${nodeId}:`, error);
      
      // Update history
      const historyEntry = instance.history[instance.history.length - 1];
      historyEntry.endTime = new Date();
      historyEntry.status = 'failed';
      historyEntry.error = error.message;

      this.emit('node_failed', { instance, node, error });

      // Handle retry logic
      if (instance.retryCount < workflow.settings.retryAttempts) {
        instance.retryCount++;
        setTimeout(() => {
          this.executeNode(instanceId, nodeId);
        }, workflow.settings.retryDelay);
      } else {
        await this.failWorkflow(instance, error);
      }
    }
  }

  // Node Executors
  async executeStartNode(instance, node) {
    // Start node just triggers the workflow
    return { success: true, message: 'Workflow started' };
  }

  async executeTaskNode(instance, node) {
    const { config } = node;
    
    // Create task assignment
    const task = {
      id: this.generateId(),
      workflowInstanceId: instance.id,
      nodeId: node.id,
      title: this.interpolateString(config.title, instance.data),
      description: this.interpolateString(config.description, instance.data),
      assignedTo: this.resolveAssignee(config.assignTo, instance),
      dueDate: this.calculateDueDate(config.dueDate, instance),
      priority: config.priority || 'medium',
      status: 'pending',
      createdAt: new Date()
    };

    // Store task and wait for completion
    await this.createTask(task);
    this.emit('task_created', { instance, task });

    // Return pending status - task will be completed externally
    return { taskId: task.id, status: 'pending' };
  }

  async executeApprovalNode(instance, node) {
    const { config } = node;
    
    const approval = {
      id: this.generateId(),
      workflowInstanceId: instance.id,
      nodeId: node.id,
      title: this.interpolateString(config.title, instance.data),
      description: this.interpolateString(config.description, instance.data),
      approvers: this.resolveApprovers(config.approvers, instance),
      requiredApprovals: config.requiredApprovals || 1,
      currentApprovals: 0,
      status: 'pending',
      dueDate: this.calculateDueDate(config.dueDate, instance),
      createdAt: new Date()
    };

    await this.createApproval(approval);
    this.emit('approval_created', { instance, approval });

    return { approvalId: approval.id, status: 'pending' };
  }

  async executeConditionNode(instance, node) {
    const { config } = node;
    const condition = config.condition;
    
    // Evaluate condition
    const result = this.evaluateCondition(condition, instance.data);
    
    return { 
      condition: condition,
      result: result,
      branch: result ? 'true' : 'false'
    };
  }

  async executeNotificationNode(instance, node) {
    const { config } = node;
    
    const notification = {
      recipients: this.resolveRecipients(config.recipients, instance),
      title: this.interpolateString(config.title, instance.data),
      message: this.interpolateString(config.message, instance.data),
      channels: config.channels || ['email'],
      template: config.template,
      data: instance.data
    };

    // Send notification using notification service
    await this.sendNotification(notification);
    
    return { sent: true, recipients: notification.recipients.length };
  }

  async executeDelayNode(instance, node) {
    const { config } = node;
    const delay = this.calculateDelay(config.delay, instance);
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ delayed: delay, message: 'Delay completed' });
      }, delay);
    });
  }

  async executeScriptNode(instance, node) {
    const { config } = node;
    
    // Execute custom script in sandboxed environment
    const script = config.script;
    const context = {
      data: instance.data,
      console: console,
      // Add safe utilities
      Math: Math,
      Date: Date,
      JSON: JSON
    };

    try {
      const result = this.executeScript(script, context);
      
      // Update instance data if script returns data
      if (result && typeof result === 'object' && result.data) {
        Object.assign(instance.data, result.data);
      }
      
      return result;
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  async executeApiNode(instance, node) {
    const { config } = node;
    
    const requestConfig = {
      method: config.method || 'GET',
      url: this.interpolateString(config.url, instance.data),
      headers: config.headers || {},
      timeout: config.timeout || 30000
    };

    if (config.body) {
      requestConfig.data = this.interpolateObject(config.body, instance.data);
    }

    try {
      const response = await this.makeHttpRequest(requestConfig);
      
      // Update instance data with response
      if (config.dataMapping) {
        const mappedData = this.mapResponseData(response.data, config.dataMapping);
        Object.assign(instance.data, mappedData);
      }
      
      return {
        status: response.status,
        data: response.data,
        success: response.status >= 200 && response.status < 300
      };
    } catch (error) {
      throw new Error(`API call failed: ${error.message}`);
    }
  }

  async executeEndNode(instance, node) {
    instance.status = 'completed';
    instance.endTime = new Date();
    instance.currentNodeId = null;

    this.emit('workflow_completed', instance);
    this.activeInstances.delete(instance.id);

    return { success: true, message: 'Workflow completed' };
  }

  // Navigation Logic
  async moveToNextNode(instance, currentNode, result) {
    const workflow = this.workflows.get(instance.workflowId);
    let nextEdges = workflow.edges.filter(edge => edge.source === currentNode.id);

    // Handle conditional branching
    if (currentNode.type === 'condition' && result.branch) {
      nextEdges = nextEdges.filter(edge => 
        edge.condition === result.branch || !edge.condition
      );
    }

    // Execute next nodes
    for (const edge of nextEdges) {
      const nextNode = workflow.nodes.find(n => n.id === edge.target);
      if (nextNode) {
        if (workflow.settings.parallel) {
          // Execute in parallel
          setImmediate(() => this.executeNode(instance.id, nextNode.id));
        } else {
          // Execute sequentially
          await this.executeNode(instance.id, nextNode.id);
        }
      }
    }
  }

  // External Task Completion
  async completeTask(taskId, result, userId) {
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const instance = this.activeInstances.get(task.workflowInstanceId);
    if (!instance) {
      throw new Error(`Workflow instance ${task.workflowInstanceId} not found`);
    }

    // Update task
    task.status = 'completed';
    task.result = result;
    task.completedBy = userId;
    task.completedAt = new Date();

    await this.updateTask(task);
    this.emit('task_completed', { instance, task, result });

    // Continue workflow
    const workflow = this.workflows.get(instance.workflowId);
    const node = workflow.nodes.find(n => n.id === task.nodeId);
    await this.moveToNextNode(instance, node, { success: true, result });
  }

  async completeApproval(approvalId, decision, userId, comments) {
    const approval = await this.getApproval(approvalId);
    if (!approval) {
      throw new Error(`Approval ${approvalId} not found`);
    }

    const instance = this.activeInstances.get(approval.workflowInstanceId);
    if (!instance) {
      throw new Error(`Workflow instance ${approval.workflowInstanceId} not found`);
    }

    // Record approval decision
    approval.decisions = approval.decisions || [];
    approval.decisions.push({
      userId,
      decision, // 'approved' or 'rejected'
      comments,
      timestamp: new Date()
    });

    if (decision === 'approved') {
      approval.currentApprovals++;
    }

    // Check if approval is complete
    const isApproved = approval.currentApprovals >= approval.requiredApprovals;
    const isRejected = approval.decisions.some(d => d.decision === 'rejected');

    if (isApproved || isRejected) {
      approval.status = isApproved ? 'approved' : 'rejected';
      approval.completedAt = new Date();

      await this.updateApproval(approval);
      this.emit('approval_completed', { instance, approval, decision: approval.status });

      // Continue workflow
      const workflow = this.workflows.get(instance.workflowId);
      const node = workflow.nodes.find(n => n.id === approval.nodeId);
      await this.moveToNextNode(instance, node, { 
        success: isApproved, 
        approved: isApproved,
        rejected: isRejected,
        result: approval.status 
      });
    } else {
      await this.updateApproval(approval);
      this.emit('approval_updated', { instance, approval });
    }
  }

  // Utility Methods
  generateId() {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  interpolateString(template, data) {
    if (!template || typeof template !== 'string') return template;
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  interpolateObject(obj, data) {
    if (typeof obj === 'string') {
      return this.interpolateString(obj, data);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, data));
    }
    
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, data);
      }
      return result;
    }
    
    return obj;
  }

  evaluateCondition(condition, data) {
    // Simple condition evaluation
    // In production, use a proper expression parser
    try {
      const func = new Function('data', `return ${condition}`);
      return func(data);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  executeScript(script, context) {
    // Sandboxed script execution
    const func = new Function(...Object.keys(context), script);
    return func(...Object.values(context));
  }

  async failWorkflow(instance, error) {
    instance.status = 'failed';
    instance.endTime = new Date();
    instance.error = error.message;
    instance.currentNodeId = null;

    this.emit('workflow_failed', { instance, error });
    this.activeInstances.delete(instance.id);
  }

  // Abstract methods to be implemented by specific storage/service layers
  async createTask(task) { /* Implement in subclass */ }
  async updateTask(task) { /* Implement in subclass */ }
  async getTask(taskId) { /* Implement in subclass */ }
  async createApproval(approval) { /* Implement in subclass */ }
  async updateApproval(approval) { /* Implement in subclass */ }
  async getApproval(approvalId) { /* Implement in subclass */ }
  async sendNotification(notification) { /* Implement in subclass */ }
  async makeHttpRequest(config) { /* Implement in subclass */ }
  
  resolveAssignee(assignTo, instance) { /* Implement based on your user system */ }
  resolveApprovers(approvers, instance) { /* Implement based on your user system */ }
  resolveRecipients(recipients, instance) { /* Implement based on your user system */ }
  calculateDueDate(dueDate, instance) { /* Implement date calculation logic */ }
  calculateDelay(delay, instance) { /* Implement delay calculation */ }
  mapResponseData(data, mapping) { /* Implement data mapping logic */ }
}

module.exports = WorkflowEngine;