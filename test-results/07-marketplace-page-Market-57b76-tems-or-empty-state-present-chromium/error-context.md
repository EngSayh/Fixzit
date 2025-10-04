# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8] [cursor=pointer]
  - alert [ref=e11]
  - generic [ref=e13]:
    - img [ref=e15]
    - heading "System Error Detected" [level=2] [ref=e17]
    - paragraph [ref=e18]: "{\"name\":\"MarketplaceFetchError\",\"code\":\"HTTP_ERROR\",\"userMessage\":\"Unable to reach marketplace services. Please try again shortly.\",\"devMessage\":\"Request failed: 501 Not Implemented for http://localhost:3000/api/marketplace/products?limit=8\",\"correlationId\":\"c4b290a9-4e76-41bb-a34f-e9b2b141638f\"}"
    - generic [ref=e19]:
      - generic [ref=e20]:
        - strong [ref=e21]: "Error ID:"
        - code [ref=e22]: ERR-bb54f532-4166-4cf1-9449-395d1dd424f0
      - generic [ref=e23]: Please include this ID when reporting the issue
    - generic [ref=e25]: "Retry: 0/3"
    - generic [ref=e26]:
      - button "🔄 Retry (3 attempts left)" [ref=e27] [cursor=pointer]
      - button "🔄 Force Refresh" [ref=e28] [cursor=pointer]
      - button "📋 Copy Error Details" [ref=e29] [cursor=pointer]
      - button "📝 Report to Support" [ref=e30] [cursor=pointer]
      - link "📚 Get Help" [ref=e31] [cursor=pointer]:
        - /url: /help
    - group [ref=e32]
    - group [ref=e34]
    - group [ref=e36]
```