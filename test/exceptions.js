/*
 * Based on:
 * https://ethereum.stackexchange.com/questions/48627/how-to-catch-revert-error-in-truffle-test-javascript
 */
const PREFIX = "Returned error: VM Exception while processing transaction: ";
const errTypes = {
  revert            : "revert",
  outOfGas          : "out of gas",
  invalidJump       : "invalid JUMP",
  invalidOpcode     : "invalid opcode",
  stackOverflow     : "stack overflow",
  stackUnderflow    : "stack underflow",
  staticStateChange : "static state change"
}
const tryCatch = async function(promise, errType, reason) {
  try {
      await promise;
      throw null;
  }
  catch (error) {
      assert(error, "Expected an error but did not get one");
      assert(error.message.startsWith(PREFIX + errType + " " + reason), "Expected an error starting with '" + PREFIX + errType + "' but got '" + error.message + "' instead");
  }
};
const tryCatchRevert = async function(promise, reason) {
  tryCatch(promise, errTypes.revert, reason);
};

module.exports.errTypes = errTypes;
module.exports.tryCatch = tryCatch;
module.exports.tryCatchRevert = tryCatchRevert;
