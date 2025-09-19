const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');

class DigitalSignatureService {
  constructor(options = {}) {
    this.config = {
      keyPair: {
        algorithm: 'rsa',
        keySize: 2048,
        publicKeyPath: options.publicKeyPath || './keys/public.pem',
        privateKeyPath: options.privateKeyPath || './keys/private.pem',
      },
      certificates: {
        ca: options.caCertPath,
        cert: options.certPath,
        key: options.keyPath,
      },
      storage: {
        documentsPath: options.documentsPath || './documents',
        signaturesPath: options.signaturesPath || './signatures',
      },
      compliance: {
        standard: options.complianceStandard || 'eIDAS', // eIDAS, ESIGN, etc.
        timestampAuthority: options.timestampAuthority,
        requireTimestamp: options.requireTimestamp || true,
      },
      ...options
    };

    this.keyPair = null;
    this.signatureRequests = new Map();
    
    this.initialize();
  }

  async initialize() {
    await this.loadOrGenerateKeyPair();
    await this.ensureDirectories();
    
    console.log('✅ Digital Signature Service initialized');
  }

  async loadOrGenerateKeyPair() {
    try {
      // Try to load existing key pair
      const publicKey = await fs.readFile(this.config.keyPair.publicKeyPath, 'utf8');
      const privateKey = await fs.readFile(this.config.keyPair.privateKeyPath, 'utf8');
      
      this.keyPair = { publicKey, privateKey };
      console.log('📋 Loaded existing key pair');
    } catch (error) {
      // Generate new key pair if not found
      console.log('🔑 Generating new key pair...');
      await this.generateKeyPair();
    }
  }

  async generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: this.config.keyPair.keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    // Ensure directory exists
    await fs.mkdir(path.dirname(this.config.keyPair.publicKeyPath), { recursive: true });
    
    // Save key pair
    await fs.writeFile(this.config.keyPair.publicKeyPath, publicKey);
    await fs.writeFile(this.config.keyPair.privateKeyPath, privateKey);
    
    this.keyPair = { publicKey, privateKey };
    console.log('✅ Generated and saved new key pair');
  }

  async ensureDirectories() {
    await fs.mkdir(this.config.storage.documentsPath, { recursive: true });
    await fs.mkdir(this.config.storage.signaturesPath, { recursive: true });
  }

  // Document Signing
  async signDocument(documentData, signerInfo) {
    const {
      content,
      type = 'contract', // 'contract', 'invoice', 'agreement', 'report'
      title,
      metadata = {}
    } = documentData;

    const {
      userId,
      name,
      email,
      role,
      organizationId,
      ipAddress,
      location
    } = signerInfo;

    // Create signature request
    const signatureRequest = {
      id: uuidv4(),
      documentId: metadata.documentId || uuidv4(),
      type,
      title,
      content,
      status: 'pending',
      signers: [{
        userId,
        name,
        email,
        role,
        organizationId,
        ipAddress,
        location,
        status: 'pending',
        signedAt: null,
        signature: null
      }],
      metadata,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    };

    this.signatureRequests.set(signatureRequest.id, signatureRequest);
    
    // Save to database
    await this.saveSignatureRequest(signatureRequest);
    
    return signatureRequest;
  }

  async addSignature(requestId, signerUserId, signatureData) {
    const request = this.signatureRequests.get(requestId) || 
                   await this.getSignatureRequest(requestId);

    if (!request) {
      throw new Error(`Signature request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Signature request ${requestId} is ${request.status}`);
    }

    if (new Date() > new Date(request.expiresAt)) {
      throw new Error(`Signature request ${requestId} has expired`);
    }

    const signer = request.signers.find(s => s.userId === signerUserId);
    if (!signer) {
      throw new Error(`User ${signerUserId} is not authorized to sign this document`);
    }

    if (signer.status === 'signed') {
      throw new Error(`User ${signerUserId} has already signed this document`);
    }

    // Create digital signature
    const signature = await this.createDigitalSignature(request, signer, signatureData);
    
    // Update signer status
    signer.status = 'signed';
    signer.signedAt = new Date();
    signer.signature = signature;
    signer.ipAddress = signatureData.ipAddress;
    signer.location = signatureData.location;

    // Check if all signers have signed
    const allSigned = request.signers.every(s => s.status === 'signed');
    if (allSigned) {
      request.status = 'completed';
      request.completedAt = new Date();
      
      // Generate final signed document
      const finalDocument = await this.generateSignedDocument(request);
      request.finalDocumentPath = finalDocument.path;
    }

    // Update storage
    this.signatureRequests.set(requestId, request);
    await this.updateSignatureRequest(request);
    
    return {
      success: true,
      signature,
      documentStatus: request.status,
      allSigned
    };
  }

  async createDigitalSignature(request, signer, signatureData) {
    const {
      signatureImage, // Base64 encoded signature image
      consentText,
      ipAddress,
      location,
      timestamp = new Date()
    } = signatureData;

    // Create signature payload
    const signaturePayload = {
      documentId: request.documentId,
      documentHash: this.calculateDocumentHash(request.content),
      signer: {
        userId: signer.userId,
        name: signer.name,
        email: signer.email,
        role: signer.role
      },
      timestamp: timestamp.toISOString(),
      ipAddress,
      location,
      consentText,
      metadata: {
        userAgent: signatureData.userAgent,
        deviceInfo: signatureData.deviceInfo
      }
    };

    // Create cryptographic signature
    const payloadString = JSON.stringify(signaturePayload);
    const signature = crypto.sign('sha256', Buffer.from(payloadString), {
      key: this.keyPair.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    });

    const digitalSignature = {
      id: uuidv4(),
      payload: signaturePayload,
      signature: signature.toString('base64'),
      signatureImage: signatureImage,
      algorithm: 'RSA-PSS',
      hashAlgorithm: 'SHA-256',
      timestamp: timestamp.toISOString(),
      certificate: await this.getCertificateInfo(),
      compliance: {
        standard: this.config.compliance.standard,
        timestampToken: this.config.compliance.requireTimestamp ? 
          await this.getTimestampToken(payloadString) : null
      }
    };

    // Save signature
    await this.saveSignature(digitalSignature);
    
    return digitalSignature;
  }

  async verifySignature(signature) {
    try {
      const payloadString = JSON.stringify(signature.payload);
      const signatureBuffer = Buffer.from(signature.signature, 'base64');
      
      const isValid = crypto.verify(
        'sha256',
        Buffer.from(payloadString),
        {
          key: this.keyPair.publicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        },
        signatureBuffer
      );

      const verification = {
        valid: isValid,
        signatureId: signature.id,
        verifiedAt: new Date(),
        algorithm: signature.algorithm,
        certificate: signature.certificate
      };

      // Verify timestamp if present
      if (signature.compliance.timestampToken) {
        verification.timestampValid = await this.verifyTimestamp(signature.compliance.timestampToken);
      }

      return verification;
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        verifiedAt: new Date()
      };
    }
  }

  // Document Generation
  async generateSignedDocument(request) {
    const doc = new PDFDocument();
    const filename = `signed_${request.documentId}_${Date.now()}.pdf`;
    const filepath = path.join(this.config.storage.documentsPath, filename);
    
    doc.pipe(require('fs').createWriteStream(filepath));

    // Document header
    doc.fontSize(20).text(request.title || 'Signed Document', 50, 50);
    doc.fontSize(12).text(`Document ID: ${request.documentId}`, 50, 80);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 100);
    
    doc.moveDown(2);

    // Document content
    doc.fontSize(11).text(request.content, 50, 150, {
      width: 500,
      align: 'justify'
    });

    // Signatures section
    doc.addPage();
    doc.fontSize(16).text('Digital Signatures', 50, 50);
    doc.moveDown();

    let yPosition = 100;
    for (const signer of request.signers) {
      if (signer.status === 'signed') {
        // Signature block
        doc.fontSize(12)
           .text(`Signed by: ${signer.name}`, 50, yPosition)
           .text(`Email: ${signer.email}`, 50, yPosition + 15)
           .text(`Role: ${signer.role}`, 50, yPosition + 30)
           .text(`Date: ${new Date(signer.signedAt).toLocaleString()}`, 50, yPosition + 45)
           .text(`IP Address: ${signer.ipAddress}`, 50, yPosition + 60);

        // Add signature image if available
        if (signer.signature.signatureImage) {
          try {
            const signatureBuffer = Buffer.from(signer.signature.signatureImage.split(',')[1], 'base64');
            doc.image(signatureBuffer, 300, yPosition, { width: 200, height: 50 });
          } catch (error) {
            console.error('Error adding signature image:', error);
          }
        }

        // Signature verification info
        doc.fontSize(10)
           .text(`Signature ID: ${signer.signature.id}`, 50, yPosition + 80)
           .text(`Algorithm: ${signer.signature.algorithm}`, 50, yPosition + 95)
           .text(`Hash: ${signer.signature.payload.documentHash.substring(0, 16)}...`, 50, yPosition + 110);

        yPosition += 150;
        
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
      }
    }

    // Document integrity
    doc.addPage();
    doc.fontSize(16).text('Document Integrity', 50, 50);
    doc.fontSize(10)
       .text(`This document has been digitally signed and is tamper-evident.`, 50, 80)
       .text(`Any modifications after signing will invalidate the signatures.`, 50, 100)
       .text(`Verification can be performed using the public key and signature data.`, 50, 120);

    doc.end();

    return {
      path: filepath,
      filename,
      documentId: request.documentId,
      signers: request.signers.filter(s => s.status === 'signed').length
    };
  }

  // Contract Templates
  async createContractFromTemplate(templateId, data, signers) {
    const template = await this.getContractTemplate(templateId);
    if (!template) {
      throw new Error(`Contract template ${templateId} not found`);
    }

    // Replace placeholders in template
    let content = template.content;
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(placeholder, value);
    });

    // Create signature request
    const documentData = {
      content,
      type: 'contract',
      title: template.name,
      metadata: {
        templateId,
        templateVersion: template.version,
        data
      }
    };

    const signatureRequest = await this.createMultiSignerDocument(documentData, signers);
    
    return signatureRequest;
  }

  async createMultiSignerDocument(documentData, signers) {
    const signatureRequest = {
      id: uuidv4(),
      documentId: uuidv4(),
      type: documentData.type,
      title: documentData.title,
      content: documentData.content,
      status: 'pending',
      signers: signers.map(signer => ({
        ...signer,
        status: 'pending',
        signedAt: null,
        signature: null,
        order: signer.order || 0
      })),
      metadata: documentData.metadata,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      workflow: {
        sequential: documentData.sequentialSigning || false,
        currentSignerIndex: 0
      }
    };

    this.signatureRequests.set(signatureRequest.id, signatureRequest);
    await this.saveSignatureRequest(signatureRequest);
    
    // Send signing invitations
    await this.sendSigningInvitations(signatureRequest);
    
    return signatureRequest;
  }

  async sendSigningInvitations(request) {
    for (const signer of request.signers) {
      // Skip if sequential signing and not the current signer
      if (request.workflow.sequential && signer.order !== request.workflow.currentSignerIndex) {
        continue;
      }

      const invitationData = {
        signatureRequestId: request.id,
        documentTitle: request.title,
        signerName: signer.name,
        signerEmail: signer.email,
        expiresAt: request.expiresAt,
        signingUrl: this.generateSigningUrl(request.id, signer.userId)
      };

      // Send invitation email
      this.emit('send_signing_invitation', invitationData);
    }
  }

  generateSigningUrl(requestId, userId) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const token = this.generateSigningToken(requestId, userId);
    return `${baseUrl}/sign/${requestId}?token=${token}`;
  }

  generateSigningToken(requestId, userId) {
    const payload = {
      requestId,
      userId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', this.keyPair.privateKey)
      .update(token)
      .digest('hex');
    
    return `${token}.${signature}`;
  }

  verifySigningToken(token) {
    try {
      const [payloadBase64, signature] = token.split('.');
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      
      // Verify signature
      const expectedSignature = crypto.createHmac('sha256', this.keyPair.privateKey)
        .update(payloadBase64)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return { valid: false, reason: 'Invalid token signature' };
      }

      // Check expiration
      if (Date.now() > payload.expiresAt) {
        return { valid: false, reason: 'Token expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { valid: false, reason: 'Invalid token format' };
    }
  }

  // Certificate Management
  async getCertificateInfo() {
    // In production, this would return actual certificate information
    return {
      issuer: 'Fixzit Enterprise CA',
      subject: 'Fixzit Digital Signature Service',
      serialNumber: '1234567890',
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      algorithm: 'RSA-2048',
      fingerprint: this.calculateFingerprint(this.keyPair.publicKey)
    };
  }

  calculateFingerprint(publicKey) {
    return crypto.createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .match(/.{2}/g)
      .join(':')
      .toUpperCase();
  }

  // Timestamp Authority Integration
  async getTimestampToken(data) {
    if (!this.config.compliance.timestampAuthority) {
      // Create local timestamp
      return {
        timestamp: new Date().toISOString(),
        source: 'local',
        hash: crypto.createHash('sha256').update(data).digest('hex')
      };
    }

    // In production, integrate with a certified timestamp authority
    try {
      // Placeholder for TSA integration
      return {
        timestamp: new Date().toISOString(),
        source: this.config.compliance.timestampAuthority,
        token: 'tsa_token_placeholder',
        hash: crypto.createHash('sha256').update(data).digest('hex')
      };
    } catch (error) {
      console.error('Timestamp authority error:', error);
      throw new Error('Failed to obtain timestamp token');
    }
  }

  async verifyTimestamp(timestampToken) {
    // Implement timestamp verification
    return {
      valid: true,
      timestamp: timestampToken.timestamp,
      source: timestampToken.source
    };
  }

  // Document Templates
  async createContractTemplate(templateData) {
    const template = {
      id: uuidv4(),
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      content: templateData.content,
      placeholders: templateData.placeholders || [],
      signerRoles: templateData.signerRoles || [],
      version: '1.0.0',
      status: 'active',
      createdAt: new Date(),
      metadata: templateData.metadata || {}
    };

    await this.saveContractTemplate(template);
    return template;
  }

  async getContractTemplate(templateId) {
    // Implement template retrieval from database
    return null; // Placeholder
  }

  // Audit and Compliance
  async generateSignatureAuditReport(dateRange = {}) {
    const startDate = dateRange.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange.endDate || new Date();

    const signatures = await this.getSignatureHistory({ startDate, endDate });
    
    const report = {
      metadata: {
        generatedAt: new Date(),
        period: { startDate, endDate },
        totalSignatures: signatures.length,
        reportId: uuidv4()
      },
      summary: {
        completed: signatures.filter(s => s.status === 'completed').length,
        pending: signatures.filter(s => s.status === 'pending').length,
        expired: signatures.filter(s => s.status === 'expired').length,
        byType: this.groupBy(signatures, 'type'),
        bySigner: this.getSignerStatistics(signatures)
      },
      signatures: signatures.map(sig => ({
        id: sig.id,
        documentId: sig.documentId,
        title: sig.title,
        type: sig.type,
        status: sig.status,
        createdAt: sig.createdAt,
        completedAt: sig.completedAt,
        signers: sig.signers.map(signer => ({
          name: signer.name,
          email: signer.email,
          role: signer.role,
          status: signer.status,
          signedAt: signer.signedAt,
          ipAddress: signer.ipAddress
        }))
      })),
      integrity: await this.verifySignatureIntegrity(signatures)
    };

    return report;
  }

  async verifySignatureIntegrity(signatures) {
    const results = {
      totalSignatures: signatures.length,
      validSignatures: 0,
      invalidSignatures: 0,
      errors: []
    };

    for (const signatureRequest of signatures) {
      for (const signer of signatureRequest.signers) {
        if (signer.signature) {
          const verification = await this.verifySignature(signer.signature);
          if (verification.valid) {
            results.validSignatures++;
          } else {
            results.invalidSignatures++;
            results.errors.push({
              signatureId: signer.signature.id,
              error: verification.error,
              signer: signer.name
            });
          }
        }
      }
    }

    return results;
  }

  // Utility methods
  calculateDocumentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key];
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  getSignerStatistics(signatures) {
    const signers = {};
    
    signatures.forEach(sig => {
      sig.signers.forEach(signer => {
        if (!signers[signer.email]) {
          signers[signer.email] = {
            name: signer.name,
            email: signer.email,
            totalSigned: 0,
            avgSigningTime: 0
          };
        }
        
        if (signer.status === 'signed') {
          signers[signer.email].totalSigned++;
        }
      });
    });

    return Object.values(signers);
  }

  // Abstract methods - implement based on your storage system
  async saveSignatureRequest(request) { /* Implement database save */ }
  async updateSignatureRequest(request) { /* Implement database update */ }
  async getSignatureRequest(requestId) { /* Implement database get */ }
  async saveSignature(signature) { /* Implement signature storage */ }
  async getSignatureHistory(filters) { /* Implement signature history retrieval */ }
  async saveContractTemplate(template) { /* Implement template storage */ }

  // Health check
  getHealthStatus() {
    return {
      keyPairLoaded: !!this.keyPair,
      activeRequests: this.signatureRequests.size,
      certificateValid: true, // Implement certificate validation
      timestampAuthorityConnected: !!this.config.compliance.timestampAuthority,
      complianceStandard: this.config.compliance.standard
    };
  }
}

module.exports = DigitalSignatureService;