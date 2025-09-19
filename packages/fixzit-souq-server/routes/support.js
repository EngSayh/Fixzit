const express = require('express');
const SupportTicket = require('../models/SupportTicket');
const KnowledgeArticle = require('../models/KnowledgeArticle');

const router = express.Router();

// Get all tickets
router.get('/tickets', async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email department')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create new ticket
router.post('/tickets', async (req, res) => {
  try {
    const ticketCount = await SupportTicket.countDocuments();
    const ticketNumber = `TKT-${String(ticketCount + 1).padStart(6, '0')}`;
    
    const ticket = new SupportTicket({
      ...req.body,
      ticketNumber,
      createdBy: req.user?.id || 'system',
      messages: [{
        message: req.body.description,
        sender: {
          _id: req.user?.id || 'system',
          name: req.user?.name || 'System',
          role: req.user?.role || 'system'
        },
        timestamp: new Date()
      }]
    });
    
    await ticket.save();
    res.json({ success: true, data: ticket });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Add message to ticket
router.post('/tickets/:id/messages', async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }
    
    ticket.messages.push({
      message: req.body.message,
      sender: {
        _id: req.user?.id || 'system',
        name: req.user?.name || 'System',
        role: req.user?.role || 'system'
      },
      timestamp: new Date(),
      attachments: req.body.attachments || []
    });
    
    ticket.updatedAt = new Date();
    await ticket.save();
    
    res.json({ success: true, data: ticket });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Update ticket status
router.put('/tickets/:id/status', async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }
    
    ticket.status = req.body.status;
    if (req.body.status === 'resolved' || req.body.status === 'closed') {
      ticket.resolvedAt = new Date();
      ticket.resolutionTime = (new Date() - ticket.createdAt) / (1000 * 60 * 60); // hours
    }
    
    await ticket.save();
    res.json({ success: true, data: ticket });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get support stats
router.get('/stats', async (req, res) => {
  try {
    const openTickets = await SupportTicket.countDocuments({ status: 'open' });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const ticketsToday = await SupportTicket.countDocuments({ 
      createdAt: { $gte: todayStart } 
    });
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const ticketsThisWeek = await SupportTicket.countDocuments({ 
      createdAt: { $gte: weekStart } 
    });
    
    const avgResponse = await SupportTicket.aggregate([
      { $match: { responseTime: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$responseTime' } } }
    ]);
    
    const resolvedTickets = await SupportTicket.countDocuments({ 
      status: { $in: ['resolved', 'closed'] },
      createdAt: { $gte: weekStart }
    });
    
    const totalTicketsWeek = await SupportTicket.countDocuments({ 
      createdAt: { $gte: weekStart } 
    });
    
    const resolutionRate = totalTicketsWeek > 0 ? Math.round((resolvedTickets / totalTicketsWeek) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        openTickets,
        avgResponseTime: Math.round(avgResponse[0]?.avg || 2),
        resolutionRate,
        satisfactionScore: 4.5, // Placeholder
        ticketsToday,
        ticketsThisWeek,
        pendingEscalations: 3, // Placeholder
        slaCompliance: 95 // Placeholder
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get knowledge base articles
router.get('/knowledge-base', async (req, res) => {
  try {
    const articles = await KnowledgeArticle.find({ isPublished: true })
      .sort({ views: -1 })
      .limit(20);
    res.json({ success: true, data: articles });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Create knowledge article
router.post('/knowledge-base', async (req, res) => {
  try {
    const article = new KnowledgeArticle({
      ...req.body,
      author: req.user?.name || 'System'
    });
    await article.save();
    res.json({ success: true, data: article });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;

