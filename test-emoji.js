// Test file to verify emoji detection in CI
// This file contains emojis to test the workflow

const greeting = "Hello World! 👋";
const celebration = "Success! 🎉";
const warning = "Warning! ⚠️";

console.log(greeting);
console.log(celebration);
console.log(warning);

// This should trigger the emoji-lint workflow to fail
export { greeting, celebration, warning };