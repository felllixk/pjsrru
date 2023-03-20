import * as fs from "node:fs";

if (!process.argv[2]) {
    console.log('Введите токен вторым параметром');
    process.exit(1);
}
const token = process.argv[2];
let obj = [];

// if(fs.existsSync('./cookies.json')){
//     obj = JSON.parse(fs.readFileSync('./cookies.json', 'utf8'));
// }
const cookie = [{
    "name": "JWT",
    "value": token,
    "domain": ".reg.ru",
    "path": "/",
    "expires": 1679442238.418636,
    "size": 50,
    "httpOnly": true,
    "secure": true,
    "session": false,
    "sameParty": false,
    "sourceScheme": "Secure",
    "sourcePort": 443
}];

fs.writeFileSync('./cookies.json', JSON.stringify(cookie))

