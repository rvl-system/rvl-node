/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of Raver Lights Messaging.

Raver Lights Messaging is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Raver Lights Messaging is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Raver Lights Messaging.  If not, see <http://www.gnu.org/licenses/>.
*/

const { readdirSync, statSync } = require('fs');
const { join } = require('path');
const { spawn } = require('child_process');

const EXPORTED_FUNCTIONS = [
  '_init',
  '_loop',
  '_waveParametersUpdated'
];

const OUTPUT_FILE_NAME = join('dist', 'output.js');

const SRC_DIR = join(__dirname, '..', 'src');
const LIB_DIR = join(__dirname, '..', 'lib');

const sourceFiles = [];
function search(baseDir) {
  const dirContents = readdirSync(baseDir).map((entry) => join(baseDir, entry));
  for (const entry of dirContents) {
    if (entry.endsWith('.cpp') || entry.endsWith('.c') || entry.endsWith('.cc')) {
      sourceFiles.push(entry);
    } else if (statSync(entry).isDirectory()) {
      search(entry);
    }
  }
}
const libraries = readdirSync(LIB_DIR);
libraries.map((name) => join(LIB_DIR, name, 'src')).forEach(search);
search(SRC_DIR);

const args = [
  '-s', 'WASM=1',
  '-s', 'ERROR_ON_UNDEFINED_SYMBOLS=0',
  '-s', 'ENVIRONMENT=node',
  '-s', 'NODEJS_CATCH_EXIT=0',
  '-s', 'DEMANGLE_SUPPORT=1',
  '-s', 'ASSERTIONS=2',
  '-s', `EXPORTED_FUNCTIONS="[${EXPORTED_FUNCTIONS.map((entry) => `'${entry}'`).join(',')}]"`,
  '-std=c++11',
  '-g4',
  '-o', OUTPUT_FILE_NAME,
  ...libraries.map((libName) => join('-Ilib', libName, 'src')),
  '-Isrc',
  ...sourceFiles
];
const buildProcess = spawn('em++', args, {
  cwd: join(__dirname, '..'),
  stdio: 'inherit',
  shell: '/bin/bash'
});

buildProcess.on('exit', (code) => {
  if (code) {
    console.error('Build failed');
    process.exit(code);
    return;
  }
  console.log('done');
});
