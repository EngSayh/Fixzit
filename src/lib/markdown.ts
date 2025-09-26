import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema, Schema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

export async function renderMarkdownSanitized(markdown: string): Promise<string> {
  const schema: Schema = {
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
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(markdown || '');
  return String(file);
}

