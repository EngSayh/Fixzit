# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - img [ref=e6]
    - heading "System Error Detected" [level=2] [ref=e8]
    - paragraph [ref=e9]: useTopBar must be used within TopBarProvider
    - generic [ref=e10]:
      - generic [ref=e11]:
        - strong [ref=e12]: "Error ID:"
        - code [ref=e13]: ERR-1759052087106-9p7olphwe
      - generic [ref=e14]: Please include this ID when reporting the issue
    - generic [ref=e16]: "Retry: 0/3"
    - generic [ref=e17]:
      - button "🔄 Retry (3 attempts left)" [ref=e18] [cursor=pointer]
      - button "🔄 Force Refresh" [ref=e19] [cursor=pointer]
      - button "📋 Copy Error Details" [ref=e20] [cursor=pointer]
      - button "📝 Report to Support" [ref=e21] [cursor=pointer]
      - link "📚 Get Help" [ref=e22] [cursor=pointer]:
        - /url: /help
    - group [ref=e23]
    - group [ref=e25]
    - group [ref=e27]
  - generic [ref=e31] [cursor=pointer]:
    - img [ref=e32] [cursor=pointer]
    - generic [ref=e34] [cursor=pointer]: 2 errors
    - button "Hide Errors" [ref=e35] [cursor=pointer]:
      - img [ref=e36] [cursor=pointer]
```