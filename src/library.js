mergeInto(LibraryManager.library, {
  jsEndWrite: function(...args) {
    const { endWrite } = require('./nodePlatform');
    return endWrite(...args);
  },
  jsParsePacket: function(...args) {
    const { parsePacket } = require('./nodePlatform');
    return parsePacket(...args);
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
