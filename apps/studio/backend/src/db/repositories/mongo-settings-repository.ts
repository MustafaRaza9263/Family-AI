import { ObjectId, type Collection, type Db } from 'mongodb';
import type { LimitsOverrides, SettingsDocument } from '../documents.js';
import type {
  SettingsRecord,
  SettingsRepository,
} from './settings-repository.js';

/** Singleton settings document id — one row for the whole studio. */
const SETTINGS_ID = new ObjectId('000000000000000000000001');

const DEFAULTS: SettingsRecord = {
  enginePaused: false,
  limits: {},
};

function toRecord(doc: SettingsDocument): SettingsRecord {
  return {
    enginePaused: doc.enginePaused,
    limits: doc.limits ?? {},
  };
}

export class MongoSettingsRepository implements SettingsRepository {
  private readonly settings: Collection<SettingsDocument>;

  constructor(db: Db) {
    this.settings = db.collection<SettingsDocument>('settings');
  }

  async get(): Promise<SettingsRecord> {
    const doc = await this.settings.findOneAndUpdate(
      { _id: SETTINGS_ID },
      {
        $setOnInsert: {
          _id: SETTINGS_ID,
          enginePaused: false,
          limits: {},
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    return doc ? toRecord(doc) : { ...DEFAULTS };
  }

  async setEnginePaused(paused: boolean): Promise<SettingsRecord> {
    const doc = await this.settings.findOneAndUpdate(
      { _id: SETTINGS_ID },
      {
        $set: { enginePaused: paused },
        $setOnInsert: { limits: {} },
      },
      { upsert: true, returnDocument: 'after' },
    );
    return doc ? toRecord(doc) : { ...DEFAULTS, enginePaused: paused };
  }

  async setLimits(limits: LimitsOverrides): Promise<SettingsRecord> {
    const doc = await this.settings.findOneAndUpdate(
      { _id: SETTINGS_ID },
      {
        $set: { limits },
        $setOnInsert: { enginePaused: false },
      },
      { upsert: true, returnDocument: 'after' },
    );
    return doc ? toRecord(doc) : { ...DEFAULTS, limits };
  }
}
