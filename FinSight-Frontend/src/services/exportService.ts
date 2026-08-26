/**
 * Export Service
 *
 * Writes the user's own data to a JSON file in the app cache and hands it to
 * the system share sheet, so they can save it to Drive, mail it to themselves,
 * or move it off the device.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { collectUserDataForExport } from './firestoreService';

export interface ExportResult {
    /** Where the file was written. */
    uri: string;
    fileName: string;
    /** False when the platform has no share sheet; the file still exists. */
    shared: boolean;
}

/** `finsight-export-2026-08-06.json` */
function buildFileName(): string {
    return `finsight-export-${new Date().toISOString().slice(0, 10)}.json`;
}

/**
 * Gather, write and share the user's data.
 * Throws if Firestore reads or the file write fail, so the caller can report it.
 */
export async function exportUserData(userId: string): Promise<ExportResult> {
    const payload = await collectUserDataForExport(userId);
    const fileName = buildFileName();

    const file = new File(Paths.cache, fileName);
    // Re-exporting on the same day should overwrite, not fail.
    if (file.exists) file.delete();
    file.create();
    file.write(JSON.stringify(payload, null, 2));

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
        await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Export FinSight data',
            UTI: 'public.json',
        });
    }

    return { uri: file.uri, fileName, shared: canShare };
}
