/**
 * Haptics
 *
 * Thin wrapper over expo-haptics so screens never have to think about
 * platform support. Web has no haptic engine and the calls reject there, so
 * every function is a no-op outside iOS and Android.
 *
 * Use the named intents rather than the raw expo API, so feedback stays
 * consistent: the same kind of event should always feel the same.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Fire and forget. A failed haptic must never surface to the user. */
function run(fn: () => Promise<void>): void {
    if (!supported) return;
    fn().catch(() => { });
}

/** Light tick. Buttons, list rows, tab changes, card flips. */
export const tap = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** Firmer thud. Committing something: placing an order, saving a goal. */
export const commit = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/** Toggles and steppers. */
export const select = () => run(() => Haptics.selectionAsync());

/** Correct answer, goal reached, module finished. */
export const success = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Wrong answer, over budget. */
export const warn = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

/** Failed action: rejected order, save error. */
export const error = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));

/** Milestone: streak record, badge earned, first investment. Double pulse. */
export const celebrate = () => {
    if (!supported) return;
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    setTimeout(() => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)), 120);
};

// No default export on purpose. Import as `import * as haptics from ...` so
// there is one obvious name for the module and no shadowed member warnings.
