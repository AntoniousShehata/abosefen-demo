# Keeping the demo in step with production

The demo is a **separate repository**. It never merges production code, never copies the production repository,
and never needs access to the production database. What it shares with production is small, explicit and
versioned. This page explains what is shared, what is never shared, how a change in production is noticed, and
what a person has to look at.

---

## 1. What is shared — and what never is

| Shared (on purpose) | Where it lives in the demo | How it is kept equal |
|---|---|---|
| **Data contracts** — the field names the production frontend reads for a product, a variant, a category, a cart line and an order, plus the order statuses and the four customer stages | `contracts/shapes.json` (versioned) | `scripts/check-contracts.mjs` (production side) and `tests/contracts.test.js` (demo side, in CI) |
| **Design tokens** — the four brand colour channels and the three font families | `src/index.css`, `tailwind.config.js`, `index.html` | snapshot in `contracts/shapes.json` → `designTokens`, `fonts`; asserted by `tests/contracts.test.js` |
| **Generic market taxonomy** — the department names of the Egyptian sanitaryware market (rough-in → finishing) | `src/data/catalog.js` → `CATEGORIES` | snapshot → `taxonomy`; reviewed by hand (the demo chooses its own subset) |

**Never shared** — not in code, not in fixtures, not in workflows, not in history:

- product photographs (they are manufacturers' pictures) — the demo draws its own SVG illustrations;
- real product names, model codes, prices, stock figures, suppliers;
- customers, orders, invoices, employees, any personal data;
- `.env` files, API keys, tokens, connection strings, e-invoicing or payment settings;
- server code, and in particular any code that touches money, stock or the books;
- production URLs or API endpoints (the demo calls no server at all).

All brands in the demo are invented; any resemblance to a real maker is coincidental (`tests/catalog.test.js`
refuses well-known maker names).

---

## 2. The contract file

`contracts/shapes.json` holds, for each shape:

| Key | Meaning |
|---|---|
| `extract` | How production usage is read: which files, which variable names (`product`, `item`, `order`…), or which object/array/locale/regex. |
| `productionUses` | **The snapshot**: what production used when the snapshot was taken (`snapshot.commit`, `snapshot.takenAt`). |
| `demoProvides` | What the demo's fake API promises to serve. `tests/contracts.test.js` fails if any of these is missing from a real answer. |
| `knownGaps` | Fields production uses that the demo leaves out on purpose (reviews, photos, e-invoice status, …). |

`productDto` and `cartItemDto` are the raw shapes the production **server** sends (as the frontend's mapping
code reads them). The demo serves the already-mapped shapes, so these two are *watched only*: a change there means
the production API changed, and someone should check whether the mapped shape changed with it.

**Versioning** (`contractVersion`, semantic):

- **MAJOR** — the demo's served shape lost or renamed a field;
- **MINOR** — the demo serves new fields;
- **PATCH** — only the production snapshot or the `knownGaps` list was refreshed.

---

## 3. How a production change is detected

Run, from the demo folder, against a local checkout of production:

```bash
node scripts/check-contracts.mjs ../Abosefen_Web          # or: npm run check:contracts -- ../Abosefen_Web
```

The script is **read-only** towards production: it reads files under `frontend/src` (and `frontend/index.html`,
and `.git/HEAD` to name the commit). It runs no git command, writes nothing there and needs no network or token.

Output, per shape: `ok` or `CHANGED`, with

- `+ now used by production: …` — a field production reads that the snapshot did not have,
- `- no longer used by production: …` — a field the snapshot had that production no longer reads,
- `! source not found: …` — a file the rule reads was moved or deleted (fix the rule),
- `· used by production, not served by the demo` — information only.

Exit code **0** = no difference, **1** = a difference (or a missing source), **2** = wrong usage
(`tests/check-contracts.test.js` proves all three against a synthetic «production» folder).
`--json` prints the same as JSON for a pipeline.

### Optional automation (described here, deliberately not added)

Two ways to run the check automatically, both requiring the owner's decision:

**A. From the production repository (no secret needed — preferred).** The demo repository is public, so a
workflow in the *production* repository can fetch it without any token:

```yaml
# .github/workflows/demo-contracts.yml  — in the PRODUCTION repository (not added; owner's decision)
on:
  push:
    branches: [main]
    paths: ['frontend/src/**', 'frontend/index.html']
permissions:
  contents: read
jobs:
  demo-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { path: production, persist-credentials: false, sparse-checkout: 'frontend' }
      - uses: actions/checkout@v4
        with: { repository: AntoniousShehata/abosefen-demo, path: demo, persist-credentials: false }
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: node demo/scripts/check-contracts.mjs production
```

A red run tells the team «the demo may be out of step» — nothing is changed automatically.

**B. From the demo repository on a schedule.** The production repository is private, so this needs a
**fine-grained personal access token that the owner creates**: repository access = *only* the production
repository, permission *Contents: read-only*, nothing else, short expiry; stored in the demo repository as the
secret `PRODUCTION_READ_TOKEN`. The job must use a sparse checkout of `frontend/` only, `persist-credentials:
false`, run nothing but the script, print nothing but its report and upload no artifact. Because that token can read
the whole production source, option A is preferred.

Neither option merges anything: production changes never flow into the demo automatically.

---

## 4. When the check fails — what is automated and what is reviewed by hand

1. **Detect** — the script reports the shapes that changed (automated).
2. **Identify the affected demo parts** — use the table below (by hand, a few minutes).
3. **Compatibility checks** — `npm test` runs `tests/contracts.test.js` (served shapes), the API tests and the page
   smoke tests (automated).
4. **Build and test** — `npm run build && npm test` (automated in CI on every push).
5. **Report** — paste the script output into the pull request that updates the demo.
6. **Update safely** — refreshing the snapshot is automated (`--write`, after review); changing what the demo serves
   is done by hand.
7. **Review required** — any change to `demoProvides`, to money rules (VAT, discounts), to order statuses, to stock
   behaviour or to roles is reviewed by a person before merge; these can change what a visitor is told.

| Shape | Demo files to look at |
|---|---|
| `product`, `variant` | `src/api/createApi.js` (`productOut`), `src/data/catalog.js`, `src/components/ProductCard.jsx`, `src/pages/ProductPage.jsx` |
| `category` | `src/api/createApi.js` (`categoryOut`), `src/pages/CategoryPage.jsx`, `src/pages/AllCategories.jsx`, `src/pages/admin/AdminCategories.jsx` |
| `cartLine` | `src/api/createApi.js` (`cartOut`), `src/pages/CartPage.jsx`, `src/pages/CheckoutPage.jsx` |
| `order`, `orderStatus`, `orderStages`, `orderStageLabels` | `src/lib/orderFlow.js`, `src/api/createApi.js` (`placeOrder`, `changeOrderStatus`), `src/components/OrderTimeline.jsx`, `src/pages/OrderPage.jsx`, `src/pages/admin/AdminOrders.jsx`, the `order.*` keys of `src/i18n/*.json` |
| `productDto`, `cartItemDto` | none directly — check whether the mapped shapes above changed too |
| `taxonomy` | `src/data/catalog.js` (`CATEGORIES`) — decide whether the demo should show the new department |
| `designTokens`, `fonts` | `src/index.css`, `tailwind.config.js`, `index.html` |

Then refresh the snapshot and commit both together:

```bash
node scripts/check-contracts.mjs ../Abosefen_Web --write   # takes production's current usage as the new snapshot
git diff contracts/shapes.json                               # read it
npm test && npm run build
```

---

## 5. Limits of the extraction (be honest about what it cannot see)

- It is **grep-based**: it finds `product.price` and `product?.pricing?.salePrice`, but not destructuring
  (`const { price } = product`), spreads, computed access (`product[key]`), or a value passed on under another name.
- It reads **only the files listed** in `contracts/shapes.json`. A new production page that reads products is not
  watched until it is added to a rule's `sources`.
- Short names (`c`, `o`, `v`) may also catch unrelated objects in those files. That noise is part of the snapshot
  and is stable; only *changes* matter.
- It sees **names, not meaning**: a field that keeps its name but changes its unit (pounds → piasters) or its
  format is invisible to it.
- It does not check **business rules** (VAT 14 % on subtotal − discount, stock taken at confirmation, sets counted
  from their parts, products on final categories only). The demo implements its own simplified copies of these;
  they are reviewed by hand against production's business rules when those change.
- It does not check the server's API (routes, status codes, error envelopes). The demo has no server.

---

## 6. Release routine (short checklist)

- [ ] `node scripts/check-contracts.mjs <production>` → exit 0, or the differences reviewed and handled.
- [ ] `npm test` green, `npm run build` green.
- [ ] No new network call (`tests/no-network.test.js`), no real brand (`tests/catalog.test.js`), every visible word
      translated (`tests/i18n.test.js`).
- [ ] Secret scan of the demo repository — every hit must be prose, never a value:
      `grep -rniE "password\s*=|secret|token|bearer|connection ?string" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git .`
- [ ] Bump `contractVersion` if the demo's served shapes changed.
