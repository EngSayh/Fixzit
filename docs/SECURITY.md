# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take the security of Fixzit seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please report security vulnerabilities through one of the following methods:

1. **GitHub Security Advisories** (Preferred)
   - Go to https://github.com/EngSayh/Fixzit/security/advisories
   - Click "Report a vulnerability"
   - Fill out the form with details

2. **Email**
   - Send an email to: security@fixzit.com
   - Include "SECURITY" in the subject line
   - Provide detailed information about the vulnerability

### What to Include

When reporting a vulnerability, please include:

- **Description**: Clear description of the vulnerability
- **Impact**: Potential impact and severity
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Proof of Concept**: If possible, include a PoC
- **Affected Versions**: Which versions are affected
- **Suggested Fix**: If you have suggestions for mitigation

### Response Timeline

- **Acknowledgment**: Within 48 hours of report
- **Initial Assessment**: Within 5 business days
- **Status Updates**: Every 7 days until resolved
- **Resolution**: Critical issues within 30 days, others within 90 days

## Security Measures

### Current Security Implementations

1. **Authentication & Authorization**
   - NextAuth.js for secure authentication
   - JWT-based session management
   - Role-based access control (RBAC)
   - Secure password hashing with bcrypt

2. **Data Protection**
   - Environment variables for sensitive configuration
   - MongoDB Atlas encryption at rest and in transit
   - HTTPS enforcement in production
   - Secure cookie flags (HttpOnly, Secure, SameSite)

3. **API Security**
   - Input validation on all endpoints
   - CSRF protection via NextAuth

4. **Dependency Management**
   - Regular pnpm audit checks

5. **Code Security**
   - TypeScript for type safety
   - ESLint security rules
   - Code review process
   - Automated testing (87+ tests)

### Security Best Practices

#### For Contributors

1. **Never commit sensitive data**
   - No API keys, tokens, or credentials
   - Use environment variables
   - Check `.gitignore` is properly configured

2. **Input Validation**
   - Always validate user input
   - Sanitize data before database operations
   - Use TypeScript types for compile-time safety

3. **Authentication**
   - Use NextAuth session validation
   - Check permissions on server-side
   - Never trust client-side data

4. **Code Quality**
   - Follow TypeScript best practices
   - Use proper error handling
   - Never trust client-side data

5. **Secrets & URIs**
   - Never commit database URIs or credentials; always use environment variables
   - Use placeholders in docs/templates (`mongodb+srv://<user>:<password>@<host>/<db>`)
   - Local/CI guardrail: `bash scripts/security/check-hardcoded-uris.sh` (runs in CI to fail on hard-coded URIs)

6. **Dependencies**
   - Run `pnpm audit` before submitting PRs
   - Keep dependencies up to date
   - Review new dependencies for security issues

7. **Error Handling**
   - Never expose stack traces to users
   - Log errors securely
   - Use generic error messages for users

#### For Deployers

1. **Environment Variables**

   ```bash
   # Required secure variables
   NEXTAUTH_SECRET=          # Strong random string (min 32 chars)
   JWT_SECRET=               # Different from NEXTAUTH_SECRET
   MONGODB_URI=              # Secure MongoDB connection string (do not commit)
   ```

2. **HTTPS Enforcement**
   - Always use HTTPS in production
   - Configure proper SSL/TLS certificates
   - Enable HSTS headers

3. **Database Security**
   - Use MongoDB Atlas with IP whitelist
   - Enable MongoDB encryption
   - Regular backups
   - Principle of least privilege for DB users

4. **Monitoring**
   - Enable error tracking (e.g., Sentry)
   - Monitor failed login attempts
   - Track API rate limits
   - Set up security alerts

## Security Checklist

Before deploying to production:

## Pre-Deployment Security Checklist

- [ ] All environment variables are properly configured
- [ ] No hardcoded secrets in code
- [ ] Rate limiting is configured
- [ ] Error messages don't expose sensitive info
- [ ] pnpm audit shows no high/critical vulnerabilities

## Known Security Considerations

### Client-Side Storage

- LocalStorage used for non-sensitive user preferences (language, theme)
- Sensitive data (tokens, sessions) handled via secure cookies
- No PII stored in browser storage

### Third-Party Services

- NextAuth.js: Well-maintained authentication library
- MongoDB Atlas: Enterprise-grade database security
- Vercel/Deployment platform: Follows industry security standards

### Rate Limiting

- API routes are rate-limited to prevent abuse
- Configurable limits per route
- IP-based and user-based limiting

## Vulnerability Disclosure Policy

We follow responsible disclosure principles:

1. **Reporter Cooperation**: Work with security researchers in good faith
2. **No Legal Action**: No legal action against researchers who:
   - Report vulnerabilities responsibly
   - Don't access user data beyond PoC needs
   - Don't perform DoS attacks
   - Give us reasonable time to fix issues

3. **Recognition**: We will acknowledge security researchers (with permission) in:
   - Security advisories
   - Release notes
   - Security Hall of Fame (if established)

## Security Updates

Security updates are released as:

- **Critical**: Immediate patch release
- **High**: Within 7 days
- **Medium**: Within 30 days
- **Low**: Next regular release

Updates are communicated via:

- GitHub Security Advisories
- Release notes
- Email to registered administrators
- Project README

## Compliance

Fixzit is designed with the following compliance considerations:

- **GDPR**: Data protection and privacy controls
- **KSA Regulations**: Localized for Saudi Arabian market
- **OWASP Top 10**: Protections against common vulnerabilities
- **CIS Controls**: Following security best practices

## Contact

For security-related questions or concerns:

- **Security Team**: <security@fixzit.com>
- **General Support**: <support@fixzit.com>
- **GitHub**: <https://github.com/EngSayh/Fixzit/security>

---

**Last Updated**: November 8, 2025  
**Version**: 2.0
