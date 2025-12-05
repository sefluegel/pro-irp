// backend/services/pdfEnrollmentParser.js
// PDF enrollment form parser - extracts client data from Medicare enrollment PDFs

const pdfParse = require('pdf-parse');
const fs = require('fs');

/**
 * Parse a Medicare enrollment PDF and extract client data
 * Supports various formats: Devoted Health, SunFire, carrier portals, Integrity, etc.
 * @param {string} filePath - Path to the uploaded PDF file
 * @returns {Promise<Object>} Parsed client data
 */
async function parseEnrollmentPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const text = pdfData.text;

  // Extract all fields using multiple pattern matchers
  const extracted = {
    firstName: extractFirstName(text),
    lastName: extractLastName(text),
    dob: extractDob(text),
    sex: extractSex(text),
    phone: extractPhone(text),
    email: extractEmail(text),
    address: extractStreetAddress(text),
    city: extractCity(text),
    state: extractState(text),
    zip: extractZip(text),
    county: extractCounty(text),
    medicareId: extractMedicareId(text),
    partAEffectiveDate: extractPartADate(text),
    partBEffectiveDate: extractPartBDate(text),
    ssn: extractSsn(text),
    carrier: extractCarrier(text),
    plan: extractPlanName(text),
    planType: extractPlanType(text),
    effectiveDate: extractEffectiveDate(text),
    monthlyPremium: extractPremium(text),
    primaryCare: extractPcpName(text),
    pcpId: extractPcpId(text),
  };

  // Clean up empty strings to null
  for (const key of Object.keys(extracted)) {
    if (extracted[key] === '' || extracted[key] === undefined) {
      extracted[key] = null;
    }
  }

  return extracted;
}

// =====================
// Field Extraction Functions
// =====================

function extractFirstName(text) {
  // Pattern: "First Name: VALUE" or "First Name\nVALUE" or labeled fields
  const patterns = [
    /First\s*Name[:\s]*([A-Z][A-Za-z'-]+)/i,
    /Applicant(?:'s)?\s+First\s+Name[:\s]*([A-Z][A-Za-z'-]+)/i,
    /Member\s+First\s+Name[:\s]*([A-Z][A-Za-z'-]+)/i,
    /Given\s+Name[:\s]*([A-Z][A-Za-z'-]+)/i,
  ];
  return matchFirst(text, patterns);
}

function extractLastName(text) {
  const patterns = [
    /Last\s*Name[:\s]*([A-Z][A-Za-z'-]+)/i,
    /Applicant(?:'s)?\s+Last\s+Name[:\s]*([A-Z][A-Za-z'-]+)/i,
    /Member\s+Last\s+Name[:\s]*([A-Z][A-Za-z'-]+)/i,
    /Surname[:\s]*([A-Z][A-Za-z'-]+)/i,
    /Family\s+Name[:\s]*([A-Z][A-Za-z'-]+)/i,
  ];
  return matchFirst(text, patterns);
}

function extractDob(text) {
  const patterns = [
    /(?:Date\s+of\s+Birth|DOB|Birth\s*Date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:Date\s+of\s+Birth|DOB|Birth\s*Date)[:\s]*(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i,
    /Born[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  const raw = matchFirst(text, patterns);
  return formatDate(raw);
}

function extractSex(text) {
  const patterns = [
    /(?:Sex|Gender)[:\s]*(Male|Female|M|F)\b/i,
    /\b(Male|Female)\b/i,
  ];
  const raw = matchFirst(text, patterns);
  if (!raw) return null;
  const normalized = raw.toUpperCase();
  if (normalized === 'M' || normalized === 'MALE') return 'Male';
  if (normalized === 'F' || normalized === 'FEMALE') return 'Female';
  return raw;
}

function extractPhone(text) {
  const patterns = [
    /(?:Phone|Telephone|Tel|Contact\s+Number)[:\s]*\(?(\d{3})\)?[\s\-\.]*(\d{3})[\s\-\.]*(\d{4})/i,
    /(?:Home\s+Phone|Cell\s+Phone|Mobile)[:\s]*\(?(\d{3})\)?[\s\-\.]*(\d{3})[\s\-\.]*(\d{4})/i,
    /\((\d{3})\)\s*(\d{3})[\-\.](\d{4})/,
    /(\d{3})[\-\.](\d{3})[\-\.](\d{4})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[1] && match[2] && match[3]) {
        return `+1${match[1]}${match[2]}${match[3]}`;
      }
    }
  }
  return null;
}

function extractEmail(text) {
  const patterns = [
    /(?:Email|E-mail)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  ];
  return matchFirst(text, patterns);
}

function extractStreetAddress(text) {
  // Look for address patterns - street number + street name
  const patterns = [
    /(?:Street\s+Address|Address|Mailing\s+Address|Residence)[:\s]*(\d+[^,\n]+?)(?:,|\n|APT|UNIT|#|$)/i,
    /(?:Address)[:\s]*(\d+\s+[A-Za-z0-9\s]+(?:ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|LN|LANE|BLVD|CT|COURT|WAY|PL|PLACE|CIR|CIRCLE)[^,\n]*)/i,
  ];
  let addr = matchFirst(text, patterns);

  // Also look for APT/UNIT
  if (addr) {
    const aptMatch = text.match(/(?:APT|UNIT|#)\s*(\d+[A-Za-z]?)/i);
    if (aptMatch) {
      addr = addr.trim() + ' ' + aptMatch[0].toUpperCase();
    }
  }
  return addr ? addr.trim() : null;
}

function extractCity(text) {
  // Often appears as "City, STATE ZIP" pattern
  const patterns = [
    /(?:City)[:\s]*([A-Za-z\s]+?)(?:,|\n|State)/i,
    /(\b[A-Z][A-Za-z\s]+),\s*([A-Z]{2})\s+\d{5}/,
  ];
  const cityStateMatch = text.match(/([A-Z][A-Za-z\s]+),\s*([A-Z]{2})\s+\d{5}/);
  if (cityStateMatch) {
    return cityStateMatch[1].trim();
  }
  return matchFirst(text, patterns);
}

function extractState(text) {
  const patterns = [
    /(?:State)[:\s]*([A-Z]{2})\b/i,
    /,\s*([A-Z]{2})\s+\d{5}/,
  ];
  return matchFirst(text, patterns);
}

function extractZip(text) {
  const patterns = [
    /(?:Zip|ZIP\s*Code|Postal\s*Code)[:\s]*(\d{5}(?:-\d{4})?)/i,
    /[A-Z]{2}\s+(\d{5}(?:-\d{4})?)/,
  ];
  return matchFirst(text, patterns);
}

function extractCounty(text) {
  const patterns = [
    /(?:County)[:\s]*([A-Za-z\s]+?)(?:,|\n|State|OH|CA|TX|FL|NY)/i,
    /,\s*([A-Z][A-Za-z]+),\s*[A-Z]{2}\s+\d{5}/,
  ];
  return matchFirst(text, patterns);
}

function extractMedicareId(text) {
  // Medicare Beneficiary Identifier (MBI) - 11 characters, specific format
  // Format: 1A23-B45-CD67 or 1A23B45CD67
  const patterns = [
    /(?:Medicare\s+(?:Number|ID|Beneficiary\s+ID|Claim\s+Number)|MBI)[:\s]*([0-9A-Z]{4}[\-\s]?[A-Z0-9]{3}[\-\s]?[A-Z0-9]{4})/i,
    /(?:Medicare\s+(?:Number|ID))[:\s]*([0-9][A-Z][A-Z0-9]{2}[A-Z0-9]{3}[A-Z0-9]{4})/i,
    /\b([0-9][A-Z][A-Z0-9]{2}[A-Z][A-Z0-9]{2}[A-Z][A-Z0-9]{2})\b/,
  ];
  let mbi = matchFirst(text, patterns);
  if (mbi) {
    // Normalize - remove dashes/spaces
    mbi = mbi.replace(/[\-\s]/g, '').toUpperCase();
  }
  return mbi;
}

function extractPartADate(text) {
  const patterns = [
    /(?:Part\s*A\s*(?:Effective\s*)?(?:Date)?)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:Hospital\s*\(Part\s*A\))[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /Part\s*A[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  const raw = matchFirst(text, patterns);
  return formatDate(raw);
}

function extractPartBDate(text) {
  const patterns = [
    /(?:Part\s*B\s*(?:Effective\s*)?(?:Date)?)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:Medical\s*\(Part\s*B\))[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /Part\s*B[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  const raw = matchFirst(text, patterns);
  return formatDate(raw);
}

function extractSsn(text) {
  // SSN pattern: XXX-XX-XXXX
  const patterns = [
    /(?:Social\s*Security|SSN|SS#)[:\s]*(\d{3}[\-\s]?\d{2}[\-\s]?\d{4})/i,
    /\b(\d{3}-\d{2}-\d{4})\b/,
  ];
  let ssn = matchFirst(text, patterns);
  if (ssn) {
    // Normalize to XXX-XX-XXXX format
    const digits = ssn.replace(/\D/g, '');
    if (digits.length === 9) {
      ssn = `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`;
    }
  }
  return ssn;
}

function extractCarrier(text) {
  // Look for known carrier names
  const carriers = [
    'Aetna', 'Anthem', 'Blue Cross', 'Blue Shield', 'BCBS', 'Cigna',
    'Clover Health', 'Devoted Health', 'Humana', 'Kaiser', 'Molina',
    'Oscar Health', 'UnitedHealthcare', 'United Healthcare', 'WellCare',
    'Centene', 'CVS Health', 'Elevance', 'HealthNet', 'Alignment Healthcare',
    'Bright Health', 'CareFirst', 'Alignment', 'Allwell', 'Ambetter',
    'Amerigroup', 'AvMed', 'Banner', 'BlueCross BlueShield', 'Capital Health',
    'CarePlus', 'CareSource', 'Essence Healthcare', 'Friday Health Plans',
    'Geisinger', 'HAP', 'Highmark', 'Horizon', 'Independence Blue Cross',
    'Medical Mutual', 'Medica', 'Meridian', 'MVP Health Care', 'Optum',
    'Oscar', 'Premera', 'Priority Health', 'Providence', 'Regence',
    'SelectHealth', 'SilverSummit', 'Simply Healthcare', 'Summa',
    'Texas Children\'s', 'Tufts Health Plan', 'UPMC', 'Viva Health', 'Wellpoint'
  ];

  for (const carrier of carriers) {
    const regex = new RegExp(`\\b${carrier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      return carrier;
    }
  }

  // Try generic pattern
  const patterns = [
    /(?:Insurance\s+Company|Carrier|Plan\s+Sponsor)[:\s]*([A-Za-z\s]+Health[A-Za-z\s]*)/i,
  ];
  return matchFirst(text, patterns);
}

function extractPlanName(text) {
  const patterns = [
    /(?:Plan\s+Name|Plan\s+Selected)[:\s]*([^\n]+)/i,
    /(?:enrolling\s+in|selected\s+plan)[:\s]*([^\n]+)/i,
    /(?:Medicare\s+Advantage\s+Plan)[:\s]*([^\n]+)/i,
  ];
  return matchFirst(text, patterns);
}

function extractPlanType(text) {
  const types = [
    'Medicare Advantage',
    'Medicare Supplement',
    'Medigap',
    'Part D',
    'Prescription Drug Plan',
    'PDP',
    'HMO',
    'PPO',
    'PFFS',
    'SNP',
    'Special Needs Plan',
  ];

  for (const type of types) {
    if (text.toLowerCase().includes(type.toLowerCase())) {
      return type;
    }
  }
  return null;
}

function extractEffectiveDate(text) {
  const patterns = [
    /(?:Effective\s+Date|Coverage\s+Start|Plan\s+Effective)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:Coverage\s+Begins)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:Start\s+Date)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  const raw = matchFirst(text, patterns);
  return formatDate(raw);
}

function extractPremium(text) {
  const patterns = [
    /(?:Monthly\s+Premium|Premium)[:\s]*\$?(\d+\.?\d*)/i,
    /\$(\d+\.?\d*)\s*(?:\/\s*month|per\s+month|monthly)/i,
  ];
  const raw = matchFirst(text, patterns);
  return raw ? parseFloat(raw) : null;
}

function extractPcpName(text) {
  const patterns = [
    /(?:Primary\s+Care\s+(?:Physician|Provider|Doctor)|PCP)[:\s]*(?:Dr\.?\s*)?([A-Za-z\s,\.]+?)(?:\n|NPI|ID|$)/i,
    /(?:Physician\s+Name|Doctor\s+Name)[:\s]*(?:Dr\.?\s*)?([A-Za-z\s,\.]+)/i,
  ];
  return matchFirst(text, patterns);
}

function extractPcpId(text) {
  const patterns = [
    /(?:PCP\s+(?:ID|NPI|Number)|Physician\s+ID|NPI)[:\s]*(\d+)/i,
    /(?:Provider\s+ID)[:\s]*(\d+)/i,
  ];
  return matchFirst(text, patterns);
}

// =====================
// Helper Functions
// =====================

function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function formatDate(dateStr) {
  if (!dateStr) return null;

  // Try to parse various date formats and convert to YYYY-MM-DD
  const formats = [
    // MM/DD/YYYY or MM-DD-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // MM/DD/YY or MM-DD-YY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
    // YYYY/MM/DD or YYYY-MM-DD
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
  ];

  let match = dateStr.match(formats[0]);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  match = dateStr.match(formats[1]);
  if (match) {
    const [, month, day, year] = match;
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  match = dateStr.match(formats[2]);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return dateStr;
}

module.exports = {
  parseEnrollmentPdf,
};
