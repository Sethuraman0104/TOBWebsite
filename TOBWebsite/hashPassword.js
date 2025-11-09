const bcrypt = require('bcrypt');

const password = 'Admin@123'; // <-- your desired admin password
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) return console.error(err);
  console.log('Hashed password:', hash);
});
