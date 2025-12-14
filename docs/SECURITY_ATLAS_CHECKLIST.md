# MongoDB Atlas Security Checklist

**CRITICAL: Execute these steps immediately**

## 🚨 Immediate Actions (User: Eng. Sultan Al Hassni)

### 1. Remove Password from Description Field
1. Go to: MongoDB Atlas → Security → Database Users
2. **SECURITY RISK IDENTIFIED:** Password-like value stored in "Description" column
3. **ACTION:** Edit user → Clear Description field → Save
4. **WHY:** Description is visible to anyone with Atlas UI access (not encrypted)

### 2. Rotate Compromised DB User Password
```bash
# After removing description content:
# 1. Atlas UI → Database Users → Edit user
# 2. Click "Edit Password"
# 3. Generate strong password (use Atlas generator or password manager)
# 4. Save new password to secure vault (1Password, LastPass, etc.)
# 5. Update .env.local with new password (URL-encoded)
```

**Update .env.local:**
```bash
# OLD (COMPROMISED - DO NOT USE):
# MONGODB_URI="mongodb+srv://EngSayh:OLD_PASSWORD@fixzit.vgfiiff.mongodb.net/fixzit"

# NEW (after rotation):
MONGODB_URI="mongodb+srv://EngSayh:NEW_PASSWORD_URL_ENCODED@fixzit.vgfiiff.mongodb.net/fixzit"
```

### 3. Implement Least Privilege DB User

**Current Setup (Needs Review):**
- User: `EngSayh`
- Role: Unknown (check if `atlasAdmin@admin` - TOO PERMISSIVE)

**Recommended Setup:**
Create separate users per environment:

**Development User:**
```
Username: fixzit-dev-app
Database: fixzit
Roles: readWrite@fixzit
```

**Production User:**
```
Username: fixzit-prod-app
Database: fixzit
Roles: readWrite@fixzit (NOT atlasAdmin)
```

**Steps to Create Least-Privilege User:**
1. Atlas → Database Access → Add New Database User
2. Authentication: Password
3. Database User Privileges:
   - Built-in Role: `readWrite`
   - Database: `fixzit` (specific database, not admin)
4. Restrict Access: Add IP Access List (not 0.0.0.0/0)
5. Generate strong password
6. Update .env.local with new connection string

### 4. Verify TLS/SRV Configuration

**Current (CORRECT):**
```
mongodb+srv://... (SRV automatically enforces TLS)
```

**Best Practices:**
- ✅ Use SRV format for Atlas connections
- ✅ Include `retryWrites=true&w=majority`
- ✅ Never hardcode credentials in code
- ✅ URL-encode special characters in password

---

## 📋 Security Checklist

- [ ] Remove password from Atlas user Description field
- [ ] Rotate compromised DB user password
- [ ] Create least-privilege app user (readWrite@fixzit)
- [ ] Update .env.local with new credentials
- [ ] Verify IP Access List (not 0.0.0.0/0 in production)
- [ ] Test connection with new credentials
- [ ] Remove old/compromised user from Atlas
- [ ] Document credentials in secure vault only

---

## 🔐 Credential Management Rules

**NEVER:**
- Store passwords in Atlas UI Description fields
- Use `atlasAdmin` role for app connections
- Hardcode credentials in code/comments/docs
- Commit .env.local to git
- Share passwords via chat/email/Slack

**ALWAYS:**
- Use secure password manager (1Password, LastPass, etc.)
- URL-encode special characters (@, #, /, etc.)
- Use separate DB users per environment
- Apply principle of least privilege
- Rotate credentials on suspected compromise
- Use IP Access Lists (not 0.0.0.0/0)

---

## 📚 References

- [MongoDB Security Best Practices](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [Atlas Database User Privileges](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
- [Connection String URL Encoding](https://www.mongodb.com/docs/manual/reference/connection-string/#components)
