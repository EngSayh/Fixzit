declare module "swagger-ui-react" {
  import type { ComponentType } from "react";

  export interface SwaggerUIProps {
    url?: string;
    docExpansion?: string;
    defaultModelsExpandDepth?: number;
    layout?: string;
    [key: string]: unknown;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
