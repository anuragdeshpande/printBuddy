export function getPrinterImage(model: string | null | undefined): string {
  if (!model) return '/img/printers/default.png?v=printhive';
  const m = model.toLowerCase().replace(/\s+/g, '');
  let img = '/img/printers/default.png';
  if (m.includes('x1e')) img = '/img/printers/x1e.png';
  else if (m.includes('x1c') || m.includes('x1carbon')) img = '/img/printers/x1c.png';
  else if (m.includes('x1')) img = '/img/printers/x1c.png';
  else if (m.includes('x2d') || m === 'n6') img = '/img/printers/x2d.png';
  else if (m.includes('h2dpro') || m.includes('h2d-pro')) img = '/img/printers/h2dpro.png';
  else if (m.includes('h2d')) img = '/img/printers/h2d.png';
  else if (m.includes('h2c')) img = '/img/printers/h2c.png';
  else if (m.includes('h2s')) img = '/img/printers/h2d.png';
  else if (m.includes('p2s')) img = '/img/printers/p1s.png';
  else if (m.includes('p1s')) img = '/img/printers/p1s.png';
  else if (m.includes('p1p')) img = '/img/printers/p1p.png';
  else if (m.includes('a2l') || m === 'n9') img = '/img/printers/a2l.png';
  else if (m.includes('a1mini')) img = '/img/printers/a1mini.png';
  else if (m.includes('a1')) img = '/img/printers/a1.png';
  else if (m.includes('cc2') || m.includes('centauricarbon2') || m.includes('centauri2')) img = '/img/printers/cc2.png';
  else if (m.includes('cc1') || m.includes('centauri') || m.includes('elegoo')) img = '/img/printers/cc1.png';
  return `${img}?v=printhive`;
}

export function isElegooModel(model: string | null | undefined): boolean {
  if (!model) return false;
  const m = model.toLowerCase();
  return m.includes('cc1') || m.includes('cc2') || m.includes('centauri') || m.includes('elegoo');
}


export function getWifiStrength(rssi: number): { labelKey: string; color: string; bars: number } {
  if (rssi >= -50) return { labelKey: 'printers.wifiSignal.excellent', color: 'text-bambu-green', bars: 4 };
  if (rssi >= -60) return { labelKey: 'printers.wifiSignal.good', color: 'text-bambu-green', bars: 3 };
  if (rssi >= -70) return { labelKey: 'printers.wifiSignal.fair', color: 'text-yellow-400', bars: 2 };
  if (rssi >= -80) return { labelKey: 'printers.wifiSignal.weak', color: 'text-orange-400', bars: 1 };
  return { labelKey: 'printers.wifiSignal.veryWeak', color: 'text-red-400', bars: 1 };
}

import type { PrintQueueItem } from '../api/client';

/**
 * Filters queue items based on printer compatibility (filament types and colors).
 * Mirrors backend _find_idle_printer_for_model() logic.
 * @param items - Array of queue items to filter
 * @param loadedFilamentTypes - Set of loaded filament types (e.g., "PLA", "PETG")
 * @param loadedFilaments - Set of loaded filament type+color pairs (e.g., "PLA:ffffff", "PETG:ff0000")
 * @returns Array of compatible queue items
 */
export function filterCompatibleQueueItems(
  items: PrintQueueItem[],
  loadedFilamentTypes?: Set<string>,
  loadedFilaments?: Set<string>
): PrintQueueItem[] {
  return items.filter(item => {
    // Type check: all required filament types must be loaded
    if (item.required_filament_types && item.required_filament_types.length > 0 && loadedFilamentTypes !== undefined) {
      if (!item.required_filament_types.every((t: string) => loadedFilamentTypes.has(t.toUpperCase()))) {
        return false;
      }
    }

    // Color check: evaluate force_color_match per slot
    // Only apply when loadedFilaments is provided (not undefined).
    // An empty Set means no filaments are loaded — force-matched slots cannot match.
    if (item.filament_overrides && item.filament_overrides.length > 0 && loadedFilaments !== undefined) {
      const forceOverrides = item.filament_overrides.filter(o => o.force_color_match === true);
      const prefOverrides = item.filament_overrides.filter(o => o.force_color_match !== true);

      // All force-matched slots must have exact type+color on this printer
      if (forceOverrides.length > 0) {
        const allForceMatch = forceOverrides.every(o => {
          const oType = (o.type || '').toUpperCase();
          const oColor = (o.color || '').replace('#', '').toLowerCase().slice(0, 6);
          return loadedFilaments.has(`${oType}:${oColor}`);
        });
        if (!allForceMatch) return false;
      }

      // Preference-only overrides: at least one color must match (existing behaviour)
      if (prefOverrides.length > 0 && forceOverrides.length === 0) {
        const hasColorMatch = prefOverrides.some(o => {
          const oType = (o.type || '').toUpperCase();
          const oColor = (o.color || '').replace('#', '').toLowerCase().slice(0, 6);
          return loadedFilaments.has(`${oType}:${oColor}`);
        });
        if (!hasColorMatch) return false;
      }
    }

    return true;
  });
}
