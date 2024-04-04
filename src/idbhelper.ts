import {Store} from './store';
import {IndexDBHelperError} from './error';

export interface IndbOption {
  indexedDB?: typeof indexedDB;
  pushUrl?: string;
  pullUrl?: string;
  pushDeletedUrl?: string;
  pullDeletedUrl?: string;
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
  shoudDeleteWhenUpgrade?: boolean;
}

export interface IModel {
  id?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IModelSetting extends IModel {
  last_push?: string;
  last_pull?: string;
  last_push_deleted?: string;
  last_pull_deleted?: string;
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
  private _nameTableDeleted = 'deleted';
  private _pushUrl = '';
  private _pushDeletedUrl = '';
  private _pullUrl = '';
  private _pullDeletedUrl = '';
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
      if (option.pushDeletedUrl) {
        this._pushDeletedUrl = option.pushDeletedUrl;
      }
      if (option.pullDeletedUrl) {
        this._pullDeletedUrl = option.pullDeletedUrl;
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

  pullData = async (url = '') => {
    try {
      const response = await fetch(url);
      return response.json();
    } catch (error) {
      return 'ERROR';
    }
  };

  async pushDeleted() {
    let cek = [];
    for (let key in this) {
      if (this[key].constructor.name === 'Store') {
        let storeTable = this[key] as Store<IModel>;
        let storeDeleted = this.deleted as Store<IModel>;
        let storeSetting = this.setting as Store<IModelSetting>;
        if (storeTable.isSync) {
          let tbname = storeTable.name;
          let setting = await storeSetting.get(tbname);
          let s = null;
          if (setting) {
            // sudah pernah sync
            if (setting.last_push_deleted) {
              s = new Date(setting.last_push_deleted).toISOString();
            }
          }

          let result;
          if (s !== null) {
            const keyRangeValue = IDBKeyRange.lowerBound(s);
            result = await storeDeleted.findKey({
              index: 'deleted_at',
              query: keyRangeValue,
            });
          } else {
            result = await storeDeleted.findKey({
              index: 'deleted_at',
            });
          }

          if (result.length > 0) {
            let res = await this.pushData(
              this._pushDeletedUrl + `?table=${tbname}`,
              result
            );
            if (res !== 'ERROR') {
              if (!res.error) {
                cek.push(tbname);
                if (setting) {
                  setting.last_push_deleted = new Date().toISOString();
                  await storeSetting.update(tbname, setting);
                } else {
                  await storeSetting.add({
                    name: tbname,
                    last_push_deleted: new Date().toISOString(),
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

  async push() {
    let cek = [];
    for (let key in this) {
      if (this[key].constructor.name === 'Store') {
        let storeTable = this[key] as Store<IModel>;
        let storeSetting = this.setting as Store<IModelSetting>;
        if (storeTable.isSync) {
          let tbname = storeTable.name;
          let setting = await storeSetting.get(tbname);
          let s = null;
          if (setting) {
            // sudah pernah sync
            if (setting.last_push) {
              s = new Date(setting.last_push).toISOString();
            }
          }
          let result;
          if (s !== null) {
            const keyRangeValue = IDBKeyRange.lowerBound(s);
            result = await storeTable.findKey({
              index: this._lastUpdateName,
              query: keyRangeValue,
            });
          } else {
            result = await storeTable.findKey({
              index: this._lastUpdateName,
            });
          }

          if (result.length > 0) {
            let res = await this.pushData(
              this._pushUrl + `?table=${tbname}`,
              result
            );
            if (res !== 'ERROR') {
              if (!res.error) {
                cek.push(tbname);
                if (setting) {
                  setting.last_push = new Date().toISOString();
                  await storeSetting.update(tbname, setting);
                } else {
                  await storeSetting.add({
                    name: tbname,
                    last_push: new Date().toISOString(),
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

  async pull() {
    let cek = [];
    for (let key in this) {
      if (this[key].constructor.name === 'Store') {
        let storeTable = this[key] as Store<IModel>;
        let storeSetting = this.setting as Store<IModelSetting>;
        if (storeTable.isSync) {
          let tbname = storeTable.name;
          let setting = await storeSetting.get(tbname);
          let s = null;
          if (setting) {
            // sudah pernah sync
            if (setting.last_pull) {
              s = new Date(setting.last_pull).toISOString();
            }
          }
          let data = await this.pullData(
            this._pullUrl + `?table=${tbname}&last_update=${s}`
          );
          if (data.success) {
            if (data.data.length > 0) {
              cek.push(tbname);
              for (let i = 0; i < data.data.length; i++) {
                let row = data.data[i];
                let kid = row[storeTable.keyPath];
                if (kid) {
                  let dt = await storeTable.get(kid);
                  if (dt) {
                    // update
                    await storeTable.update(kid, row);
                  } else {
                    // insert
                    await storeTable.add(row);
                  }
                }
              }
              if (setting) {
                setting.last_pull = new Date().toISOString();
                await storeSetting.update(tbname, setting);
              } else {
                await storeSetting.add({
                  name: tbname,
                  last_pull: new Date().toISOString(),
                });
              }
            }
          }
        }
      }
    }
    return cek;
  }

  async pullDeleted() {
    let cek = [];
    for (let key in this) {
      if (this[key].constructor.name === 'Store') {
        let storeTable = this[key] as Store<IModel>;
        let storeSetting = this.setting as Store<IModelSetting>;
        if (storeTable.isSync) {
          let tbname = storeTable.name;
          let setting = await storeSetting.get(tbname);
          let s = null;
          if (setting) {
            // sudah pernah sync
            if (setting.last_pull_deleted) {
              s = new Date(setting.last_pull_deleted).toISOString();
            }
          }
          let data = await this.pullData(
            this._pullDeletedUrl + `?table=${tbname}&last_update=${s}`
          );
          if (data.success) {
            if (data.data.length > 0) {
              cek.push(tbname);
              for (let i = 0; i < data.data.length; i++) {
                let row = data.data[i];
                let kid = row['deleted_id'];
                if (kid) {
                  try {
                    // ada peluang id sama
                    let dt = await storeTable.delete(kid);
                  } catch (error) {}
                }
              }
              if (setting) {
                setting.last_pull_deleted = new Date().toISOString();
                await storeSetting.update(tbname, setting);
              } else {
                await storeSetting.add({
                  name: tbname,
                  last_pull_deleted: new Date().toISOString(),
                });
              }
            }
          }
        }
      }
    }
    return cek;
  }

  stores(data: Array<IStores>): Promise<string> {
    return new Promise((resolve, reject) => {
      const openOrCreateDB = this._idxdb.open(this._name, this._version);

      openOrCreateDB.onerror = (event) => {
        let target = event.target as IDBOpenDBRequest;
        reject(new IndexDBHelperError(target.error));
      };

      openOrCreateDB.addEventListener('success', () => {
        this._db = openOrCreateDB.result;
        for (let i = 0; i < data.length; i++) {
          const inew: Record<string, Store<IModel>> = {};

          let keyPath = data[i].key ? data[i].key : 'id';
          inew[data[i].name] = new Store(
            data[i].name,
            this._db,
            keyPath,
            data[i].sync ? true : false
          );
          Object.assign(this, inew);
        }

        // create sync
        if (data.length > 0) {
          const inew: Record<string, Store<IModel>> = {};

          inew[this._nameTableSetting] = new Store(
            this._nameTableSetting,
            this._db,
            'name'
          );
          inew[this._nameTableDeleted] = new Store(
            this._nameTableDeleted,
            this._db,
            'name'
          );
          Object.assign(this, inew);
        }
        resolve('Successfully opened DB');
      });

      openOrCreateDB.addEventListener('upgradeneeded', (event) => {
        let target = event.target as IDBOpenDBRequest;
        let db = target.result;

        if (Array.isArray(data)) {
          for (let i = 0; i < data.length; i++) {
            if (db.objectStoreNames.contains(data[i].name)) {
              if (data[i].shoudDeleteWhenUpgrade) {
                db.deleteObjectStore(data[i].name);
              }
            }
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
            if (!db.objectStoreNames.contains(this._nameTableDeleted)) {
              const objStore = db.createObjectStore(this._nameTableDeleted, {
                keyPath: 'id',
                autoIncrement: true,
              });
              objStore.createIndex('deleted_id', 'deleted_id', {
                unique: true,
              });
              objStore.createIndex('deleted_at', 'deleted_at', {
                unique: false,
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

  get pushDeletedUrl() {
    return this._pushDeletedUrl;
  }

  get pullDeletedUrl() {
    return this._pullDeletedUrl;
  }

  get lastUpdateName() {
    return this._lastUpdateName;
  }
}
