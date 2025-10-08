# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
      - img [ref=e8] [cursor=pointer]
    - generic [ref=e12] [cursor=pointer]:
      - button "Open issues overlay" [ref=e13] [cursor=pointer]:
        - generic [ref=e14] [cursor=pointer]:
          - generic [ref=e15] [cursor=pointer]: "1"
          - generic [ref=e16] [cursor=pointer]: "2"
        - generic [ref=e17] [cursor=pointer]:
          - text: Issue
          - generic [ref=e18] [cursor=pointer]: s
      - button "Collapse issues badge" [ref=e19] [cursor=pointer]:
        - img [ref=e20] [cursor=pointer]
  - alert [ref=e22]
  - generic [ref=e24]:
    - img [ref=e26]
    - heading "System Error Detected" [level=2] [ref=e28]
    - paragraph [ref=e29]: useTopBar must be used within TopBarProvider
    - generic [ref=e30]:
      - generic [ref=e31]:
        - strong [ref=e32]: "Error ID:"
        - code [ref=e33]: ERR-efd43336-cfe1-42ab-a21b-079210169fb6
      - generic [ref=e34]: Please include this ID when reporting the issue
    - generic [ref=e36]: "Retry: 0/3"
    - generic [ref=e37]:
      - button "🔄 Retry (3 attempts left)" [ref=e38] [cursor=pointer]
      - button "🔄 Force Refresh" [ref=e39] [cursor=pointer]
      - button "📋 Copy Error Details" [ref=e40] [cursor=pointer]
      - button "📝 Report to Support" [ref=e41] [cursor=pointer]
      - link "📚 Get Help" [ref=e42] [cursor=pointer]:
        - /url: /help
    - group [ref=e43]
    - group [ref=e45]
    - group [ref=e47]
```