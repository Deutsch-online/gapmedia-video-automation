import assert from 'node:assert/strict';
import {BASE_COMMANDS,parseCommandManagement,manageCommands,resolveAlias} from './src/command-registry.js';

const memory = new Map();
const env = {BOT_STATE:{
  get:async(key,format)=>format==='json'?JSON.parse(memory.get(key)||'null'):memory.get(key)||null,
  put:async(key,value)=>memory.set(key,value),
}};
const telegramCalls = [];
const telegram = async(_env,method,body)=>{telegramCalls.push({method,body});return {ok:true};};

assert.equal(parseCommandManagement('دستور /check را برای /status نصب کن').action,'add');
assert.equal(parseCommandManagement('دستور /check را حذف کن').action,'delete');
assert.match(await manageCommands(env,'7','/addcmd check status',telegram),/نصب شد/);
assert.equal(await resolveAlias(env,'7','/check'),'/status');
assert.equal(await resolveAlias(env,'7','/check extra'),'/status extra');
assert.equal(telegramCalls.at(-1).body.scope.type,'chat','custom menu applies to owner chat only');
assert.ok(telegramCalls.at(-1).body.commands.some(item=>item.command==='check'));
assert.match(await manageCommands(env,'7','/mycmds',telegram),/check/);
assert.match(await manageCommands(env,'7','/addcmd status episode',telegram),/دستور اصلی/);
assert.match(await manageCommands(env,'7','/addcmd pay credit',telegram),/نصب شد/);
assert.match(await manageCommands(env,'7','/addcmd shell status',telegram),/نصب شد/);
assert.match(await manageCommands(env,'7','/addcmd valid arbitrary',telegram),/قابل نصب نیست/);
assert.equal(await resolveAlias(env,'7','/status'),null,'built-in commands cannot be overridden');
assert.match(await manageCommands(env,'7','/delcmd check',telegram),/حذف شد/);
assert.equal(await resolveAlias(env,'7','/check'),null);
assert.match(await manageCommands(env,'7','/delcmd status',telegram),/قابل حذف نیست/);
assert.ok(BASE_COMMANDS.some(item=>item.command==='addcmd'));
console.log('owner-scoped command installation, deletion and protected built-ins hold');
