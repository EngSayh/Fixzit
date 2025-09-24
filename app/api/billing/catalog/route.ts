import { NextResponse } from 'next/server';
import { dbConnect } from '@/src/db/mongoose';
import Module from '@/src/models/Module';
import PriceTier from '@/src/models/PriceTier';
import DiscountRule from '@/src/models/DiscountRule';

export async function GET() {
  try {
    await dbConnect();
    
    const [modules, priceTiers, discountRule] = await Promise.all([
      Module.find({ active: true }).sort({ sortOrder: 1 }),
      PriceTier.find({}).populate('moduleId', 'code name'),
      DiscountRule.findOne({ code: 'ANNUAL', active: true })
    ]);

    return NextResponse.json({ 
      modules, 
      prices: priceTiers, 
      rules: discountRule 
    });
  } catch (error) {
    console.error('Failed to load billing catalog:', error);
    return NextResponse.json(
      { error: 'Failed to load catalog' }, 
      { status: 500 }
    );
  }
}