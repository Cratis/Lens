const bytesPerKilobyte = 1024;
const bytesPerMegabyte = bytesPerKilobyte * bytesPerKilobyte;

/**
 * Renders a byte count the way a developer scanning a diagnostics panel wants to read it: whole bytes
 * while the number is still small enough to be meaningful, one decimal beyond that.
 */
export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return '—';
    }

    if (bytes < bytesPerKilobyte) {
        return `${bytes} B`;
    }

    if (bytes < bytesPerMegabyte) {
        return `${(bytes / bytesPerKilobyte).toFixed(1)} KB`;
    }

    return `${(bytes / bytesPerMegabyte).toFixed(1)} MB`;
}
