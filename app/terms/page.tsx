/**
 * Simple Terms of Service page used for end-to-end visibility tests.
 *
 * Renders a centered prose container with an H1 titled "Terms" and a short descriptive paragraph.
 *
 * @returns The Terms page JSX element.
 */
export default function TermsPage() {
  return (
    <div className="prose max-w-3xl mx-auto p-6">
      <h1>Terms</h1>
      <p>Terms of service page for E2E visibility tests.</p>
    </div>
  );
}


