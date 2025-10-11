# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
      - img [ref=e8] [cursor=pointer]
    - generic [ref=e13] [cursor=pointer]:
      - button "Open issues overlay" [ref=e14] [cursor=pointer]:
        - generic [ref=e15] [cursor=pointer]:
          - generic [ref=e16] [cursor=pointer]: "1"
          - generic [ref=e17] [cursor=pointer]: "2"
        - generic [ref=e18] [cursor=pointer]:
          - text: Issue
          - generic [ref=e19] [cursor=pointer]: s
      - button "Collapse issues badge" [ref=e20] [cursor=pointer]:
        - img [ref=e21] [cursor=pointer]
  - alert [ref=e23]
  - generic [ref=e25]:
    - img [ref=e27]
    - heading "System Error Detected" [level=2] [ref=e29]
    - paragraph [ref=e30]: useTopBar must be used within TopBarProvider
    - generic [ref=e31]:
      - generic [ref=e32]:
        - strong [ref=e33]: "Error ID:"
        - code [ref=e34]: ERR-9ac5d724-218b-4f25-bc35-0384fc07fa28
      - generic [ref=e35]: Please include this ID when reporting the issue
    - generic [ref=e37]: "Retry: 0/3"
    - generic [ref=e38]:
      - button "🔄 Retry (3 attempts left)" [ref=e39] [cursor=pointer]
      - button "🔄 Force Refresh" [ref=e40] [cursor=pointer]
      - button "📋 Copy Error Details" [ref=e41] [cursor=pointer]
      - button "📝 Report to Support" [ref=e42] [cursor=pointer]
      - link "📚 Get Help" [ref=e43]:
        - /url: /help
    - group [ref=e44]
    - group [ref=e46]
    - group [ref=e48]
```