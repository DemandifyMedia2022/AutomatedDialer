import { db as defaultDb } from '../db/prisma';

export const DEFAULT_SETTINGS = {
  asterisk: {
    host: 'localhost',
    port: 8088,
    username: 'admin',
    password: '',
  },
  kamailio: {
    host: 'localhost',
    port: 5060,
  },
  recording: {
    enabled: true,
    path: '/var/spool/asterisk/monitor',
    format: 'wav',
  },
  cdr: {
    enabled: true,
    backend: 'mysql',
  },
  general: {
    timezone: 'UTC',
    language: 'en',
  },
};

interface FlattenedSetting {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
  category: string;
}

export class SystemSettingsService {
  private static db: any = defaultDb;

  // Method to inject a mock DB for testing
  static setDb(db: any) {
    this.db = db;
  }

  /**
   * Flattens a nested settings object into a list of database records.
   */
  private static flattenSettings(settings: any, prefix = ''): FlattenedSetting[] {
    let result: FlattenedSetting[] = [];

    for (const key in settings) {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        const value = settings[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        const category = newKey.split('.')[0]; // Top-level key is category

        if (typeof value === 'object' && value !== null) {
          result = result.concat(this.flattenSettings(value, newKey));
        } else {
          result.push({
            key: newKey,
            value: String(value),
            type: typeof value as 'string' | 'number' | 'boolean',
            category,
          });
        }
      }
    }
    return result;
  }

  /**
   * Reconstructs the nested settings object from database records.
   */
  private static unflattenSettings(records: any[]): any {
    const result: any = {};

    for (const record of records) {
      const keys = record.key.split('.');
      let current = result;

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (i === keys.length - 1) {
          // Leaf node, assign value based on type
          let value: any = record.value;
          if (record.type === 'number') value = Number(value);
          else if (record.type === 'boolean') value = value === 'true';

          current[key] = value;
        } else {
          // Intermediate node
          current[key] = current[key] || {};
          current = current[key];
        }
      }
    }
    return result;
  }

  static async getSettings() {
    try {
      const records = await this.db.system_config.findMany();

      if (records.length === 0) {
        return DEFAULT_SETTINGS;
      }

      const dbSettings = this.unflattenSettings(records);

      // Merge with defaults to ensure missing keys are present
      // We use a deep copy of DEFAULT_SETTINGS to avoid mutating it
      const mergedSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

      // Recursive merge: dbSettings overwrite defaults
      const finalSettings = this.mergeWithDefaults(mergedSettings, dbSettings);

      return finalSettings;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw error;
    }
  }

  private static mergeWithDefaults(defaults: any, overrides: any): any {
      if (!overrides) return defaults;

      for (const key in defaults) {
          if (overrides.hasOwnProperty(key)) {
              if (typeof defaults[key] === 'object' && defaults[key] !== null &&
                  typeof overrides[key] === 'object' && overrides[key] !== null) {
                  this.mergeWithDefaults(defaults[key], overrides[key]);
              } else {
                  defaults[key] = overrides[key];
              }
          }
      }

      // Also add keys that are in overrides but not in defaults (custom configs)
      for (const key in overrides) {
          if (!defaults.hasOwnProperty(key)) {
              defaults[key] = overrides[key];
          }
      }

      return defaults;
  }

  static async saveSettings(settings: any) {
    try {
      const flattened = this.flattenSettings(settings);

      // Use transaction to ensure consistency
      await this.db.$transaction(
        flattened.map((item) =>
          this.db.system_config.upsert({
            where: { key: item.key },
            update: {
              value: item.value,
              type: item.type,
              category: item.category,
              modified_at: new Date(),
            },
            create: {
              category: item.category,
              key: item.key,
              value: item.value,
              type: item.type,
              modified_at: new Date(),
            },
          })
        )
      );

      return settings;
    } catch (error) {
      console.error('Error saving system settings:', error);
      throw error;
    }
  }
}
