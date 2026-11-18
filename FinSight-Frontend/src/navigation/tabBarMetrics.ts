/**
 * Size of the floating tab bar on iPhone, in its own file so the tab screens
 * can read it without importing the navigator that imports them.
 *
 * On iOS the bar floats over the screen and content scrolls underneath the
 * glass, so each tab screen adds this much room at the end of its scroll and
 * lifts its floating button by it. On Android the bar takes its own space in
 * the layout, as it always has, and this is 0.
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IS_IOS } from '../theme/tokens';

/** Height of the capsule. */
export const IOS_TAB_BAR_HEIGHT = 62;

/** Gap between the capsule and the bottom of the screen. */
export const iosTabBarBottom = (safeBottom: number): number =>
    safeBottom > 0 ? Math.max(safeBottom - 12, 10) : 12;

/** Room to leave under scrolling content so the last row clears the bar. */
export const useTabBarClearance = (): number => {
    const insets = useSafeAreaInsets();
    return IS_IOS ? IOS_TAB_BAR_HEIGHT + iosTabBarBottom(insets.bottom) + 12 : 0;
};
