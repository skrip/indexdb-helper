import {IndexDBHelper} from '../src/idbhelper';
import {Store} from '../src/store';

const response = {
  success: true,
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve(response),
  })
) as jest.Mock;

let db;
let result;
let pushurl = 'http://localhost:8080/api/sync/push';
let pullurl = 'http://localhost:8080/api/sync/pull';
beforeAll(async () => {
  db = new IndexDBHelper('myPOSDb', {
    pushUrl: pushurl,
    pullUrl: pullurl,
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
        {
          name: 'last_update',
          path: 'last_update',
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
    expect(db.pullUrl).toBe(pullurl);
    expect(db.pushUrl).toBe(pushurl);
    expect(db.lastUpdateName).toBe('last_update');
  });
});

//new Date('2023-10-01T12:00:00.000Z')
describe('test last update', () => {
  test('test last update in users', async () => {
    let d2 = new Date('2023-10-02T12:00:00.000Z');
    let d3 = new Date('2023-10-02T10:00:00.000Z');

    await expect(
      db.users.add({
        id: 'users_1',
        name: 'users 1',
        last_update: d2.toISOString(), //100, //new Date('2023-10-02T12:00:00.000Z'),
      })
    ).resolves.toBe('OK');

    await expect(
      db.users.add({
        id: 'users_2',
        name: 'users 2',
        last_update: d3.toISOString(), //90, //new Date('2023-10-01T12:00:00.000Z'), //
      })
    ).resolves.toBe('OK');

    const result1 = await db.users.findCursor(undefined, {
      index: 'last_update',
    });
    expect(result1.length).toBe(2);
    expect(result1[0].id).toBe('users_2');

    const result2 = await db.users.findKey({
      index: 'last_update',
    });
    expect(result2.length).toBe(2);
    expect(result2[0].id).toBe('users_2');

    let s = new Date('2023-10-02T12:00:00.000Z');
    const keyRangeValue = IDBKeyRange.upperBound(s.toISOString()); //new Date('2023-10-02T12:00:00.000Z')
    const result3 = await db.users.findKey({
      index: 'last_update',
      query: keyRangeValue,
    });
    expect(result3.length).toBe(2);
  });

  test('test push pull', async () => {
    await expect(db.push()).resolves.toEqual(['users']); //, 'products'

    const result = await db.setting.findKey();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('users');

    expect(db.pull()).toEqual(['users', 'products']);
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
        price: 100,
      })
    ).resolves.toBe('OK');
    await expect(
      db.products.add({
        name: 'satu',
        price: 200,
      })
    ).resolves.toBe('OK');
    await expect(
      db.products.add({
        name: 'dua',
        price: 300,
      })
    ).resolves.toBe('OK');
    await expect(
      db.products.add({
        name: 'dua',
        price: 400,
      })
    ).resolves.toBe('OK');

    const result0 = await db.products.findKey();
    expect(result0.length).toBe(4);
    const result1 = await db.products.findKey({skip: 0, limit: 2});
    expect(result1.length).toBe(2);
    expect(result1[0].name).toEqual('satu');
    const result2 = await db.products.findKey({skip: 1, limit: 2});
    expect(result2[0].name).toEqual('satu');
    expect(result2.length).toBe(2);

    const result22 = await db.products.findKey({skip: 2, limit: 2});
    expect(result22[0].name).toEqual('dua');
    expect(result22.length).toBe(2);

    const keyRangeValue = IDBKeyRange.only('satu');
    const result3 = await db.products.findKey({
      index: 'name',
      query: keyRangeValue,
    });
    expect(result3.length).toBe(2);
  });

  test('test find cursor', async () => {
    const result1 = await db.products.findCursor((d) => d.name == 'dua');
    expect(result1.length).toBe(2);

    const result2 = await db.products.findCursor((d) => {
      if (d.name == 'dua') {
        d.total = d.price + 100;
        return d;
      }
      return false;
    });
    expect(result2.length).toBe(2);
    const expected = [
      {
        id: 3,
        name: 'dua',
        price: 300,
        total: 400,
      },
      {
        id: 4,
        name: 'dua',
        price: 400,
        total: 500,
      },
    ];
    expect(result2).toEqual(expected);

    const result3 = await db.products.countCursor((d) => d.name == 'dua');
    expect(result3).toBe(2);

    const result4 = await db.products.countCursor();
    expect(result4).toBe(4);
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
