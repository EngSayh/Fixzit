# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
      - img [ref=e8] [cursor=pointer]
    - generic [ref=e11] [cursor=pointer]:
      - button "Open issues overlay" [ref=e12] [cursor=pointer]:
        - generic [ref=e13] [cursor=pointer]:
          - generic [ref=e14] [cursor=pointer]: "1"
          - generic [ref=e15] [cursor=pointer]: "2"
        - generic [ref=e16] [cursor=pointer]:
          - text: Issue
          - generic [ref=e17] [cursor=pointer]: s
      - button "Collapse issues badge" [ref=e18] [cursor=pointer]:
        - img [ref=e19] [cursor=pointer]
  - alert [ref=e21]
  - generic [ref=e23]:
    - img [ref=e25]
    - heading "System Error Detected" [level=2] [ref=e27]
    - paragraph [ref=e28]: useTopBar must be used within TopBarProvider
    - generic [ref=e29]:
      - generic [ref=e30]:
        - strong [ref=e31]: "Error ID:"
        - code [ref=e32]: ERR-6a45ed2d-34b8-423b-9c44-4d7efe069c1a
      - generic [ref=e33]: Please include this ID when reporting the issue
    - generic [ref=e35]: "Retry: 0/3"
    - generic [ref=e36]:
      - button "🔄 Retry (3 attempts left)" [ref=e37] [cursor=pointer]
      - button "🔄 Force Refresh" [ref=e38] [cursor=pointer]
      - button "📋 Copy Error Details" [ref=e39] [cursor=pointer]
      - button "📝 Report to Support" [ref=e40] [cursor=pointer]
      - link "📚 Get Help" [ref=e41] [cursor=pointer]:
        - /url: /help
    - group [ref=e42]
    - group [ref=e44]
    - group [ref=e46]
```