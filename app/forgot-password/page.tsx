'use client'

export default function ForgotPassword() {
  const toggleLang = () => {
    const html = document.documentElement;
    const now = html.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl';
    html.setAttribute('dir', now);
    html.setAttribute('lang', now === 'rtl' ? 'ar' : 'en');
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
        <main className="fxz-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="fxz-content" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="fxz-card">
              <h2 style={{ margin: '0 0 20px', textAlign: 'center' }}>Reset Password</h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--fxz-border)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                className="fxz-btn primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => alert('Password reset email sent!')}
              >
                Send Reset Link
              </button>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <a href="/login" style={{ color: 'var(--fxz-blue)', fontSize: '14px' }}>
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

