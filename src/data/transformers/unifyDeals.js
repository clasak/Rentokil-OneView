// Transformers to unify legacy sources into UnifiedDeals
// Sources: Brad cadence, Cody L tracker, Houston New Start (deprecated)
// OPTIMIZED: Single-pass processing with inline transformations

function normalizeCurrency(v){
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  return Number(String(v).replace(/[$,]/g, '')) || 0;
}

function parseDate(s){
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function fuzzyAnnualMatch(a, b, tolerancePct = 0.05){
  if (!a || !b) return false;
  const diff = Math.abs(a - b);
  const base = Math.max(a, b);
  return (diff / base) <= tolerancePct;
}

function keyForDup(customer, ae, createdAt){
  const d = createdAt instanceof Date ? createdAt : parseDate(createdAt);
  if (!d) return `${customer}::${ae}::`;
  // ±1 day bucket key
  const bucket = new Date(d);
  bucket.setHours(0,0,0,0);
  return `${String(customer).toLowerCase().trim()}::${String(ae).toLowerCase().trim()}::${bucket.toISOString().slice(0,10)}`;
}

// OPTIMIZED: Unified transformation function to avoid code duplication
function transformRow(r, sourceType = 'brad'){
  const deal = {
    DealId: String(r.ID || r.DealId || ''),
    Customer: String(r.Customer || r.Customer_Name || ''),
    AE: String(r.AE || r.Sales_Rep || ''),
    Branch: String(r.Branch || r.Branch_Name || ''),
    Vertical: String(r.Vertical || ''),
    LeadSource: String(r.Lead_Source || r.Source || ''),
    Stage: String(r.Stage || r.Status || 'Lead'),
    InitialFee: normalizeCurrency(r.Initial_Fee || r.InitialFee),
    MonthlyFee: normalizeCurrency(r.Monthly_Fee || r.MonthlyFee),
    FrequencyPY: Number(r.Frequency || r.FrequencyPY || 0),
    AnnualValue: normalizeCurrency(r.Annual_Value || r.AnnualValue),
    CreatedAt: parseDate(r.Created_At || r.CreatedAt)?.toISOString() || null,
    ClosedAt: parseDate(r.Closed_At || r.ClosedAt)?.toISOString() || null,
    LostReason: String(r.Lost_Reason || r.LostReason || ''),
    Notes: String(r.Notes || ''),
    Tags: Array.isArray(r.Tags) ? r.Tags : []
  };

  if (sourceType === 'houston') {
    deal._sourceDeprecated = true;
  }

  return deal;
}

// Backward compatibility: individual transformers (now just wrappers)
function transformBradCadence(rows = []){
  return rows.map(r => transformRow(r, 'brad'));
}

function transformCodyTracker(rows = []){
  return rows.map(r => transformRow(r, 'cody'));
}

function transformHoustonNewStart(rows = []){
  return rows.map(r => transformRow(r, 'houston'));
}

// OPTIMIZED: Merge logic extracted to avoid duplication
function mergeDeal(existing, newDeal) {
  const preferNew = existing._sourceDeprecated && !newDeal._sourceDeprecated;
  const preferred = preferNew ? newDeal : existing;

  return {
    ...preferred,
    AnnualValue: Math.max(newDeal.AnnualValue || 0, existing.AnnualValue || 0),
    InitialFee: Math.max(newDeal.InitialFee || 0, existing.InitialFee || 0),
    MonthlyFee: Math.max(newDeal.MonthlyFee || 0, existing.MonthlyFee || 0),
    Tags: Array.from(new Set([...(preferred.Tags||[]), ...(newDeal.Tags||[]), ...(existing.Tags||[])]))
  };
}

// OPTIMIZED: Single-pass processing instead of 4 separate loops
function unifyDeals(bradRows = [], codyRows = [], houstonRows = []){
  const byKey = new Map();

  // Process all sources in a single iteration with inline transformation
  const sources = [
    { type: 'brad', rows: bradRows },
    { type: 'cody', rows: codyRows },
    { type: 'houston', rows: houstonRows }
  ];

  for (const {type, rows} of sources) {
    for (const row of rows) {
      // Inline transformation
      const deal = transformRow(row, type);
      const key = keyForDup(deal.Customer, deal.AE, deal.CreatedAt);
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, deal);
      } else {
        // De-dupe with fuzzy annual value match
        if (fuzzyAnnualMatch(deal.AnnualValue, existing.AnnualValue)) {
          byKey.set(key, mergeDeal(existing, deal));
        } else {
          // Different values — treat as separate entries by salting the key
          const saltedKey = `${key}::${String(deal.AnnualValue)}`;
          byKey.set(saltedKey, deal);
        }
      }
    }
  }

  return Array.from(byKey.values());
}

// Expose to browser
if (typeof window !== 'undefined') {
  window.UnifiedDeals = { unifyDeals, transformBradCadence, transformCodyTracker, transformHoustonNewStart };
}
