import * as migration_20261026_001231_initial from './20261026_001231_initial';

export const migrations = [
  {
    up: migration_20261026_001231_initial.up,
    down: migration_20261026_001231_initial.down,
    name: '20261026_001231_initial'
  },
];
