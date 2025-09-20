const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: AzureStrategy } = require('passport-azure-ad-oauth2');
const { Strategy: OktaStrategy } = require('passport-okta-oauth');
const { Strategy: SAMLStrategy } = require('passport-saml');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SSOService {
  constructor() {
    this.providers = {
      google: {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`
      },
      microsoft: {
        clientID: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/microsoft/callback`,
        tenant: process.env.AZURE_TENANT_ID
      },
      okta: {
        domain: process.env.OKTA_DOMAIN,
        clientID: process.env.OKTA_CLIENT_ID,
        clientSecret: process.env.OKTA_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL}/api/auth/okta/callback`
      },
      saml: {
        entryPoint: process.env.SAML_ENTRY_POINT,
        issuer: process.env.SAML_ISSUER || 'fixzit-saml',
        callbackURL: `${process.env.BACKEND_URL}/api/auth/saml/callback`,
        cert: process.env.SAML_CERT
      }
    };

    this.initializeStrategies();
  }

  // Initialize all SSO strategies
  initializeStrategies() {
    // JWT Strategy (default)
    passport.use(new JwtStrategy({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET
    }, async (payload, done) => {
      try {
        const user = await User.findById(payload.userId);
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        return done(error, false);
      }
    }));

    // Google OAuth Strategy
    if (this.providers.google.clientID) {
      passport.use(new GoogleStrategy({
        clientID: this.providers.google.clientID,
        clientSecret: this.providers.google.clientSecret,
        callbackURL: this.providers.google.callbackURL
      }, this.handleOAuthCallback.bind(this)));
    }

    // Microsoft Azure AD Strategy
    if (this.providers.microsoft.clientID) {
      passport.use('azure', new AzureStrategy({
        clientID: this.providers.microsoft.clientID,
        clientSecret: this.providers.microsoft.clientSecret,
        callbackURL: this.providers.microsoft.callbackURL,
        tenant: this.providers.microsoft.tenant,
        resource: 'https://graph.microsoft.com',
        scope: ['profile', 'email']
      }, this.handleOAuthCallback.bind(this)));
    }

    // Okta Strategy
    if (this.providers.okta.domain) {
      passport.use(new OktaStrategy({
        domain: this.providers.okta.domain,
        clientID: this.providers.okta.clientID,
        clientSecret: this.providers.okta.clientSecret,
        callbackURL: this.providers.okta.callbackURL,
        scope: ['openid', 'profile', 'email']
      }, this.handleOAuthCallback.bind(this)));
    }

    // SAML Strategy
    if (this.providers.saml.entryPoint) {
      passport.use(new SAMLStrategy({
        entryPoint: this.providers.saml.entryPoint,
        issuer: this.providers.saml.issuer,
        callbackUrl: this.providers.saml.callbackURL,
        cert: this.providers.saml.cert,
        identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
      }, this.handleSAMLCallback.bind(this)));
    }

    // Serialize/Deserialize user
    passport.serializeUser((user, done) => {
      done(null, user._id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        const user = await User.findById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  // Handle OAuth callback
  async handleOAuthCallback(accessToken, refreshToken, profile, done) {
    try {
      // Extract user data from profile
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || `${profile.name?.givenName} ${profile.name?.familyName}`;
      const provider = profile.provider;
      const providerId = profile.id;

      if (!email) {
        return done(new Error('No email found in profile'), null);
      }

      // Find or create user
      let user = await User.findOne({
        $or: [
          { email },
          { [`ssoProviders.${provider}.id`]: providerId }
        ]
      });

      if (!user) {
        // Create new user
        user = await User.create({
          email,
          name,
          isActive: true,
          isVerified: true,
          ssoProviders: {
            [provider]: {
              id: providerId,
              email,
              accessToken,
              refreshToken,
              profile: profile._json
            }
          },
          role: 'user', // Default role
          permissions: ['read']
        });
      } else {
        // Update existing user
        user.ssoProviders = user.ssoProviders || {};
        user.ssoProviders[provider] = {
          id: providerId,
          email,
          accessToken,
          refreshToken,
          profile: profile._json,
          lastLogin: new Date()
        };
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }

  // Handle SAML callback
  async handleSAMLCallback(profile, done) {
    try {
      const email = profile.email || profile.nameID;
      const name = profile.displayName || profile.firstName + ' ' + profile.lastName;

      let user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          email,
          name,
          isActive: true,
          isVerified: true,
          ssoProviders: {
            saml: {
              nameID: profile.nameID,
              nameIDFormat: profile.nameIDFormat,
              profile
            }
          },
          role: 'user',
          permissions: ['read']
        });
      } else {
        user.ssoProviders = user.ssoProviders || {};
        user.ssoProviders.saml = {
          nameID: profile.nameID,
          nameIDFormat: profile.nameIDFormat,
          profile,
          lastLogin: new Date()
        };
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }

  // Generate SSO login URL
  getLoginUrl(provider) {
    switch (provider) {
      case 'google':
        return `/api/auth/google`;
      case 'microsoft':
        return `/api/auth/microsoft`;
      case 'okta':
        return `/api/auth/okta`;
      case 'saml':
        return `/api/auth/saml`;
      default:
        throw new Error(`Unknown SSO provider: ${provider}`);
    }
  }

  // Generate JWT token for SSO user
  generateToken(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      ssoProvider: Object.keys(user.ssoProviders || {})[0]
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  }

  // Validate SSO configuration
  validateConfig() {
    const configs = [];

    if (this.providers.google.clientID) {
      configs.push({
        provider: 'google',
        configured: true,
        loginUrl: this.getLoginUrl('google')
      });
    }

    if (this.providers.microsoft.clientID) {
      configs.push({
        provider: 'microsoft',
        configured: true,
        loginUrl: this.getLoginUrl('microsoft')
      });
    }

    if (this.providers.okta.domain) {
      configs.push({
        provider: 'okta',
        configured: true,
        loginUrl: this.getLoginUrl('okta')
      });
    }

    if (this.providers.saml.entryPoint) {
      configs.push({
        provider: 'saml',
        configured: true,
        loginUrl: this.getLoginUrl('saml')
      });
    }

    return configs;
  }

  // LDAP/AD Integration
  async authenticateLDAP(username, password) {
    const ldap = require('ldapjs');
    const client = ldap.createClient({
      url: process.env.LDAP_URL
    });

    return new Promise((resolve, reject) => {
      const dn = `uid=${username},${process.env.LDAP_BASE_DN}`;
      
      client.bind(dn, password, async (err) => {
        if (err) {
          client.unbind();
          return reject(new Error('Invalid LDAP credentials'));
        }

        // Search for user details
        const searchOptions = {
          filter: `(uid=${username})`,
          scope: 'sub',
          attributes: ['cn', 'mail', 'employeeNumber', 'department']
        };

        client.search(process.env.LDAP_BASE_DN, searchOptions, async (err, res) => {
          if (err) {
            client.unbind();
            return reject(err);
          }

          let userData;
          res.on('searchEntry', (entry) => {
            userData = entry.object;
          });

          res.on('end', async () => {
            client.unbind();
            
            if (!userData) {
              return reject(new Error('User not found in LDAP'));
            }

            // Find or create user
            let user = await User.findOne({ email: userData.mail });
            
            if (!user) {
              user = await User.create({
                email: userData.mail,
                name: userData.cn,
                employeeId: userData.employeeNumber,
                department: userData.department,
                isActive: true,
                isVerified: true,
                authMethod: 'ldap',
                role: 'user'
              });
            }

            resolve(user);
          });
        });
      });
    });
  }

  // Multi-factor authentication
  async setupMFA(userId) {
    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');
    
    const secret = speakeasy.generateSecret({
      name: `Fixzit (${userId})`,
      issuer: 'Fixzit Property Management'
    });

    const user = await User.findById(userId);
    user.mfa = {
      secret: secret.base32,
      enabled: false,
      backupCodes: this.generateBackupCodes()
    };
    await user.save();

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: user.mfa.backupCodes
    };
  }

  // Verify MFA token
  async verifyMFA(userId, token) {
    const speakeasy = require('speakeasy');
    const user = await User.findById(userId);
    
    if (!user.mfa?.secret) {
      throw new Error('MFA not configured for this user');
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfa.secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (verified) {
      user.mfa.enabled = true;
      user.mfa.lastUsed = new Date();
      await user.save();
    }

    return verified;
  }

  // Generate backup codes
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }
}

module.exports = new SSOService();