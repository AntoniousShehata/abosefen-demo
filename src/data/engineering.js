// «How it's built» — the production system behind the demo. The words are in src/i18n/*.json (engineering.*);
// this file holds what is not translated: the figures, the technology names and the code excerpts.
//
// Every figure was counted in the private repository in October 2026 (docs/ENGINEERING.md says how), and every
// excerpt is shortened from a real file of it — names of the shop's data, people and figures are left out.

/** The repository's own address, taken from package.json at build time (the app's code holds no remote address). */
// eslint-disable-next-line no-undef
export const REPO_URL = typeof __REPO_URL__ === 'string' ? __REPO_URL__ : '';

export const STATS = [
  { key: 'services', value: '10' },
  { key: 'csharp', value: '103k' },
  { key: 'react', value: '68k' },
  { key: 'tests', value: '5,098' },
  { key: 'rules', value: '200' },
  { key: 'commits', value: '1,000+' },
];

export const STACK = [
  { key: 'backend', items: ['.NET 10', 'ASP.NET Core minimal APIs', 'EF Core 10', 'PostgreSQL 16', 'RabbitMQ', 'YARP', 'JWT'] },
  { key: 'frontend', items: ['React 19', 'Vite 6', 'Tailwind CSS', 'React Router 7', 'RTL · ar / en / de'] },
  { key: 'workers', items: ['Python', 'Flask', 'ONNX Runtime · DINOv2', 'Tesseract · EasyOCR'] },
  { key: 'quality', items: ['xUnit', 'FluentAssertions', 'Testcontainers', 'GitHub Actions', 'gitleaks', 'Trivy', 'Docker'] },
];

export const PRACTICES = ['tests', 'security', 'arabic', 'oneShop'];

// «Latest in production» — newest first. A change the demo can show with invented data carries tryIt: the demo's
// own page where its version of it can be tried (docs/SYNC.md, «Every production change reaches the demo»).
export const LATEST = [
  { id: 'wordStart', date: '2026-10-14', tryIt: '/search?q=' + encodeURIComponent('بان') },
  { id: 'supplierCheques', date: '2026-10-14' },
  { id: 'categoryPictures', date: '2026-10-14' },
  { id: 'productReading', date: '2026-10-14' },
  { id: 'reviews', date: '2026-10-14' },
  { id: 'siteNumbers', date: '2026-10-14' },
];

export const CASES = [
  {
    id: 'money',
    code: {
      file: 'Admin.Infrastructure/Services/JournalVoucherService.cs',
      text: `private async Task<JournalVoucher?> BuildAsync(Guid id, Figures f, …)
{
    if (f.PartyId is { } party)
        await LockAsync(party, ct);   // pg_advisory_xact_lock — held to the commit
    var number = await NextNumberAsync(VoucherPrefix, year, ct);

    // What a supplier is owed is read again HERE, under his lock:
    // of two payments at once, the second reads what the first left.
    if (f.KindName == SupplierPayment && f.KindCode == PaymentOnAccount
        && await SupplierOwedAsync(f.PartyId!.Value, id, ct) < f.Amount + f.Deducted)
        return null;

    // …and a cheque is cashed only while it stands: cancelled at the
    // same moment (under the same lock), it is not.
    if (f.KindName == ChequeCashed && f.RelatesTo is { } cheque
        && (await ChequeCashingAsync(cheque, id, ct) is not null
            || !await _db.JournalVouchers.AnyAsync(v => v.Id == cheque && v.ReversedAt == null, ct)))
        return null;
    …
}

// AdminDbContext — the last wall
entity.HasIndex(e => e.RelatesToVoucherId).IsUnique()
    .HasDatabaseName("UX_JournalVouchers_OneCashingACheque")
    .HasFilter("\\"Kind\\" = 'ChequeCashed' AND \\"ReversedAt\\" IS NULL");`,
    },
  },
  {
    id: 'month',
    code: {
      file: 'Admin.Infrastructure/Services/JournalPosterService.cs',
      text: `// A closed month takes nothing more, whatever door the entry came through.
// What a person writes by hand is refused; what a service tells late is booked
// at NOON of the first open day (midnight in Cairo is still the closed month's
// last evening in UTC), its own date kept beside it.
await using var own = await _ledger.BeginOwnTransactionAsync(ct);
await _ledger.HoldCalendarAsync(exclusive: false, ct);   // closing takes it exclusively

if (await _ledger.GetFirstOpenDayAsync(ct) is { } firstOpen
    && ShopClock.DayOf(entry.EntryDate) < firstOpen)
{
    if (JournalCatalog.IsByHand(entry.Source))
        return Result<JournalEntry>.Failure(JournalCatalog.MonthClosed);
    entry.DocumentDate ??= entry.EntryDate;
    entry.EntryDate = ShopClock.StartOf(firstOpen).AddHours(12);
}

// LedgerRepository
public const long CalendarKey = 0x4C44_4752_434C_4E44;   // "LDGRCLND"
… exclusive
    ? $"SELECT pg_advisory_xact_lock({CalendarKey})"
    : $"SELECT pg_advisory_xact_lock_shared({CalendarKey})"`,
    },
  },
  {
    id: 'oneDoor',
    code: {
      file: 'Catalog.Api/Endpoints/SupplierEndpoints.cs · Inventory/…/OrderCreatedEventHandler.cs',
      text: `// A supplier's money has ONE door — a voucher of the day-book — and ONE reader,
// his lines in the books. This door took any amount, with no place, no day and
// no undo: one instalment could be typed twice. It is closed and says where to go.
group.MapPost("{id:guid}/payments", () => Results.Json(
        new { success = false, error = SupplierPaymentMoved },
        statusCode: StatusCodes.Status410Gone))
    .RequireAuthorization("perm:suppliers.edit");

// Inventory — an order being created deducts nothing
public async Task HandleAsync(OrderCreatedEvent @event, CancellationToken ct)
{
    // Stock is NOT deducted here. Physical stock leaves on-hand only when the
    // order's reservation is CONFIRMED (ConfirmReservationAsync) — the single
    // source of truth that deducts per warehouse, records the movement, posts
    // the cost of goods and re-syncs the product's stock cache.
    …
}`,
    },
  },
  {
    id: 'revision',
    code: {
      file: 'Catalog.Infrastructure/Services/ReviewService.cs',
      text: `// CatalogDbContext
entity.Property(e => e.Revision).IsConcurrencyToken();

// ApproveAsync — the decision is about the words the panel showed.
if (review.Revision != revision)
    return Result<ModeratedReviewResponse>.Conflict(ReviewRules.ChangedSinceRead);

review.IsApproved = isApproved;
review.ModeratedAt = now;
review.Revision++;

try
{
    await _context.SaveChangesAsync(ct);   // UPDATE … WHERE "Revision" = @read
}
catch (DbUpdateConcurrencyException)
{
    // Its writer changed it while the decision was on its way.
    return Result<ModeratedReviewResponse>.Conflict(ReviewRules.ChangedSinceRead);
}`,
    },
  },
  {
    id: 'audit',
    code: {
      file: 'Shared.Infrastructure/Middleware/HttpAuditPublishMiddleware.cs · Http/AuditNote.cs',
      text: `if (!MutatingMethods.Contains(context.Request.Method)) return;
if (context.User?.Identity?.IsAuthenticated != true) return;
// a question asked by POST (a count, a preview) is not a change
if (context.GetEndpoint()?.Metadata.GetMetadata<NotAuditedAttribute>() is not null) return;
if (AuditNote.WasOnlyAsked(context)) return;

var record = new AuditLoggedEvent(userId, user, serviceName, method, path, statusCode,
                                  ClientIpResolver.Resolve(context), AuditNote.Read(context));
// its own scope — never the request's, which may hold a change the endpoint refused
await using var scope = scopeFactory.CreateAsyncScope();
await scope.ServiceProvider.GetRequiredService<IOutboxPublisher>().PublishAsync(record);

// AuditNote — a figure, a yes/no, an id or a short identifier; anything else
// (a sentence, a name somebody typed) is left out.
private static object? Figure(object? value) => value switch
{
    null or bool or Guid or int or long or decimal or double => value,
    string s when s.Length is > 0 and <= 80
        && s.All(c => c < 128 && (char.IsLetterOrDigit(c) || c is '_' or '-' or '.' or ':')) => s,
    _ => null,
};`,
    },
  },
  {
    id: 'search',
    code: {
      file: 'Shared.Contracts/Common/Search/SearchFold.cs · Catalog/…/ProductSearchEngine.cs',
      text: `public static string Fold(string? text)          // its twin: the SQL function abosefen_fold
{
    foreach (var raw in text.ToLowerInvariant())
    {
        var c = raw switch
        {
            'أ' or 'إ' or 'آ' or 'ٱ' => 'ا',
            'ى' => 'ي',
            'ة' => 'ه',
            'ؤ' => 'و',
            'ئ' => 'ي',
            >= '٠' and <= '٩' => (char)('0' + (raw - '٠')),
            _ => raw,
        };
        if (c == 'ـ' || (c >= 'ً' && c <= 'ٟ')) continue;   // tatweel, harakat
        …
    }
}

// SRCH-4: a short word the catalogue never holds whole, while some of its words
// begin with it, is the beginning of a word being typed — «بان» finds بانيو.
private static SearchTerm StartOfAWord(SearchTerm term, Snapshot snap)
{
    var shortOnes = term.WholeWordVariants.ToList();
    if (shortOnes.Any(snap.Words.ContainsKey)) return term;     // held whole: stays whole
    return snap.Words.Keys.Any(k => shortOnes.Any(v => k.Length > v.Length && k.StartsWith(v)))
        ? term with { WordStart = true }
        : term;
}`,
    },
  },
  {
    id: 'photo',
    code: {
      file: 'tools/vision-worker/app.py · Catalog/…/Search/Photo/PhotoLibrary.cs',
      text: `def prepare(im):
    """The WHOLE picture on a white square (never cropped: a tall shower column keeps its head and its foot)."""
    side = max(im.size)
    square = Image.new("RGB", (side, side), (255, 255, 255))
    square.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    …

def vectors_of(prepared):
    last_layer = _session.run(None, {_input: np.stack(prepared)})[0]   # DINOv2-small, ONNX, CPU
    out = last_layer[:, 0, :].astype(np.float32)
    out /= np.linalg.norm(out, axis=1, keepdims=True) + 1e-12
    return out

// C# — the whole library in memory, hidden products dropped before ranking
for (var row = 0; row < _urls.Length; row++)
{
    var likeness = Dot(_numbers.AsSpan(row * Dimensions, Dimensions), photo);   // SIMD
    if (likeness < minLikeness) continue;
    foreach (var product in _products[row])
        if (allowed is null || allowed.Contains(product))
            if (!best.TryGetValue(product, out var held) || likeness > held.Likeness)
                best[product] = (likeness, row);
}`,
    },
  },
  {
    id: 'rules',
    code: {
      file: 'docs/BUSINESS_RULES.md · tests/…/Architecture/AuditWritesInItsOwnScopeTests.cs',
      text: `### CAT-1 · Leaf-only products ✅
A product's category must be a leaf (no child categories). A category with
sub-categories is a navigation container; its counts roll up from its leaves.
- Enforced: ProductService.CreateAsync / UpdateAsync reject a non-leaf CategoryId
  (CatalogRules.LeafOnlyCategory); auto-classification refuses a non-leaf.

// A guard test reads the code itself:
[Fact]
public void No_middleware_is_handed_the_requests_database_context_or_outbox()
{
    // a middleware lives for one request's scope: a database context or an outbox
    // handed to its InvokeAsync IS the request's — every src/**/*.cs is read, and
    // one that asks for them fails the build
}

# The books check after a deploy — every line must read 0
entries out of balance · vouchers without exactly one entry · holes in numbered
series · supplier lines with no supplier · cheques out of step with their account
· entries dated into a closed month · advances below zero · …`,
    },
  },
];
