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
    lastUpdateName: 'updated_at',
  });
  result = await db.versions(1).stores([
    {
      name: 'users',
      key: '_id',
      sync: true,
      indexes: [
        {
          name: 'updated_at',
          path: 'updated_at',
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
    expect(db.pullUrl).toBe(pullurl);
    expect(db.pushUrl).toBe(pushurl);
    expect(db.lastUpdateName).toBe('updated_at');
  });
});

describe('test last update', () => {
  test('test last update in users', async () => {
    let d2 = new Date('2023-10-02T12:00:00.000Z');
    let d3 = new Date('2023-10-02T10:00:00.000Z');

    await expect(
      db.users.add({
        _id: 'users_1',
        name: 'users 1',
        updated_at: d2.toISOString(), //100, //new Date('2023-10-02T12:00:00.000Z'),
      })
    ).resolves.toBe('OK');

    await expect(
      db.users.add({
        _id: 'users_2',
        name: 'users 2',
        updated_at: d3.toISOString(), //90, //new Date('2023-10-01T12:00:00.000Z'), //
      })
    ).resolves.toBe('OK');

    const result1 = await db.users.findCursor(undefined, {
      index: 'updated_at',
    });
    expect(result1.length).toBe(2);
    expect(result1[0]._id).toBe('users_2');

    const result2 = await db.users.findKey({
      index: 'updated_at',
    });
    expect(result2.length).toBe(2);
    expect(result2[0]._id).toBe('users_2');

    let s = new Date('2023-10-02T12:00:00.000Z');
    const keyRangeValue = IDBKeyRange.upperBound(s.toISOString()); //new Date('2023-10-02T12:00:00.000Z')
    const result3 = await db.users.findKey({
      index: 'updated_at',
      query: keyRangeValue,
    });
    expect(result3.length).toBe(2);
  });

  test('test push pull', async () => {
    let d2 = new Date();
    d2.setDate(d2.getDate() + 1);
    await expect(
      db.users.add({
        _id: 'users_3',
        name: 'users 3',
        updated_at: d2.toISOString(), //100, //new Date('2023-10-02T12:00:00.000Z'),
      })
    ).resolves.toBe('OK');

    await expect(db.push()).resolves.toEqual(['users']); //, 'products'

    const result = await db.setting.findKey();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('users');

    expect(db.pull()).toEqual(['users']);
  });
});
