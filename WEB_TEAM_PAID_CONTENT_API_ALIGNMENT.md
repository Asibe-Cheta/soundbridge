## Paid Content API Alignment (Web + Mobile)

This note documents the response-shape mismatches we found between the mobile UI expectations and current TypeScript types. Mobile now normalizes multiple shapes for safety, but we want a single canonical API contract across web and mobile.

### Endpoints in question
- `GET /api/sales/analytics` (alias: `GET /api/creator/sales-analytics`)
- `GET /api/purchases/user` (alias: `GET /api/user/purchased-content`)

### 1) Sales Analytics response
Canonical response now aligned to mobile UI shape:
- `primary_currency` (string, e.g. "USD")
- `total_revenue` (number)
- `revenue_this_month` (number)
- `total_sales` (number) **and** `total_sales_count` (kept for backward compatibility)
- `sales_by_type` (array of `{ content_type, count }`)
- `top_selling_content` (array of `{ content_id, content_type, content_title, sales_count, total_revenue }`)
- `recent_sales` (array of `{ purchase_id, content_title, amount, currency, purchased_at, buyer_username? }`)

#### Resolved (web canonical)
1) **Canonical:** `total_sales` (keep `total_sales_count` for compatibility)
2) **Canonical:** `sales_by_type` as array of `{ content_type, count }`
3) **Canonical:** `content_title` and `total_revenue`
4) **Canonical:** `amount`
5) **Canonical:** `primary_currency` always provided (defaults to `"USD"` if empty)

#### Example (mobile UI shape)
```
{
  "primary_currency": "USD",
  "total_revenue": 1250.50,
  "revenue_this_month": 220.00,
  "total_sales": 42,
  "sales_by_type": [
    { "content_type": "track", "count": 30 },
    { "content_type": "album", "count": 8 },
    { "content_type": "podcast", "count": 4 }
  ],
  "top_selling_content": [
    {
      "content_id": "uuid",
      "content_type": "track",
      "content_title": "My Song",
      "sales_count": 10,
      "total_revenue": 49.90
    }
  ],
  "recent_sales": [
    {
      "purchase_id": "uuid",
      "content_title": "My Song",
      "amount": 4.99,
      "currency": "USD",
      "purchased_at": "2026-01-18T10:00:00Z",
      "buyer_username": "user123"
    }
  ]
}
```

### 2) User Purchased Content response
Canonical response now aligned to mobile UI shape:
- `id` (purchase id)
- `content_id`
- `content_type`
- `price_paid`
- `currency`
- `purchased_at`
- `download_count`
- `content` (full content record used for playback/display)

Canonical wrapper:
```
{ "data": [ ... ] }
```

#### Resolved (web canonical)
1) **Flattened purchase fields** at top level
2) **No nested purchase object**
3) **Top-level array is `data`**
4) **Each item includes `content`**

#### Example (mobile UI shape)
```
{
  "data": [
    {
      "id": "purchase_uuid",
      "content_id": "content_uuid",
      "content_type": "track",
      "price_paid": 1.99,
      "currency": "USD",
      "purchased_at": "2026-01-18T10:00:00Z",
      "download_count": 2,
      "content": {
        "id": "content_uuid",
        "title": "My Song",
        "file_url": "https://...",
        "cover_art_url": "https://...",
        "creator_id": "creator_uuid"
      }
    }
  ]
}
```

### Why this matters
We currently normalize multiple shapes on mobile to prevent UI breakage. Confirming a single canonical response will allow us to remove normalization and keep web + mobile perfectly consistent.
