import assert from "node:assert";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

async function testSanitize() {
  const md = "# Title\n<script>alert(1)</script>\n**bold**";
  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(md);
  const html = String(file);
  assert(!html.includes("<script>"));
  assert(html.includes("<strong>bold</strong>"));
}

async function run() {
  await testSanitize();
  console.log("OK: sanitize");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
