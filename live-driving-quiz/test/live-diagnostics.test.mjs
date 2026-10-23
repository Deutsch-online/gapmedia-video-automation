import test from 'node:test';
import assert from 'node:assert/strict';
import {liveDiagnostics} from '../live-diagnostics.mjs';
test('live diagnostics distinguish denied access from offline without revealing upstream credentials',()=>{
 const error={config:{requestErrs:[{message:'forbidden secret-token https://private.example',config:{routeId:'html'},response:{statusCode:403,headers:{cookie:'private'}}},{message:'Failed to extract Room ID',config:{routeId:'api'}}]}};
 assert.deepEqual(liveDiagnostics(error),[{reason:'access_denied',route:'html',httpStatus:403},{reason:'missing_room_id',route:'api'}]);
 assert.ok(!JSON.stringify(liveDiagnostics(error)).includes('secret'));
 class UserOfflineError extends Error{};assert.equal(liveDiagnostics(new UserOfflineError())[0].reason,'offline');
});
