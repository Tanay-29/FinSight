/**
 * Shared icon maps.
 *
 * Goals store an icon *key* (e.g. 'home'), not a glyph. Rendering resolves the
 * key to a Lucide component through goalIcon(). Goals created before this
 * change have no key and fall back to the default icon.
 */
import {
    Home, Plane, GraduationCap, Gem, Car, Laptop,
    Umbrella, Dumbbell, Smartphone, Dog, ShoppingBag, Guitar,
    Target,
} from 'lucide-react-native';

export type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

export const GOAL_ICONS = {
    home: Home,
    travel: Plane,
    education: GraduationCap,
    wedding: Gem,
    vehicle: Car,
    laptop: Laptop,
    holiday: Umbrella,
    fitness: Dumbbell,
    phone: Smartphone,
    pet: Dog,
    shopping: ShoppingBag,
    music: Guitar,
} as const;

export type GoalIconKey = keyof typeof GOAL_ICONS;

export const GOAL_ICON_KEYS = Object.keys(GOAL_ICONS) as GoalIconKey[];

export const DEFAULT_GOAL_ICON_KEY: GoalIconKey = 'home';

/** Resolve a stored goal icon key to a component, with a safe fallback. */
export function goalIcon(key?: string): IconComponent {
    return (GOAL_ICONS[key as GoalIconKey] ?? Target) as IconComponent;
}
