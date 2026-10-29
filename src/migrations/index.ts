import * as migration_20261026_001231_initial from './20261026_001231_initial';
import * as migration_20261026_050307_email_token from './20261026_050307_email_token';
import * as migration_20261026_074644_billing_event_fields from './20261026_074644_billing_event_fields';
import * as migration_20261027_104453_flutterwave_fields from './20261027_104453_flutterwave_fields';
import * as migration_20261029_141240_usage_limits from './20261029_141240_usage_limits';

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
  {
    up: migration_20261027_104453_flutterwave_fields.up,
    down: migration_20261027_104453_flutterwave_fields.down,
    name: '20261027_104453_flutterwave_fields',
  },
  {
    up: migration_20261029_141240_usage_limits.up,
    down: migration_20261029_141240_usage_limits.down,
    name: '20261029_141240_usage_limits'
  },
];
