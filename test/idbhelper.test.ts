import {IndexDBHelper} from '../src/idbhelper';
import {Store} from '../src/store';

let db;
let result;
beforeAll(async () => {
  db = new IndexDBHelper('myPOSDb');
  result = await db.versions(1).stores([
    {
      name: 'users',
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
});

describe('test 1', () => {
  test('we can create DB and store', () => {
    expect(result).toBe('Successfully opened DB');
    expect(db.users).toBeInstanceOf(Store);
    expect(db.products).toBeInstanceOf(Store);
    expect(db.category).toBeInstanceOf(Store);
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
    const result0 = await db.category.find();
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

    const result0 = await db.products.find();
    expect(result0.length).toBe(4);
    const result1 = await db.products.find({skip: 0, limit: 2});
    expect(result1.length).toBe(2);
    const result2 = await db.products.find({skip: 1, limit: 2});
    expect(result2.length).toBe(2);

    const keyRangeValue = IDBKeyRange.only('satu');
    const result3 = await db.products.find({
      index: 'name',
      query: keyRangeValue,
    });
    expect(result3.length).toBe(2);
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
