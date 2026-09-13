import { validateScenarios, Scenario } from './schema';
import { FIRST_SALARY } from './firstSalary';

export const SCENARIOS: Scenario[] = validateScenarios([FIRST_SALARY]);

export function findScenario(id: string): Scenario | undefined {
    return SCENARIOS.find((s) => s.id === id);
}

export type { Scenario };
