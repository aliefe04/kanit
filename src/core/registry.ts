import type { CheckDefinition, Framework, Provider, Severity } from './types.js';

export class CheckRegistry {
  private checks: Map<string, CheckDefinition> = new Map();

  register(check: CheckDefinition): void {
    if (this.checks.has(check.id)) {
      throw new Error(`Check with ID '${check.id}' is already registered.`);
    }
    this.checks.set(check.id, check);
  }

  registerAll(checks: CheckDefinition[]): void {
    for (const check of checks) {
      this.register(check);
    }
  }

  get(id: string): CheckDefinition | undefined {
    return this.checks.get(id);
  }

  getAll(): CheckDefinition[] {
    return Array.from(this.checks.values());
  }

  findByProvider(provider: Provider): CheckDefinition[] {
    return this.getAll().filter((c) => c.provider === provider);
  }

  findByFramework(framework: Framework): CheckDefinition[] {
    return this.getAll().filter((c) => Boolean(c.frameworks[framework]?.length));
  }

  findBySeverity(severity: Severity): CheckDefinition[] {
    return this.getAll().filter((c) => c.severity === severity);
  }

  filter(criteria: {
    provider?: Provider;
    framework?: Framework;
    severity?: Severity;
    includeIds?: string[];
    excludeIds?: string[];
  }): CheckDefinition[] {
    return this.getAll().filter((c) => {
      if (criteria.provider && c.provider !== criteria.provider) return false;
      if (criteria.framework && (!c.frameworks[criteria.framework] || c.frameworks[criteria.framework].length === 0)) return false;
      if (criteria.severity && c.severity !== criteria.severity) return false;
      if (criteria.includeIds && criteria.includeIds.length > 0 && !criteria.includeIds.includes(c.id)) return false;
      if (criteria.excludeIds && criteria.excludeIds.length > 0 && criteria.excludeIds.includes(c.id)) return false;
      return true;
    });
  }

  clear(): void {
    this.checks.clear();
  }

  size(): number {
    return this.checks.size;
  }
}

export const globalRegistry = new CheckRegistry();
