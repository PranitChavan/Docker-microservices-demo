Mobile App ──────────────┐
                         │
Web App ─────────────────┼──→ User Service (localhost:3001)
                         │
Admin Panel ─────────────┼──→ Product Service (localhost:3002)
                         │
                         ├──→ Cart Service (localhost:3003)
                         │
                         └──→ Order Service (localhost:3004)
```

**Problems:**
- ❌ Clients need to know ALL service URLs
- ❌ If a service port changes, ALL clients break
- ❌ No centralized authentication
- ❌ CORS issues with multiple domains
- ❌ Hard to add rate limiting, logging

---

## With API Gateway
```
Mobile App ──────────────┐
                         │
Web App ─────────────────┼──→ API Gateway (localhost:3000)
                         │         │
Admin Panel ─────────────┘         │
                                   ├──→ User Service (3001)
                                   ├──→ Product Service (3002)
                                   ├──→ Cart Service (3003)
                                   └──→ Order Service (3004)