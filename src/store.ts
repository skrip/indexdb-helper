export interface IFIndQuery {
  query?: IDBKeyRange;
  direction?: IDBCursorDirection;
  skip?: number;
  limit?: number;
  index?: string;
}

export class Store<Type> {
  private _name: string;
  private _db: IDBDatabase;
  constructor(name: string, db: IDBDatabase) {
    this._name = name;
    this._db = db;
  }

  public add(data: Record<string, Type>): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this._db.transaction([this._name], 'readwrite');
        const objectStore = transaction.objectStore(this._name);

        transaction.oncomplete = (e) => {
          resolve('OK');
        };

        transaction.onerror = (event) => {
          reject('ADA Error 1');
        };

        const request = objectStore.add(data);
        request.onerror = (event) => {
          reject('ADA Error 2');
        };
      } catch (error) {
        reject('ADA Error');
      }
    });
  }

  public get(id: string): Promise<Type> {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._name], 'readonly');
      const objectStore = transaction.objectStore(this._name);
      const request = objectStore.get(id);
      request.onerror = (event) => {
        reject('error');
      };
      request.onsuccess = (event) => {
        resolve(request.result);
      };
    });
  }

  public delete(id: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._name], 'readwrite');
      const objectStore = transaction.objectStore(this._name);
      const request = objectStore.delete(id);
      request.onerror = (event) => {
        reject('error');
      };
      request.onsuccess = (event) => {
        resolve('OK');
      };
    });
  }

  public update(id: string, sdata: Type) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this._db.transaction([this._name], 'readwrite');
        const objectStore = transaction.objectStore(this._name);

        const request = objectStore.get(id);
        request.onerror = (event) => {
          reject('error update DB');
        };
        request.onsuccess = (event) => {
          let target = event.target as IDBRequest;
          if (target) {
            const data = target.result;

            for (const property in sdata) {
              data[property] = sdata[property];
            }

            const requestUpdate = objectStore.put(data);
            requestUpdate.onerror = (event) => {
              reject('error update Setting');
            };
            requestUpdate.onsuccess = (event) => {
              resolve('OK');
            };
          } else {
            reject('error update Setting');
          }
        };
      } catch (error) {
        reject(error);
      }
      
    });
  }

  public count(query?: IDBValidKey | IDBKeyRange): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._name], 'readonly');
      const objectStore = transaction.objectStore(this._name);

      const countRequest = objectStore.count(query);
      countRequest.onsuccess = () => {
        resolve(countRequest.result);
      };
      countRequest.onerror = () => {
        reject('error');
      };
    });
  }

  public find(q: IFIndQuery): Promise<Type[]> {
    return new Promise((resolve, reject) => {
      const transaction = this._db.transaction([this._name], 'readonly');
      const objectStore = transaction.objectStore(this._name);

      let catCursor;
      let hasil: Array<Type> = [];
      transaction.oncomplete = (e) => {
        resolve(hasil);
      };
      let first = true;
      let count = 0;
      if (q == undefined) {
        q = {};
      }
      let request = objectStore.openCursor(
        q.query ? q.query : undefined,
        q.direction ? q.direction : undefined
      );
      if (q.index) {
        const myIndex = objectStore.index(q.index);
        request = myIndex.openCursor(q.query, q.direction);
      }
      if (q.skip == undefined) {
        q.skip = 0;
      }
      request.onsuccess = (event) => {
        let target = event.target as IDBRequest;
        if (target) {
          catCursor = target.result;
          if (catCursor) {
            if (first) {
              if (q.skip == 0) {
                hasil.push(catCursor.value);
                catCursor.continue();
                count++;
                first = false;
              } else {
                if (q.limit) {
                  catCursor.advance(q.skip * q.limit);
                }

                first = false;
              }
            } else {
              if (q.limit) {
                if (count < q.limit) {
                  hasil.push(catCursor.value);
                  catCursor.continue();
                  count++;
                }
              } else {
                hasil.push(catCursor.value);
                catCursor.continue();
                count++;
              }
            }
          }
        }
      };

      request.onerror = () => {
        reject('error');
      };
    });
  }
}
