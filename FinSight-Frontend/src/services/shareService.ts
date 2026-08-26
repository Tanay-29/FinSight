/**
 * Share Service
 *
 * Captures a React view as an image and hands it to the system share sheet.
 *
 * Everything shared is rendered from data already on the device, and nothing
 * is uploaded: the image goes straight from the capture to whichever app the
 * user picks. If they cancel the sheet, nothing leaves the phone.
 */
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export interface ShareResult {
    /** False when the platform has no share sheet. */
    shared: boolean;
    uri?: string;
}

/**
 * Capture a ref'd view and open the share sheet.
 *
 * Throws if the capture fails, so callers can tell the user rather than
 * silently doing nothing.
 */
export async function shareView(
    ref: React.RefObject<any>,
    dialogTitle = 'Share'
): Promise<ShareResult> {
    if (!ref.current) throw new Error('Nothing to share yet.');

    const uri = await captureRef(ref, {
        format: 'png',
        quality: 1,
        // 2x so the card stays crisp when a messaging app rescales it.
        result: 'tmpfile',
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return { shared: false, uri };

    await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle,
        UTI: 'public.png',
    });

    return { shared: true, uri };
}
