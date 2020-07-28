mergeInto(LibraryManager.library, {
  jsLocalClock: function() {
    const { localClock } = require('./nodePlatform');
    return localClock();
  },
  jsPrint: function(msg) {
    const { print } = require('./nodePlatform');
    return print(msg);
  },
  jsPrintln: function(msg) {
    const { println } = require('./nodePlatform');
    return println(msg);
  }
});
