import test from 'node:test';import assert from 'node:assert/strict';
import {actionPath,chatAllowed,resultContext,safeSource} from './chatPolicy.js';
test('hide chat during all skill attempts, allow results',()=>{
  for(const skill of ['writing','reading','listening','speaking','grammar-vocab']) {assert.equal(chatAllowed(`/${skill}/test/part1`),false);assert.equal(chatAllowed(`/${skill}/result`),true);}
  assert.equal(chatAllowed('/login'),false);
});
test('context only comes from a result route',()=>{
  const search='?attemptId=00000000-0000-4000-8000-000000000001';assert.equal(resultContext('/writing/test/part1',search),null);assert.ok(resultContext('/writing/result',search));
});
test('actions and sources cannot inject URLs',()=>{
  assert.equal(actionPath({code:'javascript:alert(1)'}),null);assert.equal(safeSource('javascript:alert(1)'),null);assert.equal(safeSource('https://example.org'),'https://example.org/');
  assert.equal(actionPath({code:'REVIEW_ATTEMPT',component:'WRITING',attemptId:'evil'}),null);
});
