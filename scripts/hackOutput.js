/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of Raver Lights Node.

Raver Lights Node is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Raver Lights Node is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Raver Lights Node.  If not, see <http://www.gnu.org/licenses/>.
*/

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const OUTPUT_FILE = join(__dirname, '..', 'dist', 'output.js');

let source = readFileSync(OUTPUT_FILE).toString();
source = source.replace(
  'var asmGlobalArg =',
  'var asmGlobalArg = module.exports.asmGlobalArg =');
source = source.replace(
  'var asmLibraryArg =',
  'var asmLibraryArg = module.exports.asmLibraryArg =');
source = source.split('\n');

const memoryBaseRegex = /env\['__memory_base'\]\s*=\s*([0-9]*)\;/;
const tableBaseRegex = /env\['__table_base'\]\s*=\s*([0-9]*)\;/

let state = 'scanning';
let initial;
let maximum;
let match;
for (let i = 0; i < source.length; i++) {
  const line = source[i];
  switch (state) {
    case 'scanning':
      if (line.indexOf(`env['table'] = wasmTable = new WebAssembly.Table({`) !== -1) {
        state = 'table';
      }
      match = memoryBaseRegex.exec(line);
      if (match) {
        source.push(`module.exports.memoryBase = ${match[1]}`);
      }
      match = tableBaseRegex.exec(line);
      if (match) {
        source.push(`module.exports.tableBase = ${match[1]}`);
      }
      break;
    case 'table':
      match = line.match(/'initial':\s*([0-9]*)/);
      if (match) {
        initial = match[1];
      }
      match = line.match(/'maximum':\s*([0-9]*)/);
      if (match) {
        maximum = match[1];
      }
      if (line === '  });') {
        state = 'scanning';
      }
      break;
  }
}
source.push(`module.exports.tableInitial = ${initial}`);
source.push(`module.exports.tableMaximum = ${maximum}`);

writeFileSync(OUTPUT_FILE, source.join('\n'));
