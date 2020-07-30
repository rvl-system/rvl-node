mergeInto(LibraryManager.library, {
  jsBeginWrite: function(...args) {
    const { beginWrite } = require('./nodePlatform');
    return beginWrite(...args);
  },
  jsWrite8: function(...args) {
    const { write8 } = require('./nodePlatform');
    return write8(...args);
  },
  jsWrite16: function(...args) {
    const { write16 } = require('./nodePlatform');
    return write16(...args);
  },
  jsWrite32: function(...args) {
    const { write32 } = require('./nodePlatform');
    return write32(...args);
  },
  jsWrite: function(...args) {
    const { write } = require('./nodePlatform');
    return write(...args);
  },
  jsEndWrite: function(...args) {
    const { endWrite } = require('./nodePlatform');
    return endWrite(...args);
  },
  jsParsePacket: function(...args) {
    const { parsePacket } = require('./nodePlatform');
    return parsePacket(...args);
  },
  jsRead8: function(...args) {
    const { read8 } = require('./nodePlatform');
    return read8(...args);
  },
  jsRead16: function(...args) {
    const { read16 } = require('./nodePlatform');
    return read16(...args);
  },
  jsRead32: function(...args) {
    const { read32 } = require('./nodePlatform');
    return read32(...args);
  },
  jsRead: function(...args) {
    const { read } = require('./nodePlatform');
    return read(...args);
  },
  jsGetDeviceId: function(...args) {
    const { getDeviceId } = require('./nodePlatform');
    return getDeviceId(...args);
  },
  jsPrint: function(...args) {
    const { print } = require('./nodePlatform');
    return print(...args);
  },
  jsPrintln: function(...args) {
    const { println } = require('./nodePlatform');
    return println(...args);
  }
});
