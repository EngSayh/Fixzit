import { Schema, model, models, Document, Model } from 'mongoose';

export interface ISearchSynonym extends Document {
  locale: 'en' | 'ar';
  term: string;
  synonyms: string[];
  category?: string;
  isActive: boolean;
  usageCount: number;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SearchSynonymSchema = new Schema<ISearchSynonym>({
  locale: { 
    type: String, 
    enum: ['en', 'ar'], 
    required: true,
    index: true
  },
  term: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true
  },
  synonyms: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  category: {
    type: String,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsed: Date
}, {
  timestamps: true,
  collection: 'searchsynonyms'
});

// Indexes
SearchSynonymSchema.index({ locale: 1, term: 1 }, { unique: true });
SearchSynonymSchema.index({ synonyms: 1 });
SearchSynonymSchema.index({ usageCount: -1 });

// Methods
SearchSynonymSchema.methods.recordUsage = async function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

SearchSynonymSchema.methods.addSynonym = async function(synonym: string) {
  const normalizedSynonym = synonym.toLowerCase().trim();
  
  if (!this.synonyms.includes(normalizedSynonym)) {
    this.synonyms.push(normalizedSynonym);
    return this.save();
  }
  
  return this;
};

SearchSynonymSchema.methods.removeSynonym = async function(synonym: string) {
  const normalizedSynonym = synonym.toLowerCase().trim();
  const index = this.synonyms.indexOf(normalizedSynonym);
  
  if (index > -1) {
    this.synonyms.splice(index, 1);
    return this.save();
  }
  
  return this;
};

// Static methods
SearchSynonymSchema.statics.findByTerm = function(this: any, locale: 'en' | 'ar', term: string) {
  return this.findOne({ 
    locale, 
    term: term.toLowerCase().trim(),
    isActive: true
  });
};

SearchSynonymSchema.statics.expandQuery = async function(this: any, locale: 'en' | 'ar', query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const expandedTerms = new Set([query]);
  
  for (const term of terms) {
    // Find direct matches
    const synonym = await this.findByTerm(locale, term);
    if (synonym) {
      synonym.synonyms.forEach((s: string) => expandedTerms.add(s));
      await synonym.recordUsage();
    }
    
    // Find reverse matches (where term is in synonyms array)
    const reverseMatches = await this.find({
      locale,
      synonyms: term,
      isActive: true
    });
    
    reverseMatches.forEach((match: any) => {
      expandedTerms.add(match.term);
      match.synonyms.forEach((s: string) => expandedTerms.add(s));
    });
  }
  
  return Array.from(expandedTerms);
};

SearchSynonymSchema.statics.importBulk = async function(data: Array<{
  locale: 'en' | 'ar';
  term: string;
  synonyms: string[];
  category?: string;
}>) {
  const operations = data.map(item => ({
    updateOne: {
      filter: { locale: item.locale, term: item.term.toLowerCase().trim() },
      update: {
        $set: {
          synonyms: item.synonyms.map(s => s.toLowerCase().trim()),
          category: item.category,
          isActive: true
        }
      },
      upsert: true
    }
  }));
  
  return this.bulkWrite(operations);
};

SearchSynonymSchema.statics.getPopularTerms = function(locale: 'en' | 'ar', limit = 10) {
  return this.find({ locale, isActive: true })
    .sort({ usageCount: -1 })
    .limit(limit)
    .select('term usageCount');
};

interface SearchSynonymModel extends Model<ISearchSynonym> {
  findByTerm(locale: 'en' | 'ar', term: string): Promise<ISearchSynonym | null>;
  expandQuery(locale: 'en' | 'ar', query: string): Promise<string[]>;
  importBulk(data: Array<{ locale: 'en' | 'ar'; term: string; synonyms: string[]; category?: string; }>): Promise<any>;
  getPopularTerms(locale: 'en' | 'ar', limit?: number): Promise<any[]>;
}

export const SearchSynonym = (models.SearchSynonym as unknown as SearchSynonymModel) || model<ISearchSynonym, SearchSynonymModel>('SearchSynonym', SearchSynonymSchema);
