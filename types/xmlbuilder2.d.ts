/**
 * Type declarations for xmlbuilder2
 * @see https://oozcitak.github.io/xmlbuilder2/
 */
declare module 'xmlbuilder2' {
  export interface XMLBuilderOptions {
    version?: string;
    encoding?: string;
  }

  export interface XMLBuilder {
    ele(name: string): XMLBuilder;
    att(name: string, value: string): XMLBuilder;
    txt(value: string): XMLBuilder;
    import(nodes: unknown[]): XMLBuilder;
    end(options?: { prettyPrint?: boolean }): string;
  }

  export function create(options?: XMLBuilderOptions): XMLBuilder;
  export function fragment(): XMLBuilder;
  export function convert(xml: string, options?: unknown): unknown;
}
