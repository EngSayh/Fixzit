# Souq Reviews API

This document summarizes the buyer, seller, and public review endpoints implemented under `/api/souq`.  
All routes require HTTPS in production and expect valid Fixzit authentication cookies.

## Buyer Endpoints

| Method | Route | Description |
| ------ | ----- | ----------- |
| `POST` | `/api/souq/reviews` | Submit a new review for a product the customer purchased. Body enforces rating/title/content + optional orderId/pros/cons/images. |
| `GET` | `/api/souq/reviews` | List the authenticated customer’s reviews with pagination and filters (`status`, `rating`, `verifiedOnly`). |
| `GET` | `/api/souq/reviews/:reviewId` | Fetch a review. Non-published reviews are only visible to the owner. |
| `PUT` | `/api/souq/reviews/:reviewId` | Edit a pending review. Validates payload before delegating to `reviewService.updateReview`. |
| `DELETE` | `/api/souq/reviews/:reviewId` | Delete a pending review. Published reviews cannot be deleted. |
| `POST` | `/api/souq/reviews/:reviewId/helpful` | Mark as helpful/not helpful. Accepts `{ action: 'helpful' | 'not_helpful' }`. |
| `POST` | `/api/souq/reviews/:reviewId/report` | Report a review with `{ reason: string }`; multiple reports auto-flag. |

## Seller Central Endpoints

| Method | Route | Description |
| ------ | ----- | ----------- |
| `GET` | `/api/souq/seller-central/reviews` | Paginated feed of reviews for the seller’s catalog. Supports `rating`, `status`, `verifiedOnly`, `sortBy`. |
| `POST` | `/api/souq/seller-central/reviews/:reviewId/respond` | Post a seller response. Service verifies the product belongs to the seller before persisting. |

## Public Product Feed

| Method | Route | Description |
| ------ | ----- | ----------- |
| `GET` | `/api/souq/products/:productId/reviews` | Public listing of published reviews + stats (average, distribution, verified count). Accepts paging/rating filters. |

## Notes

- All endpoints call `connectDb()` before accessing Mongo.
- Validation uses `zod` in the route handlers, while business logic is centralized inside `services/souq/reviews`.
- Seller UI (`SellerResponseForm`) now POSTs directly to the respond endpoint when no custom handler is supplied.

