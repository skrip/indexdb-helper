import {IndexDBHelper} from '../src/idbhelper';
import {Store} from '../src/store';

let db;
let result;
beforeAll(async () => {
  db = new IndexDBHelper('myPOSDb', {
    pushUrl: 'http://localhost:8080/push',
    pullUrl: 'http://localhost:8080/pull',
  });
  result = await db.versions(1).stores([
    {
      name: 'users',
      sync: true,
      indexes: [
        {
          name: 'last_update',
          path: 'last_update',
          unique: false,
        },
      ],
    },
    {
      name: 'products',
      autoIncrement: true,
      sync: true,
      indexes: [
        {
          name: 'name',
          path: 'name',
          unique: false,
        },
      ],
    },
    {
      name: 'category',
      indexes: [
        {
          name: 'name',
          path: 'name',
          unique: true,
        },
        {
          name: 'color',
          path: 'color',
          unique: false,
        },
      ],
    },
  ]);
});

describe('test 1', () => {
  test('we can create DB and store', () => {
    expect(result).toBe('Successfully opened DB');
    expect(db.users).toBeInstanceOf(Store);
    expect(db.products).toBeInstanceOf(Store);
    expect(db.category).toBeInstanceOf(Store);
    expect(db.setting).toBeInstanceOf(Store);
    expect(db.push()).toEqual(['users', 'products']);
    expect(db.pull()).toEqual(['users', 'products']);
    expect(db.pullUrl).toBe('http://localhost:8080/pull');
    expect(db.pushUrl).toBe('http://localhost:8080/push');
    expect(db.lastUpdateName).toBe('last_update');
  });
});

//new Date('2023-10-01T12:00:00.000Z')
describe('test last update', () => {
  test('test last update in users', async () => {
    await expect(
      db.users.add({
        id: 'users_1',
        name: 'users 1',
        last_update: 100,
      })
    ).resolves.toBe('OK');

    await expect(
      db.users.add({
        id: 'users_2',
        name: 'users 2',
        last_update: 90,
      })
    ).resolves.toBe('OK');

    const keyRangeValue = IDBKeyRange.upperBound(90);
    const result3 = await db.users.findKey({
      index: 'last_update',
      query: keyRangeValue,
    });
    expect(result3.length).toBe(1);
  });
});

describe('test 2', () => {
  test('test Error if not add id', async () => {
    expect.assertions(1);
    try {
      await db.users.add({
        name: 'saya',
      });
    } catch (error) {
      expect(error).toMatch('ADA Error');
    }
  });
  test('test success because have id', async () => {
    await expect(
      db.users.add({
        name: 'saya',
        id: 'saya',
      })
    ).resolves.toBe('OK');
  });
  test('test Error if not add id again', async () => {
    await expect(
      db.users.add({
        name: 'saya',
      })
    ).rejects.toMatch('ADA Error');
  });
  test('test error duplicate id', async () => {
    await expect(
      db.users.add({
        name: 'saya',
        id: 'saya',
      })
    ).rejects.toMatch('ADA Error');
  });
  test('test success new id', async () => {
    await expect(
      db.users.add({
        name: 'saya',
        id: 'saya2',
      })
    ).resolves.toBe('OK');
  });

  test('test add setting', async () => {
    await expect(
      db.setting.add({
        name: 'saya',
        last_update: new Date(),
      })
    ).resolves.toBe('OK');
  });
});

describe('test category', () => {
  test('test success insert category', async () => {
    await expect(
      db.category.add({
        name: 'category 1',
        color: 'red',
        id: 'satu',
      })
    ).resolves.toBe('OK');
    await expect(
      db.category.add({
        name: 'category 2',
        color: 'blue',
        id: 'dua',
      })
    ).resolves.toBe('OK');
  });

  test('test success get category', async () => {
    await expect(db.category.get('satu')).resolves.toEqual({
      name: 'category 1',
      color: 'red',
      id: 'satu',
    });
  });

  test('test success count category', async () => {
    await expect(db.category.count()).resolves.toEqual(2);
    await expect(db.category.count('satu')).resolves.toEqual(1);
    const keyRangeValue = IDBKeyRange.bound('d', 't');
    await expect(db.category.count(keyRangeValue)).resolves.toEqual(2);

    const result4 = await db.category.update('dua', {name: 'category edit'});
    expect(result4).toBe('OK');
    await expect(db.category.get('dua')).resolves.toEqual({
      name: 'category edit',
      color: 'blue',
      id: 'dua',
    });

    await expect(db.category.delete('satu')).resolves.toBe('OK');
    const result0 = await db.category.findKey();
    expect(result0.length).toBe(1);
  });
});

describe('test find', () => {
  test('test insert autoincrement', async () => {
    await expect(
      db.products.add({
        name: 'satu',
      })
    ).resolves.toBe('OK');
    await expect(
      db.products.add({
        name: 'satu',
      })
    ).resolves.toBe('OK');
    await expect(
      db.products.add({
        name: 'dua',
      })
    ).resolves.toBe('OK');
    await expect(
      db.products.add({
        name: 'dua',
      })
    ).resolves.toBe('OK');

    const result0 = await db.products.findKey();
    expect(result0.length).toBe(4);
    const result1 = await db.products.findKey({skip: 0, limit: 2});
    expect(result1.length).toBe(2);
    expect(result1[0].name).toEqual('satu');
    const result2 = await db.products.findKey({skip: 1, limit: 2});
    expect(result2[0].name).toEqual('dua');
    expect(result2.length).toBe(2);

    const keyRangeValue = IDBKeyRange.only('satu');
    const result3 = await db.products.findKey({
      index: 'name',
      query: keyRangeValue,
    });
    expect(result3.length).toBe(2);

    const result4 = await db.products.findCursor((d) => d.name == 'dua');
    expect(result4.length).toBe(2);
  });
});

describe('test close db and upgrade', () => {
  test('test close upgrade db', async () => {
    db.close();
    result = await db.versions(2).stores([
      {
        name: 'users',
      },
      {
        name: 'roles',
      },
      {
        name: 'products',
        autoIncrement: true,
        indexes: [
          {
            name: 'name',
            path: 'name',
            unique: false,
          },
        ],
      },
      {
        name: 'category',
        indexes: [
          {
            name: 'name',
            path: 'name',
            unique: true,
          },
          {
            name: 'color',
            path: 'color',
            unique: false,
          },
        ],
      },
    ]);
    expect(result).toBe('Successfully opened DB');
    expect(db.users).toBeInstanceOf(Store);
    expect(db.products).toBeInstanceOf(Store);
    expect(db.category).toBeInstanceOf(Store);
  });
});
