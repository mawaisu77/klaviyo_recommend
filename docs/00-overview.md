# 00 - Product Overview

## What ReturnSense is

> ReturnSense sends detailed Shopify return and exchange information to Klaviyo so
> stores can communicate with customers based on what they returned and why.

Shopify stores rich return data (returned line items, quantities, status, refunds,
exchanges). Klaviyo can receive custom events and store custom profile properties.
ReturnSense connects the two so marketers can trigger relevant Klaviyo flows after a
customer returns or exchanges an item.

## Problem being solved

Purchase data tells Klaviyo what a customer bought, but not what happened after the
purchase. A customer may buy three products and return one because the size was too
small; without return context, automation keeps treating that product as a success and
recommends the same product or size again.

ReturnSense provides item-level, reason-aware return events so marketing can react
correctly.

## Events produced

```text
Return Requested
Return Approved
Item Returned
Item Exchanged
Partial Refund Issued
Return Completed
```

Each event includes product, variant, quantity, return value, return reason, mapped
marketing category, and related order info.

## Primary goal (MVP)

Capture return-related activity from Shopify, normalize it, and send it to Klaviyo as
marketing-ready customer events. A merchant should be able to:

- Connect Shopify and Klaviyo (via OAuth, no manual API keys)
- Choose which return events to sync
- Map Shopify return reasons to marketing categories
- Send item-level return events into Klaviyo
- Update useful Klaviyo customer profile properties
- View synchronization activity and errors
- Use the new events to build Klaviyo flows and segments

## Target users

- **Primary:** a Shopify merchant already using Klaviyo for email/SMS.
- **Secondary:** a Klaviyo agency managing multiple Shopify stores.
- **Best fit:** fashion, footwear, beauty, accessories, and similar ecommerce where
  returns, variants, sizing, and exchanges are common.

## MVP scope

One Shopify store and one Klaviyo account per organization. Listen for return/refund
activity, retrieve complete data from Shopify, send normalized events to Klaviyo.

Included: Shopify install/auth, Klaviyo connection, return/refund webhook handling,
return-detail retrieval, customer matching, custom event creation, profile-property
updates, return-reason mapping, sync logs, retry handling, a basic dashboard, and
failure notifications.

## Explicitly out of scope (MVP)

ReturnSense does **not** create shipping labels, approve returns, receive products into
warehouses, issue refunds, manage reverse logistics, replace Shopify's returns UI, or
design complex Klaviyo emails. Its job is to move clean, useful return data from Shopify
into Klaviyo and provide guidance for using it.

## Main user journey

1. Merchant creates a ReturnSense account and connects Shopify.
2. Merchant connects Klaviyo via OAuth (access + refresh tokens stored encrypted).
3. ReturnSense imports available return reasons and shows default marketing categories.
4. Merchant reviews the mapping and activates synchronization.
5. On a return/exchange/refund, Shopify sends a webhook to ReturnSense.
6. ReturnSense verifies the webhook, retrieves full return + order data, identifies the
   customer, and normalizes it.
7. The system creates the appropriate Klaviyo event and updates the profile.
8. The event triggers a merchant-configured Klaviyo flow.

## MVP acceptance criteria

- Merchant connects Shopify and Klaviyo without entering private API keys.
- A Shopify return automatically produces the correct Klaviyo event.
- Each returned item includes product, variant, quantity, value, and reason.
- The customer's Klaviyo profile is updated with return statistics.
- Duplicate Shopify webhooks never create duplicate Klaviyo events.
- Failed jobs are visible and retryable.
- The dashboard shows recent returns and sync status.
- At least two working Klaviyo flows demonstrate the synchronized data.

## Signature demo

> A customer returns a medium jacket because it is too small. ReturnSense sends the item
> and reason to Klaviyo, updates the customer profile, and triggers a flow recommending
> an exchange or a better size.
