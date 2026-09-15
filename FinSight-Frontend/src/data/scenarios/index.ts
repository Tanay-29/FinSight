import { validateScenarios, Scenario } from './schema';
import { FIRST_SALARY } from './firstSalary';
import { SIDE_HUSTLE } from './sideHustle';

export const SCENARIOS: Scenario[] = validateScenarios([FIRST_SALARY, SIDE_HUSTLE]);

export function findScenario(id: string): Scenario | undefined {
    return SCENARIOS.find((s) => s.id === id);
}

export type { Scenario };
