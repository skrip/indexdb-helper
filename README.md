# indexdb-helper

```js
const db = new IndexDBHelper('NamaDB');
await db.versions(1).stores([
    {
      name: 'users', // table name
    }
]);

await db.users.add({
    id: 'users_1',
    name: 'users 1',
    address: 'address'
})

const results1 = await db.users.findCursor(d => d.name == 'users 1');
// we got results
// [
//     {
//         id: 'users_1',
//         name: 'users 1',
//         address: 'address'
//     }
// ]

const results2 = await db.users.findCursor(d => {
    if(d.name == 'users_1'){
        d.FieldToAdd = d.name+' '+d.address;
        return d;
    }
    return false;
});
// we got results
// [
//     {
//         id: 'users_1',
//         name: 'users 1',
//         address: 'address',
//         FieldToAdd: 'users 1 address'
//     }
// ]
```
