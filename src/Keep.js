var Keep = {};

Keep.createdStores = [];

Keep.createdActions = [];

Keep.reset = function() {
    while(exports.createdStores.length) {
        createdStores.pop();
    }
    while(exports.createdActions.length) {
        createdActions.pop();
    }
};
