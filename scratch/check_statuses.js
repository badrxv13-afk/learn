const path = require('path');
global.window = {};
require(path.join(__dirname, '../data/registry_4am.js'));
const reg = global.window.PlatformRegistry4AM;
const statuses = new Set(Object.values(reg).map(r => r.verificationStatus));
console.log('Statuses in PlatformRegistry4AM:', Array.from(statuses));
