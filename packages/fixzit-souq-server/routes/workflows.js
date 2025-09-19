const express = require('express');
const { Workflow, WorkflowInstance } = require('../models/Workflow');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// Get all workflows
router.get('/', async (req, res) => {
  try {
    const { category, status = 'active', type } = req.query;
    const query = { status };
    
    if (category) query.category = category;
    if (type) query.type = type;

    const workflows = await Workflow.find(query)
      .select('-steps.config -variables')
      .sort({ name: 1 });

    res.json({ success: true, data: workflows });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow details
router.get('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create workflow
router.post('/', async (req, res) => {
  try {
    const workflow = new Workflow({
      ...req.body,
      createdBy: {
        userId: req.user?.id,
        name: req.user?.name
      }
    });

    await workflow.save();

    await AuditLog.logAction({
      action: 'create',
      category: 'configuration',
      entityType: 'Workflow',
      entityId: workflow._id,
      entityName: workflow.name,
      user: {
        userId: req.user?.id || 'system',
        name: req.user?.name || 'System',
        email: req.user?.email
      }
    });

    res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update workflow
router.put('/:id', async (req, res) => {
  try {
    const workflow = await Workflow.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: {
          userId: req.user?.id,
          name: req.user?.name
        },
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!workflow) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    res.json({ success: true, data: workflow });
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start workflow instance
router.post('/:id/start', async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);
    if (!workflow || workflow.status !== 'active') {
      return res.status(404).json({ success: false, error: 'Active workflow not found' });
    }

    // Get first step
    const firstStep = workflow.steps.find(s => s.order === 1);
    if (!firstStep) {
      return res.status(400).json({ success: false, error: 'Workflow has no steps' });
    }

    const instance = new WorkflowInstance({
      workflowId: workflow._id,
      workflowName: workflow.name,
      status: 'in_progress',
      currentStep: {
        stepId: firstStep._id,
        name: firstStep.name,
        startedAt: new Date(),
        status: 'pending'
      },
      context: {
        ...req.body.context,
        initiator: {
          userId: req.user?.id,
          name: req.user?.name,
          role: req.user?.role
        }
      },
      variables: req.body.variables || {},
      priority: req.body.priority || 'medium',
      dueDate: req.body.dueDate
    });

    await instance.save();

    // Update workflow metrics
    workflow.metrics.totalInstances += 1;
    workflow.metrics.activeInstances += 1;
    await workflow.save();

    await AuditLog.logAction({
      action: 'create',
      category: 'system',
      entityType: 'WorkflowInstance',
      entityId: instance._id,
      entityName: workflow.name,
      user: {
        userId: req.user?.id || 'system',
        name: req.user?.name || 'System',
        email: req.user?.email
      },
      metadata: {
        workflowId: workflow._id,
        contextType: req.body.context?.entityType,
        contextId: req.body.context?.entityId
      }
    });

    res.json({ success: true, data: instance });
  } catch (error) {
    console.error('Error starting workflow instance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow instances
router.get('/instances/list', async (req, res) => {
  try {
    const { status, workflowId, entityType, entityId, limit = 50, offset = 0 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (workflowId) query.workflowId = workflowId;
    if (entityType) query['context.entityType'] = entityType;
    if (entityId) query['context.entityId'] = entityId;

    const instances = await WorkflowInstance.find(query)
      .populate('workflowId', 'name category type')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await WorkflowInstance.countDocuments(query);

    res.json({
      success: true,
      data: {
        instances,
        total,
        hasMore: total > offset + instances.length
      }
    });
  } catch (error) {
    console.error('Error fetching workflow instances:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow instance details
router.get('/instances/:id', async (req, res) => {
  try {
    const instance = await WorkflowInstance.findById(req.params.id)
      .populate('workflowId');

    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }

    res.json({ success: true, data: instance });
  } catch (error) {
    console.error('Error fetching instance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process workflow step (approve/reject/complete)
router.post('/instances/:id/process', async (req, res) => {
  try {
    const { action, comments, data } = req.body;
    const instance = await WorkflowInstance.findById(req.params.id);
    
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }

    // Add to history
    instance.history.push({
      stepId: instance.currentStep.stepId,
      stepName: instance.currentStep.name,
      action,
      actor: {
        userId: req.user?.id,
        name: req.user?.name,
        role: req.user?.role
      },
      result: action,
      comments,
      timestamp: new Date(),
      duration: (new Date() - instance.currentStep.startedAt) / 60000 // minutes
    });

    // Add approval record if applicable
    if (action === 'approved' || action === 'rejected') {
      instance.approvals.push({
        stepId: instance.currentStep.stepId,
        approver: {
          userId: req.user?.id,
          name: req.user?.name,
          role: req.user?.role
        },
        decision: action,
        comments,
        timestamp: new Date()
      });
    }

    // Update variables if provided
    if (data) {
      instance.variables = { ...instance.variables, ...data };
    }

    // Move to next step
    await instance.moveToNextStep(action);

    await AuditLog.logAction({
      action: action === 'approved' ? 'approve' : action === 'rejected' ? 'reject' : 'update',
      category: 'system',
      entityType: 'WorkflowInstance',
      entityId: instance._id,
      user: {
        userId: req.user?.id || 'system',
        name: req.user?.name || 'System',
        email: req.user?.email
      },
      metadata: {
        step: instance.currentStep.name,
        comments
      }
    });

    res.json({ success: true, data: instance });
  } catch (error) {
    console.error('Error processing workflow step:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel workflow instance
router.post('/instances/:id/cancel', async (req, res) => {
  try {
    const instance = await WorkflowInstance.findById(req.params.id);
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Instance not found' });
    }

    instance.status = 'cancelled';
    instance.completedAt = new Date();
    
    instance.history.push({
      stepId: instance.currentStep.stepId,
      stepName: instance.currentStep.name,
      action: 'cancel',
      actor: {
        userId: req.user?.id,
        name: req.user?.name,
        role: req.user?.role
      },
      result: 'cancelled',
      comments: req.body.reason,
      timestamp: new Date()
    });

    await instance.save();

    // Update workflow metrics
    const workflow = await Workflow.findById(instance.workflowId);
    if (workflow) {
      workflow.metrics.activeInstances -= 1;
      await workflow.save();
    }

    res.json({ success: true, data: instance });
  } catch (error) {
    console.error('Error cancelling workflow:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const workflowId = req.params.id;
    
    const [
      totalInstances,
      activeInstances,
      completedInstances,
      failedInstances,
      avgCompletionTime
    ] = await Promise.all([
      WorkflowInstance.countDocuments({ workflowId }),
      WorkflowInstance.countDocuments({ workflowId, status: 'in_progress' }),
      WorkflowInstance.countDocuments({ workflowId, status: 'completed' }),
      WorkflowInstance.countDocuments({ workflowId, status: 'failed' }),
      WorkflowInstance.aggregate([
        { $match: { workflowId: mongoose.Types.ObjectId(workflowId), status: 'completed' } },
        { $project: { duration: { $subtract: ['$completedAt', '$startedAt'] } } },
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
      ])
    ]);

    const stats = {
      totalInstances,
      activeInstances,
      completedInstances,
      failedInstances,
      successRate: totalInstances > 0 ? Math.round((completedInstances / totalInstances) * 100) : 0,
      avgCompletionTime: avgCompletionTime[0]?.avgDuration ? Math.round(avgCompletionTime[0].avgDuration / 3600000) : 0 // hours
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching workflow stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;