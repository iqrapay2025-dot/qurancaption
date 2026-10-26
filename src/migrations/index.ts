import * as migration_20261026_001231_initial from './20261026_001231_initial';
import * as migration_20261026_050307_email_token from './20261026_050307_email_token';
import * as migration_20261026_074644_billing_event_fields from './20261026_074644_billing_event_fields';

export const migrations = [
  {
    up: migration_20261026_001231_initial.up,
    down: migration_20261026_001231_initial.down,
    name: '20261026_001231_initial',
  },
  {
    up: migration_20261026_050307_email_token.up,
    down: migration_20261026_050307_email_token.down,
    name: '20261026_050307_email_token',
  },
  {
    up: migration_20261026_074644_billing_event_fields.up,
    down: migration_20261026_074644_billing_event_fields.down,
    name: '20261026_074644_billing_event_fields',
  },
];