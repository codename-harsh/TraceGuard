/**
 * engine.ts — Deterministic privacy & security scoring engine
 *
 * Implements the TraceGuard scoring model:
 *   - Starts at 100
 *   - Subtracts capped penalties per category
 *   - Produces a ScoreSummary with score, riskLevel, components, and findings
 *   - All findings use neutral analytical phrasing (no "safe"/"unsafe"/"malicious")
 */

import type {
  CookieMetadata,
  Finding,
  ObservedRequest,
  PermissionFinding,
  RiskLevel,
  ScoreComponent,
  ScoreSummary,
  SecurityIndicator,
  Severity,
  StorageIndicator,
} from '@traceguard/shared-types';

import scoringRules from './scoring-rules.json';

// ---------------------------------------------------------------------------
// Input type for evaluateScan
// ---------------------------------------------------------------------------

export interface ScanInput {
  requests: ObservedRequest[];
  cookies: CookieMetadata[];
  storageIndicators: StorageIndicator[];
  permissionFindings: PermissionFinding[];
  securityIndicators: SecurityIndicator[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Apply a step-function threshold table: returns the penalty for the first
 *  threshold whose `count` > observed count, using the last threshold otherwise. */
function applyCountThresholds(
  count: number,
  thresholds: Array<{ count: number; penalty: number }>,
  maxPenalty: number,
): number {
  if (count === 0) return 0;
  let penalty = 0;
  for (const t of thresholds) {
    if (count >= t.count) {
      penalty = t.penalty;
    }
  }
  return Math.min(penalty, maxPenalty);
}

/** Derive a human-readable risk level from a score. */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 90) return 'MINIMAL';
  if (score >= 75) return 'LOW';
  if (score >= 55) return 'MODERATE';
  if (score >= 35) return 'ELEVATED';
  return 'HIGH';
}

let _findingCounter = 0;
function nextFindingId(): string {
  return `finding-${++_findingCounter}`;
}

// Reset counter for deterministic test runs
export function _resetFindingCounter(): void {
  _findingCounter = 0;
}

// ---------------------------------------------------------------------------
// Category evaluators
// ---------------------------------------------------------------------------

function evaluateTrackers(requests: ObservedRequest[]): {
  penalty: number;
  rationale: string;
  findings: Finding[];
} {
  const trackerRequests = requests.filter((r) => r.isTracker === true);
  const uniqueTrackerDomains = new Set(
    trackerRequests.map((r) => r.requestDomain),
  );
  const count = uniqueTrackerDomains.size;

  const rules = scoringRules.categories.trackers;
  const penalty = applyCountThresholds(
    count,
    rules.thresholds,
    rules.maxPenalty,
  );

  const rationale =
    count === 0
      ? 'No third-party tracker domains observed.'
      : `${count} distinct potential tracking domain${count > 1 ? 's' : ''} observed across ${trackerRequests.length} request${trackerRequests.length > 1 ? 's' : ''}.`;

  const findings: Finding[] = [];
  if (count > 0) {
    const domainList = [...uniqueTrackerDomains].slice(0, 10);
    const severity: Severity =
      count >= 10 ? 'CRITICAL' : count >= 5 ? 'HIGH' : count >= 2 ? 'MEDIUM' : 'LOW';
    findings.push({
      id: nextFindingId(),
      title: `Potential tracking service${count > 1 ? 's' : ''} detected`,
      severity,
      whatWasObserved: `${count} domain${count > 1 ? 's' : ''} in TraceGuard's tracker catalogue received requests from this page: ${domainList.join(', ')}${domainList.length < uniqueTrackerDomains.size ? ` and ${uniqueTrackerDomains.size - domainList.length} more` : ''}.`,
      whyItMatters:
        'Domains in the tracker catalogue are commonly associated with cross-site data collection, behavioural profiling, or ad targeting. Their presence does not confirm data was collected in your session.',
      whatTraceGuardCannotConclude:
        'TraceGuard cannot determine what data, if any, these domains collected, whether you are personally identified, or whether the operator has a lawful basis for their use.',
      affectedDomains: [...uniqueTrackerDomains],
    });
  }

  return { penalty, rationale, findings };
}

function evaluateInsecureTransport(requests: ObservedRequest[]): {
  penalty: number;
  rationale: string;
  findings: Finding[];
} {
  const insecure = requests.filter((r) => !r.isSecure);
  const count = insecure.length;
  const rules = scoringRules.categories.insecureTransport;
  const penalty = applyCountThresholds(
    count,
    rules.thresholds,
    rules.maxPenalty,
  );

  const rationale =
    count === 0
      ? 'All observed subresources used HTTPS.'
      : `${count} subresource request${count > 1 ? 's' : ''} observed over unencrypted HTTP (mixed content indicator).`;

  const findings: Finding[] = [];
  if (count > 0) {
    const domains = [...new Set(insecure.map((r) => r.requestDomain))].slice(
      0,
      8,
    );
    findings.push({
      id: nextFindingId(),
      title: 'Insecure HTTP subresource requests observed',
      severity: count >= 5 ? 'HIGH' : count >= 2 ? 'MEDIUM' : 'LOW',
      whatWasObserved: `${count} network request${count > 1 ? 's' : ''} used unencrypted HTTP rather than HTTPS. Domains involved: ${domains.join(', ')}.`,
      whyItMatters:
        'Unencrypted HTTP requests can be observed or modified by network intermediaries. This is a mixed-content indicator that may expose resource integrity and browsing context to third parties on the network.',
      whatTraceGuardCannotConclude:
        'TraceGuard cannot determine whether data within these requests was sensitive, whether interception occurred, or whether the site operator is aware of this configuration.',
    });
  }

  return { penalty, rationale, findings };
}

function evaluateThirdPartyCookies(cookies: CookieMetadata[]): {
  penalty: number;
  rationale: string;
  findings: Finding[];
} {
  const thirdPartyPersistent = cookies.filter(
    (c) => c.isThirdParty && c.isPersistent,
  );
  const count = thirdPartyPersistent.length;
  const rules = scoringRules.categories.thirdPartyCookies;
  const penalty = applyCountThresholds(
    count,
    rules.thresholds,
    rules.maxPenalty,
  );

  const rationale =
    count === 0
      ? 'No third-party persistent cookies observed.'
      : `${count} third-party persistent cookie${count > 1 ? 's' : ''} observed — a cross-site tracking indicator.`;

  const findings: Finding[] = [];
  if (count > 0) {
    const domains = [
      ...new Set(thirdPartyPersistent.map((c) => c.sourceDomain)),
    ].slice(0, 8);
    findings.push({
      id: nextFindingId(),
      title: 'Third-party persistent cookies observed',
      severity: count >= 5 ? 'HIGH' : count >= 2 ? 'MEDIUM' : 'LOW',
      whatWasObserved: `${count} persistent cookie${count > 1 ? 's' : ''} set by third-party domain${domains.length > 1 ? 's' : ''} (${domains.join(', ')}) — these cookies survive browser sessions and may enable cross-site identification.`,
      whyItMatters:
        'Persistent third-party cookies are a well-established mechanism for cross-site tracking. They allow external services to potentially recognise users across unrelated websites.',
      whatTraceGuardCannotConclude:
        'TraceGuard cannot determine whether these cookies are used for tracking, functional purposes (e.g. embedded media login state), or whether you are personally identified by them.',
      affectedDomains: domains,
    });
  }

  return { penalty, rationale, findings };
}

function evaluateThirdPartyConcentration(requests: ObservedRequest[]): {
  penalty: number;
  rationale: string;
  findings: Finding[];
} {
  if (requests.length === 0) {
    return { penalty: 0, rationale: 'No requests observed.', findings: [] };
  }

  const thirdPartyCount = requests.filter((r) => r.isThirdParty).length;
  const ratio = thirdPartyCount / requests.length;

  const rules = scoringRules.categories.thirdPartyConcentration;
  let penalty = 0;
  for (const t of rules.ratioThresholds) {
    if (ratio >= t.ratio) {
      penalty = t.penalty;
    }
  }
  penalty = Math.min(penalty, rules.maxPenalty);

  const pct = Math.round(ratio * 100);
  const rationale =
    pct === 0
      ? 'All requests are first-party.'
      : `${pct}% of observed requests (${thirdPartyCount} of ${requests.length}) are third-party.`;

  const findings: Finding[] = [];
  if (ratio >= 0.4) {
    findings.push({
      id: nextFindingId(),
      title: 'High third-party request concentration',
      severity: ratio >= 0.7 ? 'HIGH' : 'MEDIUM',
      whatWasObserved: `${pct}% of observed network requests originated from third-party domains not controlled by the site operator.`,
      whyItMatters:
        'A high proportion of third-party requests broadens the number of external services that receive information about your visit (IP address, User-Agent, referrer URL, timing).',
      whatTraceGuardCannotConclude:
        'TraceGuard cannot determine whether third-party requests are essential for site functionality or involve data sharing beyond what is technically necessary.',
    });
  }

  return { penalty, rationale, findings };
}

function evaluateCookieConfiguration(cookies: CookieMetadata[]): {
  penalty: number;
  rationale: string;
  findings: Finding[];
} {
  const misconfigured = cookies.filter(
    (c) => !c.httpOnly || !c.secure || c.sameSite === 'None',
  );
  const count = misconfigured.length;
  const rules = scoringRules.categories.cookieConfiguration;
  const rawPenalty = count * rules.perCookiePenalty;
  const penalty = Math.min(rawPenalty, rules.maxPenalty);

  const rationale =
    count === 0
      ? 'All observed cookies have secure configuration flags.'
      : `${count} cookie${count > 1 ? 's' : ''} observed without recommended security flags (HttpOnly, Secure, or SameSite≠None).`;

  const findings: Finding[] = [];
  if (count > 0) {
    findings.push({
      id: nextFindingId(),
      title: 'Cookie configuration review recommended',
      severity: count >= 5 ? 'MEDIUM' : 'LOW',
      whatWasObserved: `${count} cookie${count > 1 ? 's were' : ' was'} observed lacking one or more recommended security attributes (HttpOnly, Secure flag, or restrictive SameSite policy).`,
      whyItMatters:
        'Missing security flags on cookies may increase exposure to cross-site request forgery (CSRF) or allow cookie access via client-side scripts. SameSite=None enables cookies to be sent in cross-site contexts.',
      whatTraceGuardCannotConclude:
        'TraceGuard cannot determine whether missing flags are intentional (e.g. cross-origin embedded content) or an oversight. Not all cookies require all flags.',
    });
  }

  return { penalty, rationale, findings };
}

function evaluatePermissions(permissions: PermissionFinding[]): {
  penalty: number;
  rationale: string;
  findings: Finding[];
} {
  const granted = permissions.filter((p) => p.state === 'granted');
  const rules = scoringRules.categories.privacyPermissions;

  let raw = 0;
  for (const p of granted) {
    const key = p.permission as keyof typeof rules.perPermissionPenalty;
    raw += rules.perPermissionPenalty[key] ?? rules.perPermissionPenalty['other'];
  }
  const penalty = Math.min(raw, rules.maxPenalty);

  const rationale =
    granted.length === 0
      ? 'No privacy-sensitive permissions observed as granted.'
      : `${granted.length} sensitive browser permission${granted.length > 1 ? 's' : ''} observed as granted: ${granted.map((p) => p.permission).join(', ')}.`;

  const findings: Finding[] = [];
  if (granted.length > 0) {
    findings.push({
      id: nextFindingId(),
      title: 'Privacy-sensitive browser permission observed',
      severity: raw >= 8 ? 'HIGH' : raw >= 4 ? 'MEDIUM' : 'LOW',
      whatWasObserved: `The following browser permission${granted.length > 1 ? 's are' : ' is'} granted for this origin: ${granted.map((p) => p.permission).join(', ')}.`,
      whyItMatters:
        'Granted permissions give this site access to sensitive device capabilities. Geolocation, camera, and microphone access in particular carry significant privacy implications.',
      whatTraceGuardCannotConclude:
        'TraceGuard cannot determine whether permissions were actively used during this session, whether use was necessary for the site to function, or whether data was transmitted externally.',
    });
  }

  return { penalty, rationale, findings };
}

function evaluateStorage(storage: StorageIndicator[]): {
  penalty: number;
  rationale: string;
  findings: Finding[];
} {
  const count = storage.length;
  const rules = scoringRules.categories.storageAndOther;
  const penalty = applyCountThresholds(
    count,
    rules.thresholds,
    rules.maxPenalty,
  );

  const rationale =
    count === 0
      ? 'No browser storage access indicators observed.'
      : `${count} browser storage access indicator${count > 1 ? 's' : ''} observed.`;

  const findings: Finding[] = [];
  if (count >= 2) {
    findings.push({
      id: nextFindingId(),
      title: 'Browser storage access observed',
      severity: 'INFO',
      whatWasObserved: `${count} storage access event${count > 1 ? 's' : ''} observed (localStorage, sessionStorage, indexedDB, or Cache API).`,
      whyItMatters:
        'Browser storage can be used to persist identifiers or state across visits. Third-party storage access may contribute to cross-site tracking.',
      whatTraceGuardCannotConclude:
        'TraceGuard cannot read stored values, determine whether stored data is personally identifiable, or assess the purpose of storage access.',
    });
  }

  return { penalty, rationale, findings };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Evaluates a complete scan observation and returns a deterministic ScoreSummary.
 *
 * Determinism guarantee: given the same ScanInput, this function always
 * returns the same score, riskLevel, and component breakdown. Finding IDs
 * use a module-level counter; call _resetFindingCounter() before tests for
 * fully deterministic IDs.
 */
export function evaluateScan(input: ScanInput): ScoreSummary {
  const trackers = evaluateTrackers(input.requests);
  const insecure = evaluateInsecureTransport(input.requests);
  const thirdPartyCookies = evaluateThirdPartyCookies(input.cookies);
  const concentration = evaluateThirdPartyConcentration(input.requests);
  const cookieConfig = evaluateCookieConfiguration(input.cookies);
  const permissions = evaluatePermissions(input.permissionFindings);
  const storage = evaluateStorage(input.storageIndicators);

  const components: ScoreComponent[] = [
    {
      category: 'Trackers',
      penalty: trackers.penalty,
      maxPenalty: scoringRules.categories.trackers.maxPenalty,
      rationale: trackers.rationale,
    },
    {
      category: 'Insecure Transport',
      penalty: insecure.penalty,
      maxPenalty: scoringRules.categories.insecureTransport.maxPenalty,
      rationale: insecure.rationale,
    },
    {
      category: 'Third-Party Cookies',
      penalty: thirdPartyCookies.penalty,
      maxPenalty: scoringRules.categories.thirdPartyCookies.maxPenalty,
      rationale: thirdPartyCookies.rationale,
    },
    {
      category: 'Third-Party Concentration',
      penalty: concentration.penalty,
      maxPenalty: scoringRules.categories.thirdPartyConcentration.maxPenalty,
      rationale: concentration.rationale,
    },
    {
      category: 'Cookie Configuration',
      penalty: cookieConfig.penalty,
      maxPenalty: scoringRules.categories.cookieConfiguration.maxPenalty,
      rationale: cookieConfig.rationale,
    },
    {
      category: 'Privacy Permissions',
      penalty: permissions.penalty,
      maxPenalty: scoringRules.categories.privacyPermissions.maxPenalty,
      rationale: permissions.rationale,
    },
    {
      category: 'Storage & Other',
      penalty: storage.penalty,
      maxPenalty: scoringRules.categories.storageAndOther.maxPenalty,
      rationale: storage.rationale,
    },
  ];

  const totalPenalty = components.reduce((sum, c) => sum + c.penalty, 0);
  const score = Math.max(0, Math.min(100, scoringRules.baseScore - totalPenalty));
  const riskLevel = scoreToRiskLevel(score);

  const findings: Finding[] = [
    ...trackers.findings,
    ...insecure.findings,
    ...thirdPartyCookies.findings,
    ...concentration.findings,
    ...cookieConfig.findings,
    ...permissions.findings,
    ...storage.findings,
  ];

  return { score, riskLevel, components, findings };
}
