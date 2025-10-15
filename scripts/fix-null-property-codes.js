const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Fix null propertyCode values before creating unique index
 */

async function fixNullPropertyCodes() {
  try {

    await mongoose.connect(process.env.MONGODB_URI);

    const db = mongoose.connection.db;
    
    // Find properties with null propertyCode
    const nullProperties = await db.collection('properties').find({
      $or: [
        { propertyCode: null },
        { propertyCode: { $exists: false } },
        { propertyCode: '' }
      ]
    }).toArray();

    if (nullProperties.length > 0) {
      // Generate property codes for null values
      for (let i = 0; i < nullProperties.length; i++) {
        const property = nullProperties[i];
        
        // Get organization code or use property ID
        const orgCode = property.organization ? 
          property.organization.toString().slice(-4).toUpperCase() : 
          'DFLT';
          
        // Generate sequential code
        const count = await db.collection('properties').countDocuments({
          organization: property.organization,
          propertyCode: { $ne: null }
        });
        
        const newCode = `PROP-${orgCode}-${(count + i + 1).toString().padStart(5, '0')}`;
        
        // Update the property
        await db.collection('properties').updateOne(
          { _id: property._id },
          { $set: { propertyCode: newCode } }
        );

      }
    }

    // Create property indexes
    await db.collection('properties').createIndex({ organization: 1, ownerId: 1 });
    await db.collection('properties').createIndex({ propertyCode: 1 }, { unique: true });
    await db.collection('properties').createIndex({ organization: 1, status: 1 });
    await db.collection('properties').createIndex({ organization: 1, type: 1 });
    await db.collection('properties').createIndex({ 'address.city': 1, 'address.district': 1 });
    await db.collection('properties').createIndex({ createdAt: -1 });

  } catch (error) {
    console.error('❌ Error fixing property codes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();

    process.exit(0);
  }
}

fixNullPropertyCodes();