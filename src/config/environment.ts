// Environment Configuration
export const config = {
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit',
    db: process.env.MONGODB_DB || 'fixzit'
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'fixzit_enterprise_jwt_secret_2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  
  // OAuth
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    },
    apple: {
      id: process.env.APPLE_ID || '',
      teamId: process.env.APPLE_TEAM_ID || '',
      privateKey: process.env.APPLE_PRIVATE_KEY || '',
      keyId: process.env.APPLE_KEY_ID || ''
    }
  },
  
  // PayTabs
  paytabs: {
    serverKey: process.env.PAYTABS_SERVER_KEY || '',
    clientKey: process.env.PAYTABS_CLIENT_KEY || '',
    profileId: process.env.PAYTABS_PROFILE_ID || '',
    region: process.env.PAYTABS_REGION || 'SAU'
  },
  
  // ZATCA
  zatca: {
    sellerName: process.env.ZATCA_SELLER_NAME || 'Fixzit Enterprise',
    vatNumber: process.env.ZATCA_VAT_NUMBER || '300000000000003',
    timestampFormat: 'YYYY-MM-DD HH:mm:ss'
  },
  
  // Google Maps
  googleMaps: {
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
  },
  
  // Email (SendGrid)
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@fixzit.co'
  },
  
  // SMS (Twilio)
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
  },
  
  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  },
  
  // AWS S3
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'me-south-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'fixzit-uploads'
  },
  
  // App
  app: {
    name: 'FIXZIT SOUQ Enterprise',
    version: '2.0.26',
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    env: process.env.NODE_ENV || 'development'
  }
};
