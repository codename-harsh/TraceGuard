/**
 * classifier.ts — Domain tracker classification engine
 *
 * Loads the tracker-domains.json rule set once at module initialisation and
 * provides O(1) lookup via a Map. Rule data is treated as immutable after load.
 */

import type { TrackerCategory } from '@traceguard/shared-types';
// Use a relative path so the JSON is resolved without extra bundler config
import trackerRulesRaw from '../rules/tracker-domains.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassificationResult {
  /** The registrable domain that was queried */
  domain: string;
  /** Tracker category from the rules, or 'Unknown' if not in the list */
  category: TrackerCategory;
  /** Whether the domain is flagged as a tracker in the rules */
  isTracker: boolean;
  /** Rule ID (e.g. "AN-001"), or null if the domain is not in the rules */
  ruleId: string | null;
  /** Rule set version */
  ruleVersion: string;
}

interface RuleEntry {
  id: string;
  domain: string;
  category: string;
  isTracker: boolean;
  notes: string;
}

interface RulesFile {
  version: string;
  rules: RuleEntry[];
}

// ---------------------------------------------------------------------------
// Rule set initialisation (runs once at module load)
// ---------------------------------------------------------------------------

const rulesFile = trackerRulesRaw as RulesFile;

/** Pre-built Map for O(1) lookup: domain → RuleEntry */
const domainMap = new Map<string, RuleEntry>(
  rulesFile.rules.map((rule) => [rule.domain.toLowerCase(), rule]),
);

const RULE_VERSION = rulesFile.version;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classifies a hostname (or registrable domain) against the TraceGuard
 * tracker rules.
 *
 * The lookup strips a single leading dot and lowercases the input for
 * normalisation. It performs an exact registrable-domain match (no wildcard
 * subdomain expansion needed at classification time — the caller should pass
 * the eTLD+1 from getRegistrableDomain()).
 *
 * @param hostname - Any hostname string (subdomain, bare domain, or with leading dot)
 * @returns ClassificationResult always — isTracker=false / category='Unknown' if not found
 */
export function classifyDomain(hostname: string): ClassificationResult {
  const normalised = hostname.startsWith('.')
    ? hostname.slice(1).toLowerCase()
    : hostname.toLowerCase();

  const rule = domainMap.get(normalised);

  if (!rule) {
    return {
      domain: normalised,
      category: 'Unknown',
      isTracker: false,
      ruleId: null,
      ruleVersion: RULE_VERSION,
    };
  }

  return {
    domain: normalised,
    category: rule.category as TrackerCategory,
    isTracker: rule.isTracker,
    ruleId: rule.id,
    ruleVersion: RULE_VERSION,
  };
}

/**
 * Returns the currently loaded rule set version string.
 */
export function getRuleVersion(): string {
  return RULE_VERSION;
}

/**
 * Returns the total number of rules loaded.
 */
export function getRuleCount(): number {
  return domainMap.size;
}
