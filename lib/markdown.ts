import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

export async function renderMarkdownSanitized(markdown: string): Promise<string> {
  const schema = {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      a: [ ...(defaultSchema.attributes?.a || []), ['target', 'rel'] ],
      code: [ ...(defaultSchema.attributes?.code || []), ['className'] ]
    }
  };

  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    // Type mismatch between rehype-sanitize schema and unified plugin signature
    // The schema object is valid but TypeScript's plugin type inference is overly strict
    // Using 'as any' to bypass the type check while preserving runtime safety
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .use(rehypeSanitize as any, schema)
    .use(rehypeStringify)
    .process(markdown || '');
  return String(file);
}

