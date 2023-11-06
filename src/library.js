mergeInto(LibraryManager.library, {
  jsEndWrite: function(...args) {
    const { endWrite } = require('./nodePlatform');
    return endWrite(...args);
  },
  jsParsePacket: function(...args) {
    const { parsePacket } = require('./nodePlatform');
    return parsePacket(...args);
  }
});
