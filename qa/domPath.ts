export function getDomPath(el: Element): string {
  const stack: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1) {
    const id = (node as HTMLElement).id ? `#${(node as HTMLElement).id}` : "";
    const cls = (node as HTMLElement).className
      ? "." +
        (node as HTMLElement).className.toString().trim().replace(/\s+/g, ".")
      : "";
    stack.unshift(`${node.nodeName.toLowerCase()}${id}${cls}`);
    node = node.parentElement;
  }
  return stack.join(" > ");
}
