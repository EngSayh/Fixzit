const bcrypt = require('bcryptjs');

const password = 'Test@1234';
const hash = '$2b$10$DEA4.sfOaLxbbQN9YulKUeEEf8c7IinIBy9bEtJSKpXyls.lDY8li';

bcrypt.compare(password, hash).then(result => {
  console.log('Password matches hash:', result);
  if (!result) {
    console.log('ISSUE: Password does NOT match the hash!');
  }
}).catch(err => {
  console.error('Error comparing:', err);
});
