import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ question: z.string().min(3), contextRoute: z.string().optional() });

// Mock help articles for search
const mockArticles = [
  {
    title: 'Getting Started with Fixzit Enterprise',
    slug: 'getting-started'
  },
  {
    title: 'Work Orders Overview',
    slug: 'work-orders-overview'
  },
  {
    title: 'Managing Vendors and Suppliers',
    slug: 'vendor-management'
  },
  {
    title: 'Tenant Relations and Communication',
    slug: 'tenant-relations'
  },
  {
    title: 'Financial Reporting and Invoicing',
    slug: 'financial-reporting'
  },
  {
    title: 'Property Maintenance Best Practices',
    slug: 'property-maintenance'
  },
  {
    title: 'Request for Quote (RFQ) Process',
    slug: 'rfq-process'
  },
  {
    title: 'Compliance and Regulatory Requirements',
    slug: 'compliance-requirements'
  }
];

export async function POST(req: NextRequest){
  try {
    const { question, contextRoute } = schema.parse(await req.json());

    // Simple keyword search in mock articles
    const q = question.toLowerCase();
    const articles = mockArticles.filter(article =>
      article.title.toLowerCase().includes(q) ||
      q.includes(article.title.toLowerCase().split(' ')[0]) ||
      q.includes(article.title.toLowerCase().split(' ')[1])
    ).slice(0, 5);

    const answer = articles.length > 0
      ? `I found ${articles.length} help article(s) related to your question. You can find detailed information in the help center.`
      : `I couldn't find specific help articles for your question. I can help you create a support ticket if you need further assistance.`;

    return NextResponse.json({
      mode: "public",
      answer,
      citations: articles.map((a: any)=>({ title: a.title, slug: a.slug })),
      actions: [
        {
          type: "create_ticket",
          label: "Create Support Ticket",
          description: "Get personalized help from our support team"
        }
      ]
    });
  } catch (error) {
    console.error('AI Assistant error:', error);

    return NextResponse.json({
      mode: "public",
      answer: "I'm having trouble processing your request right now. Please try again or create a support ticket for assistance.",
      citations: [],
      actions: [
        {
          type: "create_ticket",
          label: "Create Support Ticket",
          description: "Get help from our support team"
        }
      ]
    });
  }
}
