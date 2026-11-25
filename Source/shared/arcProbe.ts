// The routes every Arc host serves, whatever it is written in and whatever its frontend is.
// An Arc application answers both with a JSON array, even when it has no commands or queries yet.
export const ARC_DISCOVERY_PATHS = ['/.cratis/commands', '/.cratis/queries'];

const PROBE_TIMEOUT_MS = 3000;

async function answersWithAnArray(origin: string, path: string): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        const response = await fetch(`${origin}${path}`, { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!response.ok) {
            return false;
        }

        return Array.isArray(await response.json());
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

// Whether the origin serves the Arc discovery routes. This finds Arc applications that have no React
// frontend, such as Blazor, Razor or Phoenix LiveView hosts, and never throws: a page that is not an
// Arc application simply answers false.
export async function probeArcApplication(origin: string | null): Promise<boolean> {
    if (!origin || !/^https?:\/\//.test(origin)) {
        return false;
    }

    for (const path of ARC_DISCOVERY_PATHS) {
        if (await answersWithAnArray(origin, path)) {
            return true;
        }
    }

    return false;
}
