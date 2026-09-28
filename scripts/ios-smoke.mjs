import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const [appPath, evidencePath] = process.argv.slice(2);
if (process.env.CI !== 'true' || !appPath || !evidencePath || !existsSync(appPath)) {
  throw new Error('Run in CI with the built simulator app and evidence directory.');
}
mkdirSync(evidencePath, { recursive: true });
const simctl = (...args) => execFileSync('xcrun', ['simctl', ...args], {
  encoding: 'utf8', timeout: 180_000, stdio: ['ignore', 'pipe', 'pipe'],
});
const inventory = JSON.parse(simctl('list', 'devices', 'available', '--json'));
const candidates = Object.entries(inventory.devices)
  .filter(([runtime]) => runtime.includes('.SimRuntime.iOS-'))
  .sort(([a], [b]) => b.localeCompare(a, 'en', { numeric: true }))
  .flatMap(([runtime, devices]) => devices
    .filter(device => device.isAvailable && device.name.startsWith('iPhone') && device.state === 'Shutdown')
    .map(device => ({ ...device, runtime })));
const device = candidates[0];
if (!device) throw new Error('No available, shut-down iPhone simulator was found.');
writeFileSync(join(evidencePath, 'device.json'), JSON.stringify(device, null, 2));
console.log(`Launching ${device.name} (${device.runtime})`);
let booted = false;
try {
  simctl('boot', device.udid);
  booted = true;
  simctl('bootstatus', device.udid, '-b');
  simctl('install', device.udid, appPath);
  const launch = simctl('launch', device.udid, 'com.frostyoon.dayjoin');
  writeFileSync(join(evidencePath, 'launch.txt'), launch);
  console.log(launch.trim());
  // Preserve visual evidence after WebKit starts; interaction checks are separate.
  await setTimeout(10_000);
  simctl('io', device.udid, 'screenshot', join(evidencePath, 'first-screen.png'));
} catch (error) {
  writeFileSync(join(evidencePath, 'failure.txt'), `${error.message}\n${error.stderr ?? ''}`);
  throw error;
} finally {
  if (booted) simctl('shutdown', device.udid);
}
