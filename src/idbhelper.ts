import {Store} from './store';

export interface IndbOption {
  indexedDB?: typeof indexedDB;
  pushUrl?: string;
  pullUrl?: string;
  lastUpdateName?: string;
}
export interface IStoreIndex {
  name: string;
  path: string;
  unique: boolean;
}
export interface IStores {
  name: string;
  key?: string;
  sync?: boolean;
  autoIncrement?: boolean;
  indexes?: Array<IStoreIndex>;
}

export interface IModel {
  id?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  last_update?: string;
}

export class IndexDBHelper {
  [index: string]:
    | Store<IModel>
    | string
    | number
    | IDBFactory
    | IDBDatabase
    | ((s: string | number | Array<IStores>) => IndexDBHelper | Promise<string>)
    | (() => void);
  private _name: string;
  private _version: number;
  private _idxdb = indexedDB;
  private _db: IDBDatabase;
  private _nameTableSetting = 'setting';
  private _pushUrl = '';
  private _pullUrl = '';
  private _lastUpdateName = 'last_update';

  constructor(name: string, option?: IndbOption) {
    this._name = name;
    this._version = 1;
    if (option) {
      if (option.indexedDB) {
        this._idxdb = option.indexedDB;
      }
      if (option.pushUrl) {
        this._pushUrl = option.pushUrl;
      }
      if (option.pullUrl) {
        this._pullUrl = option.pullUrl;
      }
      if (option.lastUpdateName) {
        this._lastUpdateName = option.lastUpdateName;
      }
    }
  }

  close() {
    if (this._db) {
      this._db.close();
    }
  }

  versions(version: number) {
    this._version = version;
    return this;
  }

  pushData = async (url = '', data = {}) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    } catch (error) {
      return 'ERROR';
    }
  };

  async push() {
    let cek = [];
    for (let key in this) {
      if (this[key].constructor.name === 'Store') {
        let storeTable = this[key] as Store<IModel>;
        let storeSetting = this.setting as Store<IModel>;
        if (storeTable.isSync) {
          let tbname = storeTable.name;
          let setting = await storeSetting.get(tbname);
          let s = new Date();
          if (setting) {
            // sudah pernah sync
            s = new Date(setting.last_update);
          }
          const keyRangeValue = IDBKeyRange.upperBound(s.toISOString());
          const result = await storeTable.findKey({
            index: this._lastUpdateName,
            query: keyRangeValue,
          });
          
          if (result.length > 0) {
            let res = await this.pushData(
              this._pushUrl + `?table=${tbname}`,
              result
            );
            if (res !== 'ERROR') {
              if (!res.error) {
                cek.push(tbname);
                if (setting) {
                  // sudah pernah sync
                  await storeSetting.update(tbname, {
                    name: tbname,
                    last_update: new Date().toISOString(),
                  });
                } else {
                  await storeSetting.add({
                    name: tbname,
                    last_update: new Date().toISOString(),
                  });
                }
              }
            }
          }
        }
      }
    }
    return cek;
  }

  pull() {
    let cek = [];
    for (let key in this) {
      if (this[key].constructor.name === 'Store') {
        if ((this[key] as Store<IModel>).isSync) {
          cek.push((this[key] as Store<IModel>).name);
        }
      }
    }
    return cek;
  }

  stores(data: Array<IStores>): Promise<string> {
    return new Promise((resolve, reject) => {
      const openOrCreateDB = this._idxdb.open(this._name, this._version);
      openOrCreateDB.addEventListener('error', (error) => {
        console.log('itu error ', error);
        reject('Error opening DB');
      });

      openOrCreateDB.addEventListener('success', () => {
        this._db = openOrCreateDB.result;
        for (let i = 0; i < data.length; i++) {
          const inew: Record<string, Store<IModel>> = {};

          inew[data[i].name] = new Store(
            data[i].name,
            this._db,
            data[i].sync ? true : false
          );
          Object.assign(this, inew);
        }

        // create sync
        if (data.length > 0) {
          const inew: Record<string, Store<IModel>> = {};

          inew[this._nameTableSetting] = new Store(
            this._nameTableSetting,
            this._db
          );
          Object.assign(this, inew);
        }
        resolve('Successfully opened DB');
      });

      openOrCreateDB.addEventListener('upgradeneeded', async (event) => {
        let target = event.target as IDBOpenDBRequest;
        let db = target.result;

        if (Array.isArray(data)) {
          for (let i = 0; i < data.length; i++) {
            if (!db.objectStoreNames.contains(data[i].name)) {
              //db.deleteObjectStore(collectionName.STATES);

              const objStore = db.createObjectStore(data[i].name, {
                keyPath: data[i].key ? data[i].key : 'id',
                autoIncrement: data[i].autoIncrement
                  ? data[i].autoIncrement
                  : false,
              });
              if (Array.isArray(data[i].indexes)) {
                for (let x = 0; x < data[i].indexes.length; x++) {
                  let index = data[i].indexes[x];
                  objStore.createIndex(index.name, index.path, {
                    unique: index.unique,
                  });
                }
              }
            }
          }

          // create sync
          if (data.length > 0) {
            if (!db.objectStoreNames.contains(this._nameTableSetting)) {
              const objStore = db.createObjectStore(this._nameTableSetting, {
                keyPath: 'name',
                autoIncrement: false,
              });
            }
          }
        }
      });
    });
  }

  get Db() {
    return this._db;
  }

  get pushUrl() {
    return this._pushUrl;
  }

  get pullUrl() {
    return this._pullUrl;
  }

  get lastUpdateName() {
    return this._lastUpdateName;
  }
}
