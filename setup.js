// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
const fs = require('fs'); const write = (f, c) => { fs.mkdirSync(require('path').dirname(f), {recursive:true}); fs.writeFileSync(f, c.trim(), 'utf8'); console.log('✅', f); };
