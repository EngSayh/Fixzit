// scripts/knowledge-scanner.ts - Auto-learning system for AI chatbot
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit';

interface KnowledgeEntry {
  id: string;
  source: string;
  title: string;
  content: string;
  type: 'route' | 'component' | 'api' | 'documentation' | 'guide';
  module?: string;
  roles?: string[];
  tags: string[];
  language: 'en' | 'ar' | 'both';
  lastUpdated: Date;
}

class KnowledgeScanner {
  private client: MongoClient;
  private db: any;

  constructor() {
    this.client = new MongoClient(MONGODB_URI);
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(MONGODB_DB);
  }

  async disconnect() {
    await this.client.close();
  }

  // Scan source code and documentation
  async scanAndIndex(sourcePaths: string[] = ['src', 'app', 'docs']) {
    console.log('🔍 Starting knowledge base scan...');

    const entries: KnowledgeEntry[] = [];

    for (const sourcePath of sourcePaths) {
      if (fs.existsSync(sourcePath)) {
        await this.scanDirectory(sourcePath, entries);
      }
    }

    // Index in database
    await this.indexKnowledge(entries);

    console.log(`✅ Knowledge base updated with ${entries.length} entries`);
  }

  private async scanDirectory(dirPath: string, entries: KnowledgeEntry[], parentPath = '') {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(item)) {
          await this.scanDirectory(itemPath, entries, path.join(parentPath, item));
        }
      } else if (stat.isFile()) {
        const entry = await this.processFile(itemPath, parentPath);
        if (entry) {
          entries.push(entry);
        }
      }
    }
  }

  private async processFile(filePath: string, parentPath: string): Promise<KnowledgeEntry | null> {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath, ext);

    // Only process relevant file types
    if (!['.tsx', '.ts', '.js', '.jsx', '.md', '.txt', '.json'].includes(ext)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const entry = await this.extractKnowledge(filePath, fileName, content, parentPath);
      return entry;
    } catch (error) {
      console.warn(`Failed to process file ${filePath}:`, error);
      return null;
    }
  }

  private async extractKnowledge(filePath: string, fileName: string, content: string, parentPath: string): Promise<KnowledgeEntry> {
    const lines = content.split('\n');
    const title = this.extractTitle(content, fileName);

    // Determine type based on file location and content
    let type: KnowledgeEntry['type'] = 'documentation';
    let module: string | undefined;
    let roles: string[] = [];

    if (filePath.includes('/api/')) {
      type = 'api';
      module = this.determineModuleFromPath(filePath);
    } else if (filePath.includes('/components/')) {
      type = 'component';
      module = this.determineModuleFromPath(filePath);
    } else if (filePath.includes('/pages/') || filePath.includes('/app/')) {
      type = 'route';
      module = this.determineModuleFromPath(filePath);
    }

    // Extract roles from comments or file content
    roles = this.extractRoles(content);

    // Determine language
    const language = this.detectLanguage(content);

    // Extract relevant content sections
    const relevantContent = this.extractRelevantContent(content, type);

    // Generate tags
    const tags = this.generateTags(fileName, content, type);

    return {
      id: `${type}-${fileName}-${Date.now()}`,
      source: filePath,
      title,
      content: relevantContent,
      type,
      module,
      roles,
      tags,
      language,
      lastUpdated: new Date()
    };
  }

  private extractTitle(content: string, fileName: string): string {
    // Look for title in first few lines or use filename
    const lines = content.split('\n').slice(0, 10);

    // Check for markdown title
    for (const line of lines) {
      const match = line.match(/^#\s+(.+)/);
      if (match) return match[1];
    }

    // Check for component/function name
    const componentMatch = content.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/);
    if (componentMatch) return componentMatch[1];

    // Check for API route comment
    const apiMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+)/);
    if (apiMatch) return apiMatch[1];

    return fileName.replace(/[-_]/g, ' ');
  }

  private determineModuleFromPath(filePath: string): string {
    if (filePath.includes('/dashboard/') || filePath.includes('dashboard')) return 'dashboard';
    if (filePath.includes('/work-orders/') || filePath.includes('work-orders')) return 'work_orders';
    if (filePath.includes('/properties/') || filePath.includes('properties')) return 'properties';
    if (filePath.includes('/finance/') || filePath.includes('finance')) return 'finance';
    if (filePath.includes('/hr/') || filePath.includes('hr')) return 'hr';
    if (filePath.includes('/crm/') || filePath.includes('crm')) return 'crm';
    if (filePath.includes('/marketplace/') || filePath.includes('marketplace')) return 'marketplace';
    if (filePath.includes('/support/') || filePath.includes('support')) return 'support';
    if (filePath.includes('/admin/') || filePath.includes('admin')) return 'administration';
    if (filePath.includes('/system/') || filePath.includes('system')) return 'system';
    return 'general';
  }

  private extractRoles(content: string): string[] {
    const roles: string[] = [];
    const roleMatches = content.match(/@role\s+(\w+)/g);
    if (roleMatches) {
      roleMatches.forEach(match => {
        const role = match.replace('@role', '').trim();
        if (role && !roles.includes(role)) roles.push(role);
      });
    }
    return roles.length > 0 ? roles : ['all'];
  }

  private detectLanguage(content: string): 'en' | 'ar' | 'both' {
    const arabicChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const englishChars = /[a-zA-Z]/;

    const hasArabic = arabicChars.test(content);
    const hasEnglish = englishChars.test(content);

    if (hasArabic && hasEnglish) return 'both';
    if (hasArabic) return 'ar';
    return 'en';
  }

  private extractRelevantContent(content: string, type: string): string {
    const lines = content.split('\n');

    switch (type) {
      case 'api':
        return this.extractApiContent(lines);
      case 'component':
        return this.extractComponentContent(lines);
      case 'route':
        return this.extractRouteContent(lines);
      default:
        return this.extractDocumentationContent(lines);
    }
  }

  private extractApiContent(lines: string[]): string {
    const relevantLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Include API route definitions and comments
      if (line.includes('export async function') ||
          line.includes('/api/') ||
          (line.includes('//') && line.includes('API')) ||
          (line.includes('/*') && line.includes('API'))) {
        relevantLines.push(line);
      }

      // Include JSDoc comments
      if (line.includes('/**') && line.includes('*/')) {
        let j = i;
        while (j < lines.length && !lines[j].includes('*/')) {
          relevantLines.push(lines[j]);
          j++;
        }
        if (j < lines.length) relevantLines.push(lines[j]);
        i = j;
      }
    }

    return relevantLines.join('\n');
  }

  private extractComponentContent(lines: string[]): string {
    const relevantLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Include component definitions and important comments
      if (line.includes('export default') ||
          line.includes('export function') ||
          line.includes('const ') && line.includes('=') ||
          (line.includes('//') && (line.includes('component') || line.includes('render')))) {
        relevantLines.push(line);
      }
    }

    return relevantLines.join('\n');
  }

  private extractRouteContent(lines: string[]): string {
    const relevantLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Include route definitions and handlers
      if (line.includes('export default') ||
          line.includes('export async function') ||
          line.includes('router.') ||
          line.includes('app.get') ||
          line.includes('app.post')) {
        relevantLines.push(line);
      }
    }

    return relevantLines.join('\n');
  }

  private extractDocumentationContent(lines: string[]): string {
    const relevantLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Include headings and important content
      if (line.startsWith('#') ||
          line.startsWith('##') ||
          line.startsWith('###') ||
          line.startsWith('####') ||
          line.includes('TODO') ||
          line.includes('FIXME') ||
          line.includes('NOTE')) {
        relevantLines.push(line);
      }
    }

    return relevantLines.join('\n');
  }

  private generateTags(fileName: string, content: string, type: string): string[] {
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();

    // Add type-based tags
    tags.push(type);

    // Add filename-based tags
    fileName.toLowerCase().split(/[-_\s]+/).forEach(part => {
      if (part.length > 2) tags.push(part);
    });

    // Add content-based tags
    if (lowerContent.includes('work order')) tags.push('work-orders');
    if (lowerContent.includes('ticket')) tags.push('tickets');
    if (lowerContent.includes('property')) tags.push('properties');
    if (lowerContent.includes('finance')) tags.push('finance');
    if (lowerContent.includes('marketplace')) tags.push('marketplace');
    if (lowerContent.includes('support')) tags.push('support');
    if (lowerContent.includes('user')) tags.push('users');
    if (lowerContent.includes('admin')) tags.push('administration');

    return [...new Set(tags)]; // Remove duplicates
  }

  private async indexKnowledge(entries: KnowledgeEntry[]) {
    try {
      // Clear existing knowledge base
      await this.db.collection('ai_knowledge_base').deleteMany({});

      // Insert new entries
      if (entries.length > 0) {
        await this.db.collection('ai_knowledge_base').insertMany(entries);
      }

      console.log(`Indexed ${entries.length} knowledge entries`);
    } catch (error) {
      console.error('Failed to index knowledge:', error);
    }
  }

  // Search knowledge base
  async searchKnowledge(query: string, module?: string, roles?: string[], limit = 5) {
    try {
      const searchTerms = query.toLowerCase().split(' ');

      const results = await this.db.collection('ai_knowledge_base')
        .find({
          $and: [
            // Match search terms in title or content
            {
              $or: [
                { title: { $regex: searchTerms.join('|'), $options: 'i' } },
                { content: { $regex: searchTerms.join('|'), $options: 'i' } },
                { tags: { $in: searchTerms } }
              ]
            },
            // Filter by module if specified
            ...(module ? [{ module }] : []),
            // Filter by roles if specified
            ...(roles && roles.length > 0 ? [{ roles: { $in: roles } }] : [])
          ]
        })
        .sort({ lastUpdated: -1 })
        .limit(limit)
        .toArray();

      return results;
    } catch (error) {
      console.error('Knowledge search error:', error);
      return [];
    }
  }
}

// CLI usage
if (require.main === module) {
  const scanner = new KnowledgeScanner();
  const args = process.argv.slice(2);

  scanner.connect().then(async () => {
    if (args.includes('--search')) {
      const query = args[args.indexOf('--search') + 1];
      const results = await scanner.searchKnowledge(query);
      console.log('Search results:', results);
    } else {
      await scanner.scanAndIndex(args.length > 0 ? args : ['src', 'app', 'docs']);
    }
    await scanner.disconnect();
  });
}

export default KnowledgeScanner;
