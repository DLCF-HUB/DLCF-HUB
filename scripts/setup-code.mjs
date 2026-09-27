import {randomBytes,createHash} from 'node:crypto';
const code=randomBytes(32).toString('base64url');
console.log('Private one-time administrator setup code:\n'+code+'\n\nAdd this server-only environment variable in Vercel:\nADMIN_SETUP_HASH='+createHash('sha256').update(code).digest('hex'));
