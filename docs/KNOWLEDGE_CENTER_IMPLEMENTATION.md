# Fixzit Knowledge Center Implementation

## Overview

The Fixzit Knowledge Center is a comprehensive, self-updating help system that provides intelligent AI-powered assistance to users. It automatically learns from system changes and provides contextual, role-based help in both Arabic and English.

## Architecture

### Core Components

1. **MongoDB Atlas Vector Search** - For intelligent document search and retrieval
2. **OpenAI Integration** - For embeddings and AI-powered responses
3. **Change Streams** - For automatic knowledge base updates
4. **Multi-language Support** - Arabic/English with RTL support
5. **Role-based Access Control** - Tenant and role-specific content

### Database Collections

- `knowledge_articles` - Main knowledge base articles
- `kb_embeddings` - Vector embeddings for search
- `kb_change_events` - System change tracking
- `kb_rules` - Auto-generation rules

## Features Implemented

### ✅ Real AI Integration
- OpenAI GPT-4o-mini for intelligent responses
- Text embeddings for semantic search
- Context-aware answers based on user role and location

### ✅ Vector Search
- MongoDB Atlas Vector Search integration
- Semantic similarity matching
- Role and language filtering

### ✅ Auto-Learning System
- MongoDB Change Streams monitoring
- Automatic article generation from system events
- Real-time knowledge base updates

### ✅ Multi-language Support
- Arabic and English content
- RTL/LTR layout support
- Language-specific AI responses

### ✅ Role-based Access
- Tenant isolation
- Role-specific content filtering
- Secure multi-tenant architecture

### ✅ Modern UI Components
- Floating help widget (Cmd+/)
- Full-page knowledge base interface
- Real-time chat interface
- Responsive design

## API Endpoints

### `/api/kb/search`
- **Method**: POST
- **Purpose**: Vector search for relevant content
- **Parameters**: qVec, orgId, lang, role, route, limit

### `/api/kb/answer`
- **Method**: POST
- **Purpose**: Generate AI-powered answers
- **Parameters**: question, orgId, lang, role, route

### `/api/help/articles`
- **Method**: GET
- **Purpose**: Retrieve help articles
- **Parameters**: category (optional)

## Usage

### 1. Environment Setup

```bash
# Required environment variables
MONGODB_URI=mongodb://localhost:27017/fixzit
OPENAI_API_KEY=your_openai_api_key_here
KB_EMBEDDING_PROVIDER=openai
KB_VECTOR_INDEX=kb-embeddings-index
MONGODB_DB=fixzit
```

### 2. Database Setup

Create the vector search index in MongoDB Atlas:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "embedding": { 
        "type": "knnVector", 
        "dimensions": 1536, 
        "similarity": "cosine" 
      },
      "orgId": { "type": "filter" },
      "lang": { "type": "filter" },
      "route": { "type": "filter" },
      "roleScopes": { "type": "filter" }
    }
  }
}
```

### 3. Seed Initial Data

```bash
npx tsx scripts/kb/seed-knowledge-base.ts
```

### 4. Start Change Streams Watcher

```bash
npx tsx scripts/kb/watch-change-streams.ts
```

## Components

### KnowledgeWidget
- Floating help widget
- Real-time AI chat
- Keyboard shortcut (Cmd+/)
- Multi-language support

### Knowledge Base Page
- Article management interface
- Search and filtering
- Category organization
- Role-based access

### AI Chat Page
- Full-page chat interface
- Real AI integration
- Context-aware responses
- Source citations

## Auto-Learning Rules

The system automatically creates articles based on:

1. **Work Order Creation** → "How to Create a Work Order"
2. **Approval Actions** → "How to Approve Requests"
3. **Support Tickets** → "How to Create a Support Ticket"
4. **System Changes** → Context-specific guides

## Security & Privacy

- All content is tenant-isolated
- Role-based access control
- Secure API endpoints
- No data leakage between organizations

## Performance

- Vector search for fast retrieval
- Cached embeddings
- Optimized database queries
- Real-time updates via change streams

## Monitoring

- Change stream monitoring
- Error logging and handling
- Performance metrics
- Usage analytics

## Future Enhancements

1. **Advanced Analytics** - User behavior tracking
2. **Content Management** - Admin interface for article editing
3. **Integration APIs** - Third-party system integration
4. **Mobile App** - Native mobile support
5. **Voice Interface** - Voice-activated help

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MONGODB_URI environment variable
   - Ensure MongoDB is running
   - Verify network connectivity

2. **OpenAI API Errors**
   - Verify OPENAI_API_KEY is set
   - Check API quota and billing
   - Ensure proper API permissions

3. **Vector Search Not Working**
   - Verify vector search index exists
   - Check embedding dimensions match
   - Ensure proper field mappings

4. **Change Streams Not Updating**
   - Check MongoDB replica set configuration
   - Verify change stream permissions
   - Monitor for connection issues

## Support

For technical support or questions about the Knowledge Center implementation, please contact the development team or create a support ticket through the system.

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintainer**: Fixzit Development Team