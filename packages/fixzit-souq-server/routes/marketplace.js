const express = require('express');
const MarketplaceItem = require('../models/MarketplaceItem');

const router = express.Router();

// Get products with search, filters, and pagination
router.get('/products', async (req, res) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      vendor,
      rating,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = { active: true };
    
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ];
    }
    
    if (category) query.category = category;
    if (vendor) query.vendor = vendor;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (rating) query.rating = { $gte: parseFloat(rating) };

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const [products, total] = await Promise.all([
      MarketplaceItem.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      MarketplaceItem.countDocuments(query)
    ]);

    res.json({
      ok: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const product = await MarketplaceItem.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }
    res.json({ ok: true, data: product });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Create product (vendor only)
router.post('/products', async (req, res) => {
  try {
    const product = new MarketplaceItem({
      ...req.body,
      active: true,
      rating: 0,
      reviewCount: 0,
      soldCount: 0
    });
    
    await product.save();
    res.status(201).json({ ok: true, data: product });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Update product
router.put('/products/:id', async (req, res) => {
  try {
    const product = await MarketplaceItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }
    
    res.json({ ok: true, data: product });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await MarketplaceItem.distinct('category');
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => ({
        name: cat,
        count: await MarketplaceItem.countDocuments({ category: cat, active: true })
      }))
    );
    
    res.json({ ok: true, data: categoriesWithCount });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Cart operations (simplified - in production, use sessions/DB)
router.post('/cart', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    const product = await MarketplaceItem.findById(productId);
    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Insufficient stock', 
        available: product.stock 
      });
    }
    
    // In production, save to user's cart in DB
    res.json({ 
      ok: true, 
      data: {
        productId,
        quantity,
        product
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Create order
router.post('/orders', async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    
    // Validate items and calculate total
    let total = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = await MarketplaceItem.findById(item.productId);
      if (!product) {
        return res.status(404).json({ 
          ok: false, 
          error: `Product ${item.productId} not found` 
        });
      }
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          ok: false, 
          error: `Insufficient stock for ${product.title}` 
        });
      }
      
      total += product.price * item.quantity;
      orderItems.push({
        productId: product._id,
        title: product.title,
        price: product.price,
        quantity: item.quantity,
        subtotal: product.price * item.quantity
      });
    }
    
    // Create order
    const order = {
      orderNumber: `FXZ-${Date.now()}`,
      items: orderItems,
      total,
      currency: 'SAR',
      status: 'PENDING',
      shippingAddress,
      paymentMethod,
      createdAt: new Date()
    };
    
    // In production, save to DB and update product stock
    res.status(201).json({ ok: true, data: order });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Add review
router.post('/products/:id/reviews', async (req, res) => {
  try {
    const { rating, comment, userName = 'Anonymous' } = req.body;
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ ok: false, error: 'Rating must be between 1 and 5' });
    }
    
    const product = await MarketplaceItem.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }
    
    // Update product rating (simplified)
    const newReviewCount = product.reviewCount + 1;
    const newRating = ((product.rating * product.reviewCount) + rating) / newReviewCount;
    
    product.rating = newRating;
    product.reviewCount = newReviewCount;
    await product.save();
    
    const review = {
      productId: product._id,
      userName,
      rating,
      comment,
      createdAt: new Date()
    };
    
    res.status(201).json({ ok: true, data: review });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// RFQ endpoints
router.post('/rfq', async (req, res) => {
  try {
    const { title, description, category, quantity, budget } = req.body;
    
    const rfq = {
      id: `RFQ-${Date.now()}`,
      title,
      description,
      category,
      quantity,
      budget,
      status: 'OPEN',
      bids: [],
      createdAt: new Date()
    };
    
    // In production, save to DB
    res.status(201).json({ ok: true, data: rfq });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Vendor endpoints
router.get('/vendors', async (req, res) => {
  try {
    // Mock vendor data - in production, fetch from DB
    const vendors = [
      {
        id: '1',
        name: 'Fixzit Supplies Co.',
        rating: 4.5,
        reviewCount: 156,
        category: 'Building Materials',
        verified: true,
        responseTime: '< 2 hours'
      },
      {
        id: '2',
        name: 'Pro Tools Arabia',
        rating: 4.7,
        reviewCount: 89,
        category: 'Tools & Equipment',
        verified: true,
        responseTime: '< 1 hour'
      },
      {
        id: '3',
        name: 'Safety First KSA',
        rating: 4.8,
        reviewCount: 234,
        category: 'Safety Equipment',
        verified: true,
        responseTime: '< 3 hours'
      }
    ];
    
    res.json({ ok: true, data: vendors });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Legacy endpoint for compatibility
router.get('/items', async (req, res) => {
  try {
    const items = await MarketplaceItem.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;