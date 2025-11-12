// Transformers to unify legacy sources into UnifiedDeals
// Sources: Brad cadence, Cody L tracker, Houston New Start (deprecated)

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

// Map raw entries from each source to UnifiedDeals
function transformBradCadence(rows = []){
  return rows.map(r => ({
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
  }));
}

function transformCodyTracker(rows = []){
  return rows.map(r => ({
    DealId: String(r.ID || r.DealId || ''),
    Customer: String(r.Customer || r.Customer_Name || ''),
    AE: String(r.AE || r.Sales_Rep || ''),
    Branch: String(r.Branch || ''),
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
  }));
}

// Deprecated: Houston New Start — still transform but mark as deprecated
function transformHoustonNewStart(rows = []){
  return rows.map(r => ({
    DealId: String(r.ID || r.DealId || ''),
    Customer: String(r.Customer || r.Customer_Name || ''),
    AE: String(r.AE || r.Sales_Rep || ''),
    Branch: String(r.Branch || ''),
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
    Tags: Array.isArray(r.Tags) ? r.Tags : [],
    _sourceDeprecated: true
  }));
}

function unifyDeals(bradRows = [], codyRows = [], houstonRows = []){
  const brad = transformBradCadence(bradRows);
  const cody = transformCodyTracker(codyRows);
  const houston = transformHoustonNewStart(houstonRows);
  const all = [...brad, ...cody, ...houston];
  const byKey = new Map();
  for (const d of all){
    const key = keyForDup(d.Customer, d.AE, d.CreatedAt);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, d);
    } else {
      // De-dupe with fuzzy annual value match
      if (fuzzyAnnualMatch(d.AnnualValue, existing.AnnualValue)) {
        // Prefer non-deprecated sources and richer data
        const preferD = existing._sourceDeprecated ? d : existing;
        const merged = {
          ...preferD,
          AnnualValue: Math.max(d.AnnualValue || 0, existing.AnnualValue || 0),
          InitialFee: Math.max(d.InitialFee || 0, existing.InitialFee || 0),
          MonthlyFee: Math.max(d.MonthlyFee || 0, existing.MonthlyFee || 0),
          Tags: Array.from(new Set([...(preferD.Tags||[]), ...(d.Tags||[]), ...(existing.Tags||[])]))
        };
        byKey.set(key, merged);
      } else {
        // Different values — treat as separate entries by salting the key
        const saltedKey = `${key}::${String(d.AnnualValue)}`;
        byKey.set(saltedKey, d);
      }
    }
  }
  return Array.from(byKey.values());
}

// Expose to browser
if (typeof window !== 'undefined') {
  window.UnifiedDeals = { unifyDeals, transformBradCadence, transformCodyTracker, transformHoustonNewStart };
}
