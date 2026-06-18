# Merchant Catalog API Research

## Date

2026-06-10

## Question

Is there a reliable public API for a consumer loyalty-card wallet to fetch a broad list of stores and discount or loyalty program information?

## Finding

No reliable broad public consumer API was identified. The available loyalty APIs found are primarily for merchants or businesses that operate their own loyalty programs, not for a wallet app that needs a universal store catalog.

## Sources Checked

- [Square Loyalty API](https://developer.squareup.com/docs/loyalty-api/overview): lets developers integrate with Square Loyalty programs for sellers that already use Square Loyalty.
- [Open Loyalty API documentation](https://help.openloyalty.io/): API-first loyalty engine for businesses building their own loyalty programs.
- [TapMango integrations](https://www.tapmango.com/integrations): business loyalty platform and POS integrations.

## Product Decision

Do not make a remote merchant/discount API part of the MVP.

MVP add-card flow should start with scanning. A local seed catalog can be added later for convenience, but users must always be able to add a card without selecting a known merchant.

## Implementation Implication

The `Offers` tab can exist in the MVP as a local/offline product area, but it should not depend on a public discounts API. It can start with an empty state or local card-related offers only if data exists.
