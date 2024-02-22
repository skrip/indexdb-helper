import {Store} from './store';

export interface IndbOption {
  indexedDB?: typeof indexedDB;
}
export interface IStoreIndex {
  name: string;
  path: string;
  unique: boolean;
}
export interface IStores {
  name: string;
  key?: string;
  autoIncrement?: boolean;
  indexes?: Array<IStoreIndex>;
}

export interface IModel {
  id: string;
  name: string;
  created_at: Date;
  update_at: Date;
}

export class IndexDBHelper {
  [index: string]: Store<IModel> | string | number | IDBFactory | IDBDatabase | ((s: string | number | Array<IStores>) => IndexDBHelper | Promise<string>) | (() => void) ;
  private _name: string;
  private _version: number;
  private _idxdb = indexedDB;
  private _db: IDBDatabase;

  constructor(name: string, option?: IndbOption) {
    this._name = name;
    this._version = 1;
    if (option) {
      if (option.indexedDB) {
        this._idxdb = option.indexedDB;
      }
    }
  }

  close(){
    if(this._db){
      this._db.close();
    }
  }

  versions(version: number) {
    this._version = version;
    return this;
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

          inew[data[i].name] = new Store(data[i].name, this._db);
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
        }
      });
    });
  }

  get Db() {
    return this._db;
  }
}
