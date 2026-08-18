import type { BulkApplySettings } from '../types';

export const BULK_APPLY_SETTINGS_KEY = 'bulkApplySettings';

export const DEFAULT_BULK_APPLY_SETTINGS: BulkApplySettings = {
  delayMinSec: 45,
  delayMaxSec: 120,
};

export const BULK_APPLY_DELAY_BOUNDS = {
  minSec: 5,
  maxSec: 600,
};
