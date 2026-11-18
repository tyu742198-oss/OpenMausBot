import test from 'node:test';
import assert from 'node:assert/strict';
import {restrictedNativeApproval} from './codex-policy.ts';

test('restricted Ask can never inherit writable permissions or a wider fallback',()=>{
 const original={thread:{sandbox:'workspace-write'},turn:{sandboxPolicy:{type:'workspaceWrite',writableRoots:['/']}},fallback:{thread:{sandbox:'danger-full-access'},turn:{}}};
 assert.equal(restrictedNativeApproval(original,'ask',false),original);
 const restricted=restrictedNativeApproval(original,'ask',true);
 assert.deepEqual(restricted,{thread:{approvalPolicy:'on-request',approvalsReviewer:'user',sandbox:'read-only'},turn:{approvalPolicy:'on-request',approvalsReviewer:'user',sandboxPolicy:{type:'readOnly'}}});
 assert.equal(original.thread.sandbox,'workspace-write');
 for(const mode of ['full','auto','custom'])assert.throws(()=>restrictedNativeApproval(original,mode,true),/requires Ask/);
});
