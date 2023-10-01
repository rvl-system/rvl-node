/*
Copyright (c) Bryan Hughes <bryan@nebri.us>

This file is part of RVL Node.

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
const cloneDeep = require('clone-deep');

const SRC_FILE = join(__dirname, '..', 'lib', 'rvl', 'src', 'wave.hpp');
const DIST_FILE = join(__dirname, '..', 'dist', 'structInfo.json');
const ROOT_STRUCT_NAME = 'RVLWaveSettings';

const source = readFileSync(SRC_FILE).toString().split('\n').filter((line) => line.length > 0);
const structRegex = /^struct ([a-zA-Z0-9_]*) \{$/;
const defineRegex = /^\#define ([a-zA-Z0-9_]*) ([0-9]*)$/;
const primitiveRegex = /^\s*([a-zA-Z0-9_]*)\s*([a-zA-Z0-9_]*)\s*(?:\=\s*([0-9]*?))?\;$/;
const arrayRegex = /^\s*([a-zA-Z0-9_]*)\s*([a-zA-Z0-9_]*)\[(.*?)\]\;$/;

const primitiveTypes = {
  'uint8_t': 1,
  'int8_t': 1,
  'uint16_t': 2,
  'int16_t': 2,
  'uint32_t': 4,
  'int32_t': 4
};

let structs = {};
let defines = {};
let currentStruct;
let state = 'scanning';

console.log(`Parsing struct file ${SRC_FILE}`);

for (let i = 0; i < source.length; i++) {
  let match;
  switch (state) {
    case 'scanning':
      match = structRegex.exec(source[i]);
      if (match) {
        state = 'struct';
        currentStruct = match[1];
        structs[currentStruct] = [];
        console.log(`  Parsing struct ${currentStruct}`);
      }
      match = defineRegex.exec(source[i]);
      if (match) {
        defines[match[1]] = parseInt(match[2], 10);
      }
      break;
    case 'struct':
      if (source[i] === '};') {
        state = 'scanning';
      } else {
        match = primitiveRegex.exec(source[i]);
        if (match) {
          const entry = {
            name: match[2],
            type: match[1],
            initialValue: match[3]
          };
          if (entry.initialValue) {
            entry.initialValue = parseInt(entry.initialValue, 10);
          }
          structs[currentStruct].push(entry);
        } else {
          match = arrayRegex.exec(source[i]);
          if (match) {
            const arraySize = defines[match[3]];
            if (!arraySize) {
              throw new Error(`Could not find the preprocessor define for ${match[3]}`);
            }
            structs[currentStruct].push({
              name: match[2],
              type: 'array',
              subType: match[1],
              arraySize
            });
          } else {
            throw new Error(`No matching regex for ${source[i]}`);
          }
        }
      }
      break;
  }
}

console.log('Generating unpacked struct data');

let packingOrder = structs[ROOT_STRUCT_NAME];
let changes = true;
while (changes) {
  changes = false;
  for (let i = packingOrder.length - 1; i >= 0; i--) {
    const entry = packingOrder[i];
    if (entry.type in primitiveTypes) {
      if (!entry.size) {
        entry.size = primitiveTypes[entry.type];
        changes = true;
      }
    } else if (entry.type === 'array') {
      const unrolledEntries = [];
      for (let i = 0; i < entry.arraySize; i++) {
        unrolledEntries.push({
          name: `${entry.name}[${i}]`,
          type: entry.subType,
          initialValue: undefined
        });
      }
      packingOrder.splice(i, 1, ...unrolledEntries);
      changes = true;
    } else {
      const entryType = structs[entry.type];
      if (!entryType) {
        throw new Error(`Unknown compound type ${entry.type}`);
      }
      const replacementEntries = cloneDeep(entryType);
      for (const replacementEntry of replacementEntries) {
        replacementEntry.name = `${entry.name}.${replacementEntry.name}`;
      }
      packingOrder.splice(i, 1, ...replacementEntries);
      changes = true;
    }
  }
}

let totalSize = 0;
let entryDictionary = {};
for (i = 0; i < packingOrder.length; i++) {
  const entry = packingOrder[i];
  if (typeof entry.size !== 'number') {
    throw new Error(`Found unprocessed entry ${entry.name}`);
  }
  entry.index = totalSize;
  totalSize += entry.size;
  entryDictionary[entry.name] = entry;
}

console.log(`Writing results to ${DIST_FILE}`);
writeFileSync(DIST_FILE, JSON.stringify({ totalSize, entryDictionary }, null, '  '));

console.log(`Done. Total unrolled struct size: ${totalSize}\n`);
