// Marks weak devices so CSS can drop expensive effects (blur) while keeping the layout (Shell Console's
// data-strained pattern). Checked once at boot; cheap, no polling.
interface DeviceHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
}

export function markDeviceStrain(): void {
  const hints = navigator as Navigator & DeviceHints;
  const cores = hints.hardwareConcurrency ?? 8;
  const memory = hints.deviceMemory ?? 8;
  const network = hints.connection;
  const slowNetwork = network?.effectiveType === '2g' || network?.effectiveType === 'slow-2g' || network?.effectiveType === '3g';
  const strained = cores <= 2 || memory <= 2 || network?.saveData === true || slowNetwork;
  if (strained) document.documentElement.dataset.strained = '';
}
