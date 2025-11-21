# Quick Start: Deploy Now & Configure AI

## 🚀 Deploy (Choose One)

### Option A: Vercel Dashboard (Easiest - 2 minutes)
1. Visit: https://vercel.com/fixzit/fixzit
2. Click "Deployments" → "Deploy" → "Redeploy to Production"
3. Wait 2-4 minutes

### Option B: Fix Auto-Deploy (10 minutes - Permanent Solution)
1. Visit: https://vercel.com/fixzit/settings/members
2. Click "Invite Member"
3. Add GitHub username: `EngSayh`
4. Future commits will auto-deploy

---

## 🔑 Configure OpenAI API Key (REQUIRED)

### Method 1: Vercel Dashboard
1. Go to: https://vercel.com/fixzit/fixzit/settings/environment-variables
2. Add new variable:
   - Name: `OPENAI_API_KEY`
   - Value: `sk-proj-...` (get from https://platform.openai.com/api-keys)
   - Environment: **Production**
3. Click "Save"
4. **Redeploy** (go to Deployments → click "Redeploy")

### Method 2: CLI
```bash
cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit
vercel env add OPENAI_API_KEY production
# Paste your key when prompted
vercel deploy --prod --yes
```

---

## ✅ Test AI Bot

```bash
# Check if deployed
curl https://fixzit.co/api/health

# Test AI streaming (replace YOUR_TOKEN)
curl -X POST https://fixzit.co/api/copilot/stream \
  -H "Content-Type: application/json" \
  -H "Cookie: fixzit_auth=YOUR_TOKEN" \
  -d '{"message":"What is Fixzit?","locale":"en"}'
```

---

## 📊 What's New

### New API Endpoint
- `POST /api/copilot/stream` - Real-time AI streaming responses

### System Governors
- **Role-based access:** Different permissions per role
- **Content safety:** Blocks SQL injection, command injection
- **Data isolation:** Enforces tenant separation
- **Rate limiting:** 30 requests/minute

### Environment Variables
- `OPENAI_API_KEY` - Your OpenAI API key (REQUIRED)
- `COPILOT_MODEL` - Model to use (default: gpt-4o-mini)
- `ENFORCE_AI_BUSINESS_HOURS` - Restrict to business hours (default: false)

---

## 💸 Costs

**OpenAI Pricing (gpt-4o-mini):**
- $0.15 per 1M input tokens
- $0.60 per 1M output tokens
- ~$0.0001 per chat message

**Monthly estimate:** $10-50 depending on usage

---

## 🐛 Troubleshooting

### Deployment fails?
→ Use Vercel Dashboard (Option A above)

### AI not responding?
→ Check OPENAI_API_KEY is set in production
→ View logs: `vercel logs https://fixzit.co`

### Permission denied?
→ Check user role in database
→ Review governors in `server/copilot/governors.ts`

---

## 📞 Support

- **Docs:** `AI_ENHANCEMENT_COMPLETE.md`
- **Code:** Commit `696e9bc43`
- **Logs:** `vercel logs https://fixzit.co --follow`
