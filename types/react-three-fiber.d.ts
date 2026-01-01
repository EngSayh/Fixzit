/**
 * Type declarations for @react-three/fiber JSX elements
 * Extends the global JSX namespace with Three.js element types
 *
 * @module types/react-three-fiber
 * @see https://docs.pmnd.rs/react-three-fiber/tutorials/typescript
 */

import type { ThreeElements } from "@react-three/fiber";

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Intentionally extending ThreeElements
    interface IntrinsicElements extends ThreeElements {}
  }
}
