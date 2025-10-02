filepath = "app/api/finance/invoices/[id]/route.ts"
with open(filepath, "r") as f:
    content = f.read()
old = "req.ip ?? """""
new = "req.headers.get(\"x-forwarded-for\")?.split(\",\")[0] || req.headers.get(\"x-real-ip\") || \"unknown\""
content = content.replace(old, new)
with open(filepath, "w") as f:
    f.write(content)
print("Fixed!")
