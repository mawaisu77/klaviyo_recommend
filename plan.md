# ReturnSense Project Plan

## 1. Project Overview

ReturnSense is a Shopify and Klaviyo integration that turns detailed return, exchange and refund information into useful marketing events.

Shopify stores detailed return information, including returned line items, quantities, return status, refunds and exchanges. Klaviyo can receive custom customer events and store custom properties against customer profiles. ReturnSense will connect these capabilities so marketers can trigger relevant Klaviyo flows after a customer returns or exchanges an item.

The simplest product description is:

“ReturnSense sends detailed Shopify return and exchange information to Klaviyo so stores can communicate with customers based on what they returned and why.”

## 2. Problem Being Solved

Normal purchase data tells Klaviyo what a customer bought, but it does not always provide enough item-level context about what happened after the purchase.

For example, a customer may purchase three products and return only one because the size was too small. Marketing automation may continue treating the returned product as a successful purchase and recommend the same product or size again.

ReturnSense will provide Klaviyo with more useful events such as:

```text
Return Requested
Return Approved
Item Returned
Item Exchanged
Partial Refund Issued
Return Completed
```

Each event will include the product, variant, quantity, return value, return reason and related order information.

## 3. Primary Product Goal

The goal of the MVP is to capture return-related activity from Shopify, normalize it and send it to Klaviyo as marketing-ready customer events.

The product should allow a merchant to:

Connect Shopify and Klaviyo.

Select which return events should be synchronized.

Map Shopify return reasons to marketing categories.

Send item-level return events into Klaviyo.

Update useful customer properties in Klaviyo.

View synchronization activity and errors.

Use the new events to create Klaviyo flows and segments.

## 4. Target Users

The main user is a Shopify merchant already using Klaviyo for email or SMS marketing.

The secondary user is a Klaviyo agency managing multiple Shopify stores.

The product is most valuable for fashion, footwear, beauty, accessories and other ecommerce businesses where returns, variants, sizing and exchanges are common.

## 5. MVP Scope

The first version should concentrate on reliable data synchronization.

The MVP will support one Shopify store and one Klaviyo account per organization. It will listen for return and refund activity, retrieve the complete information from Shopify and send normalized events to Klaviyo.

The MVP should include:

Shopify installation and authentication.

Klaviyo account connection.

Return and refund webhook handling.

Shopify return-detail retrieval.

Customer matching between Shopify and Klaviyo.

Custom Klaviyo event creation.

Klaviyo profile-property updates.

Return-reason mapping.

Synchronization logs.

Retry handling.

A basic dashboard.

Email or Slack notifications for failed synchronizations.

## 6. Features Excluded From the MVP

ReturnSense should not initially create shipping labels, approve returns, receive products into warehouses, issue refunds, manage reverse logistics or replace Shopify’s returns interface.

It should also not automatically create complicated Klaviyo email designs.

The product’s responsibility is to move clean, useful return data from Shopify into Klaviyo and provide instructions for using it.

## 7. Main User Journey

The merchant creates a ReturnSense account and connects their Shopify store.

They then connect their Klaviyo account using OAuth. Klaviyo OAuth provides access and refresh tokens that the application can use for authorized API requests.

ReturnSense imports the merchant’s available return reasons and displays default marketing categories.

The merchant reviews the mapping and activates synchronization.

When a return, exchange or refund happens, Shopify sends a webhook to ReturnSense. Shopify provides return-related webhook topics through its GraphQL Admin API, and the refund webhook can include associated return information.

ReturnSense validates the webhook, retrieves the complete return and order data, identifies the customer and converts the information into a standard internal format.

The system creates the appropriate Klaviyo event and updates the customer’s Klaviyo profile.

The event can then trigger a Klaviyo flow configured by the merchant.

## 8. Main System Flow

```text
Customer requests or completes a return
                    |
                    v
          Shopify creates return activity
                    |
                    v
       Shopify sends webhook to ReturnSense
                    |
                    v
     ReturnSense verifies webhook signature
                    |
                    v
    Background worker retrieves full return
                    |
                    v
  Returned items and customer are normalized
                    |
                    v
      Return reason is mapped to a category
                    |
                    v
       Custom event is sent to Klaviyo
                    |
                    v
       Klaviyo profile properties updated
                    |
                    v
      Klaviyo flow or segment can use data
```

## 9. Recommended Technology Stack

### Frontend

Use Next.js with TypeScript for the dashboard.

Use a component library such as shadcn/ui for forms, tables, dialogs and account settings.

The frontend will manage onboarding, account connections, return mappings, event logs and dashboard reporting.

### Backend

Use Node.js with NestJS.

NestJS is suitable because the application naturally separates into Shopify, Klaviyo, webhooks, synchronization, notifications and background-processing modules.

### Database

Use PostgreSQL with Prisma.

PostgreSQL will store organizations, connected stores, encrypted credentials, mappings, processed webhooks, synchronization jobs and error records.

### Queue

Use Redis with BullMQ.

Webhook requests should be acknowledged quickly. The detailed processing should happen in a background job rather than keeping the Shopify webhook request open.

### Deployment

The Next.js dashboard can run on Vercel.

The NestJS API and workers can run on Railway, Render, AWS ECS or another service that supports persistent background processes.

PostgreSQL can be hosted on Supabase, Neon, Railway or AWS RDS.

## 10. Proposed Application Modules

### Authentication Module

This module manages ReturnSense users, sessions and organizations.

It should support email and password authentication initially. Social authentication can be added later.

### Shopify Module

This module handles Shopify installation, OAuth, webhook registration and GraphQL requests.

Its responsibilities include retrieving orders, customers, returns, return line items, exchange items and refunds.

Shopify’s `Return` object is associated with an order and exposes return line items. Returned items retain a relationship with the original fulfilled line item and expose processing and refund quantities.

### Klaviyo Module

This module handles Klaviyo OAuth, token refresh, profile lookup, profile updates and event creation.

A Klaviyo custom event requires a metric name and a customer profile identifier such as an email, phone number, external ID or Klaviyo profile ID.

### Webhook Module

This module receives Shopify webhooks, verifies authenticity and stores the webhook before processing it.

Every webhook should have a unique identifier so duplicate deliveries do not create duplicate Klaviyo events.

### Synchronization Module

This is the central business-logic module.

It transforms Shopify information into the internal ReturnSense format, determines the correct event type, calculates profile statistics and prepares the Klaviyo payload.

### Mapping Module

This module maps raw Shopify return reasons into marketing categories.

For example:

```text
TOO_SMALL             → SIZE_ISSUE
TOO_LARGE             → SIZE_ISSUE
WRONG_COLOR            → PREFERENCE_ISSUE
DAMAGED                → PRODUCT_PROBLEM
NOT_AS_DESCRIBED       → EXPECTATION_PROBLEM
ORDERED_BY_MISTAKE     → CUSTOMER_CHANGED_MIND
OTHER                  → OTHER
```

The merchant should be able to change these mappings.

### Notification Module

This module sends alerts when synchronization repeatedly fails, a token expires or Klaviyo rejects an event.

### Reporting Module

This module produces simple counts such as returned items, return reasons, exchange rate and failed event synchronizations.

## 11. Internal Return Data Format

Shopify information should first be converted into an internal structure instead of being sent directly to Klaviyo.

A normalized return record could look like this:

```json
{
  "returnId": "shopify-return-id",
  "orderId": "shopify-order-id",
  "orderNumber": "1045",
  "customer": {
    "shopifyCustomerId": "customer-id",
    "email": "customer@example.com",
    "phone": null
  },
  "status": "COMPLETED",
  "currency": "USD",
  "totalReturnedValue": 75,
  "items": [
    {
      "productId": "product-id",
      "variantId": "variant-id",
      "productTitle": "Classic Jacket",
      "variantTitle": "Medium / Black",
      "sku": "JACKET-M-BLK",
      "quantity": 1,
      "returnReason": "TOO_SMALL",
      "marketingCategory": "SIZE_ISSUE",
      "returnedValue": 75
    }
  ],
  "createdAt": "2026-07-23T12:00:00Z"
}
```

This internal format will make the application easier to test and will prevent Shopify-specific structures from spreading through the entire codebase.

## 12. Klaviyo Event Structure

The primary event should be item-based because a single return may contain several products with different reasons.

Example event:

```json
{
  "metric": {
    "name": "Item Returned"
  },
  "profile": {
    "email": "customer@example.com",
    "external_id": "shopify-customer-id"
  },
  "properties": {
    "return_id": "shopify-return-id",
    "order_id": "shopify-order-id",
    "order_number": "1045",
    "product_id": "product-id",
    "variant_id": "variant-id",
    "product_title": "Classic Jacket",
    "variant_title": "Medium / Black",
    "sku": "JACKET-M-BLK",
    "quantity": 1,
    "return_reason": "TOO_SMALL",
    "return_category": "SIZE_ISSUE",
    "returned_value": 75,
    "currency": "USD"
  },
  "unique_id": "return-id-item-id"
}
```

The unique event identifier must remain the same during retries so the same Shopify activity does not create repeated Klaviyo events. Klaviyo recommends generating a stable UUID for an event and sending the same value when retrying it.

## 13. Klaviyo Profile Properties

ReturnSense should maintain calculated profile properties such as:

```text
returnsense_total_returns
returnsense_total_returned_items
returnsense_total_returned_value
returnsense_last_return_date
returnsense_last_return_reason
returnsense_last_return_category
returnsense_last_returned_product
returnsense_exchange_count
returnsense_return_rate
returnsense_customer_status
```

Klaviyo profiles support custom properties that can be updated and then used to create personalized customer experiences.

The return rate should only be calculated when the application has reliable purchase and return totals. It should not be guessed from incomplete data.

## 14. Suggested Marketing Flows

### Size Recovery Flow

Trigger: `Item Returned`

Condition: `return_category` equals `SIZE_ISSUE`

The customer receives a sizing guide, an exchange option and recommendations for another size.

### Damaged Product Support Flow

Trigger: `Item Returned`

Condition: `return_category` equals `PRODUCT_PROBLEM`

The customer receives an apology, support information and a replacement or resolution message.

### Exchange Follow-Up Flow

Trigger: `Item Exchanged`

The customer receives confirmation, care information and relevant recommendations for the replacement product.

### Post-Return Recovery Flow

Trigger: `Return Completed`

The customer receives a message after a short delay with alternative products that do not repeat the returned product or variant.

### High Return Rate Segment

Condition: `returnsense_return_rate` is above a merchant-defined threshold.

This segment can be excluded from aggressive discount campaigns or sent more detailed product information before future purchases.

## 15. Database Structure

### users

Stores application users.

Important fields:

```text
id
email
password_hash
created_at
updated_at
```

### organizations

Represents a merchant or agency account.

```text
id
name
plan
created_at
updated_at
```

### organization_users

Connects users with organizations and roles.

```text
id
organization_id
user_id
role
```

### shopify_connections

Stores Shopify connection information.

```text
id
organization_id
shop_domain
encrypted_access_token
scopes
status
installed_at
uninstalled_at
```

### klaviyo_connections

Stores Klaviyo OAuth information.

```text
id
organization_id
account_id
encrypted_access_token
encrypted_refresh_token
token_expires_at
scopes
status
```

### return_reason_mappings

Stores merchant-controlled mappings.

```text
id
organization_id
source_reason
marketing_category
is_active
```

### webhook_events

Stores incoming webhook records for deduplication and auditing.

```text
id
organization_id
source
topic
external_webhook_id
payload
status
received_at
processed_at
```

### returns

Stores normalized return information.

```text
id
organization_id
shopify_return_id
shopify_order_id
customer_email
status
currency
total_returned_value
return_created_at
raw_data
```

### return_items

Stores individual returned products.

```text
id
return_id
product_id
variant_id
sku
title
quantity
reason
marketing_category
returned_value
```

### sync_jobs

Stores every Klaviyo synchronization attempt.

```text
id
organization_id
return_id
return_item_id
event_type
klaviyo_event_id
status
attempt_count
error_message
processed_at
```

## 16. Backend API Structure

### Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### Shopify Connection

```text
GET  /integrations/shopify/install
GET  /integrations/shopify/callback
GET  /integrations/shopify/status
POST /integrations/shopify/disconnect
```

### Klaviyo Connection

```text
GET  /integrations/klaviyo/connect
GET  /integrations/klaviyo/callback
GET  /integrations/klaviyo/status
POST /integrations/klaviyo/disconnect
```

### Webhooks

```text
POST /webhooks/shopify/returns
POST /webhooks/shopify/refunds
POST /webhooks/shopify/app-uninstalled
```

### Return Mappings

```text
GET   /return-mappings
POST  /return-mappings
PATCH /return-mappings/:id
```

### Returns and Synchronization

```text
GET  /returns
GET  /returns/:id
GET  /sync-jobs
GET  /sync-jobs/:id
POST /sync-jobs/:id/retry
```

### Dashboard

```text
GET /dashboard/summary
GET /dashboard/return-reasons
GET /dashboard/sync-health
```

## 17. Dashboard Screens

### Onboarding

Explains the product and asks the user to connect Shopify and Klaviyo.

### Integration Settings

Shows the status of both connections, permissions, last synchronization time and reconnect controls.

### Return Reason Mapping

Allows the merchant to assign Shopify reasons to ReturnSense marketing categories.

### Returns Activity

Displays recent returns with customer, product, reason, value and Klaviyo synchronization status.

### Return Details

Shows the complete return, all returned items, event payloads and synchronization attempts.

### Sync Errors

Shows failed events, error explanations and retry actions.

### Analytics Summary

Shows total returns, returned value, top reasons, top returned products and successful versus failed Klaviyo events.

## 18. Implementation Phases

### Phase One: Project Foundation

Create the NestJS API, Next.js frontend, PostgreSQL database and Redis queue.

Implement user authentication, organizations, environment validation, logging and error handling.

The output of this phase is a running application where a user can register and access an empty dashboard.

### Phase Two: Shopify Integration

Create a Shopify development app and connect it to a development store.

Implement the Shopify OAuth flow, encrypted token storage and webhook registration.

Add GraphQL methods for retrieving an order, return, return items, exchanges, customer and refund information.

The output of this phase is a dashboard that can show raw Shopify return activity.

### Phase Three: Klaviyo Integration

Create a Klaviyo OAuth application.

Implement authorization, token refresh, profile lookup, profile updates and custom event creation.

The output of this phase is the ability to send a manually created test return event to Klaviyo.

### Phase Four: Return Processing Engine

Create the normalized return structure, reason mapping and customer-matching logic.

Process Shopify webhooks through BullMQ and generate item-level events.

The output is automatic Shopify-to-Klaviyo synchronization.

### Phase Five: Profile Calculations

Calculate total returns, returned items, returned value, last return information and exchange count.

Update the related Klaviyo profile after every successful return synchronization.

The output is customer data that can be used in Klaviyo segments.

### Phase Six: Dashboard and Error Management

Build return lists, details, synchronization logs, retry controls and dashboard totals.

Add email or Slack alerts for repeated failures.

The output is an operational product that merchants can understand and manage.

### Phase Seven: Testing and Demo Preparation

Create test purchases, partial returns, full returns, exchanges and refunds.

Verify that each case produces the correct Klaviyo event only once.

Create two demonstration Klaviyo flows, such as a size-recovery flow and damaged-product support flow.

The output is a complete end-to-end product demonstration.

## 19. Testing Plan

### Unit Testing

Test return normalization, reason mapping, profile calculations, Klaviyo payload generation and duplicate detection.

### Integration Testing

Test Shopify GraphQL responses, Klaviyo event creation, token refreshing and database transactions.

### Webhook Testing

Test valid signatures, invalid signatures, duplicate webhooks, delayed webhooks and out-of-order events.

### Failure Testing

Simulate Klaviyo rate limits, expired credentials, Shopify API failures, missing customer emails and database interruptions.

### End-to-End Testing

Complete the following scenario:

Create a Shopify customer.

Place an order containing two products.

Return one product because of a sizing issue.

Confirm that ReturnSense processes the webhook.

Confirm that `Item Returned` appears in Klaviyo.

Confirm that the Klaviyo customer profile is updated.

Confirm that the size-recovery flow is triggered.

Confirm that retrying the job does not create another event.

## 20. Manual Input Required

You will need to create a Shopify Partner account, Shopify development store, Klaviyo development account and Klaviyo OAuth application.

You will need sample products, customers, orders, returns and exchanges.

You must decide which Shopify return reasons belong to each marketing category.

You must configure the first Klaviyo flows and email templates.

You must also provide product branding, application name, logo, notification email and privacy-policy information before public installation.

## 21. MVP Acceptance Criteria

The MVP will be considered complete when a merchant can connect Shopify and Klaviyo without manually entering private API keys.

A Shopify return must automatically produce the appropriate Klaviyo event.

Each returned item must include product, variant, quantity, value and reason information.

The customer’s Klaviyo profile must be updated with return statistics.

Duplicate Shopify webhooks must not create duplicate Klaviyo events.

Failed jobs must be visible and retryable.

The dashboard must show recent returns and synchronization status.

At least two working Klaviyo flows must demonstrate how the synchronized data is used.

## 22. Final Product Output

The final MVP will be a working SaaS dashboard that connects one Shopify store to one Klaviyo account.

When a customer returns or exchanges an item, the application will automatically send detailed marketing information to Klaviyo.

The merchant will be able to build targeted flows based on the returned product, variant, reason, value and customer return history.

The dashboard will provide synchronization visibility, failure recovery and basic return insights.

The main demonstration will be:

“A customer returns a medium jacket because it is too small. ReturnSense sends the item and reason to Klaviyo, updates the customer profile and triggers a flow recommending an exchange or a better size.”
