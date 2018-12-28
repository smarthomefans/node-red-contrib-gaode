var JsonDB = require('node-json-db');
// The second argument is used to tell the DB to save after each push
// If you put false, you'll have to call the save() method.
// The third argument is to ask JsonDB to save the database in an human readable format. (default false)
var db = new JsonDB("myDataBase", true, true);

db.push('/a', {'a':'x'})
db.push('/b', {'a':'x'})
db.push('/c', {'a':'x'})
db.push('/d', {'a':'x'})

console.log(db.getData('/a'))