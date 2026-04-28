# Specs

This folder contains the authoritative specifications for the POS system.

## Files

- **`POS_SRS_v1_0.docx`** — Software Requirements Specification v1.0.
  The base contract. Covers TVA compliance, multi-tenant architecture,
  terminal/sync, role hierarchy, payment integration. ~30 pages.

- **`POS_Extension_Spec_v1_1.md`** — Extension Features Spec v1.1.
  Built on top of the SRS. Covers customers/loyalty, promotions, coupons,
  points exchange, restaurant ops, inventory, chain, recommendations,
  communications, platform admin. ~3400 lines, 19 sections.

## Reading order

1. Start with the SRS — it defines the world (TVA, multi-tenancy, roles).
2. Read extension spec §1 (Introduction) and §2 (Cross-cutting Concerns) —
   these apply to every module.
3. For any specific feature, jump to its module section by code:

   | Code | Module | Section |
   |---|---|---|
   | CUST | Customers & Loyalty | §3 |
   | PROM | Promotions | §4 |
   | CPN | Coupons | §5 |
   | PEX | Points Exchange | §6 |
   | RST | Restaurant Operations | §7 |
   | INV | Inventory & Stock | §8 |
   | CHN | Chain & Franchise | §9 |
   | REC | Recommendations | §10 |
   | COM | Communications | §11 |
   | ADM | Platform Admin Extras | §12 |

4. **§13 = schema** (canonical), **§14 = phases**, **§16 = open legal questions**,
   **§18 = endpoint catalogue**.

## Versioning

Specs are versioned. When a change is made:

1. Bump the file version (v1.0 → v1.1 → v2.0).
2. Add a row to the Revision History at the top of the file.
3. Update this README to reference the new version.

Implementation should reference a specific version. **Do not mutate published
versions in place** — create a new version file instead, even for typo fixes.

## Source documents (reference only)

The original AiBao Cloud documentation that informed the extension spec lives
in `../reference/`. The extension spec extracted what was relevant for our
context; the reference docs are kept for traceability but should NOT be cited
as authoritative. If you find yourself reaching for them, ask whether the spec
is missing something — and if so, update the spec, don't work from the reference.
