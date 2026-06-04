// Reads a value from a `cdk deploy --outputs-file` JSON, for use in CI build scripts.
// Usage: node tools/cdk-output.mjs <outputs.json> <StackName> <OutputKey>
import { readFileSync } from 'node:fs';

const [, , file, stack, key] = process.argv;
if (!file || !stack || !key) {
  console.error('Usage: node tools/cdk-output.mjs <outputs.json> <StackName> <OutputKey>');
  process.exit(2);
}

const outputs = JSON.parse(readFileSync(file, 'utf8'));
const value = outputs?.[stack]?.[key];
if (value == null) {
  console.error(`Output ${key} not found for stack ${stack}`);
  process.exit(1);
}
process.stdout.write(String(value));
