'use client&apos;

export default function ForgotPassword() {
  const toggleLang = () => {
    const html = document.documentElement;
    const now = html.getAttribute(&apos;dir&apos;) === &apos;rtl&apos; ? &apos;ltr&apos; : &apos;rtl&apos;;
    html.setAttribute(&apos;dir&apos;, now);
    html.setAttribute(&apos;lang&apos;, now === &apos;rtl&apos; ? &apos;ar&apos; : &apos;en&apos;);
  }

  return (
    <>
      <div className="fxz-topbar">
        <div className="fxz-brand">Fixzit Enterprise</div>
        <div className="fxz-top-actions">
          <button className="fxz-btn secondary" onClick={toggleLang}>EN / عربي</button>
          <a className="fxz-btn primary" href="/login">Back to Login</a>
        </div>
      </div>

      <div className="fxz-app">
        <main className="fxz-main" style={{ display: 'flex&apos;, alignItems: &apos;center&apos;, justifyContent: &apos;center&apos; }}>
          <div className="fxz-content" style={{ maxWidth: '400px&apos;, width: &apos;100%&apos; }}>
            <div className="fxz-card">
              <h2 style={{ margin: '0 0 20px&apos;, textAlign: &apos;center&apos; }}>Reset Password</h2>
              
              <div style={{ marginBottom: &apos;20px&apos; }}>
                <label style={{ display: &apos;block&apos;, marginBottom: &apos;8px&apos;, fontWeight: &apos;500&apos; }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  style={{
                    width: '100%&apos;,
                    padding: &apos;12px&apos;,
                    border: &apos;1px solid var(--fxz-border)&apos;,
                    borderRadius: &apos;8px&apos;,
                    fontSize: &apos;14px&apos;,
                    outline: &apos;none&apos;
                  }}
                />
              </div>

              <button
                className="fxz-btn primary"
                style={{ width: '100%&apos;, justifyContent: &apos;center&apos; }}
                onClick={() => alert(&apos;Password reset email sent!&apos;)}
              >
                Send Reset Link
              </button>

              <div style={{ marginTop: &apos;16px&apos;, textAlign: &apos;center&apos; }}>
                <a href="/login" style={{ color: 'var(--fxz-blue)&apos;, fontSize: &apos;14px&apos; }}>
                  Back to Login
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="fxz-footer">© 2025 Fixzit Enterprise — Version 1.0</div>
    </>
  )
}

