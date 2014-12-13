

/**
 * Convenience function for creating a set of actions
 *
 * @param actionNames the names for the actions to be created
 * @returns an object with actions of corresponding action names
 */

var maker = staticJoinCreator;

Reflux.joinTrailing = Reflux.all = maker('last');

Reflux.joinLeading = maker('first');

Reflux.joinStrict = maker('strict');

Reflux.joinConcat = maker('all');



Reflux.createActions = function(actionNames) {
    var i = 0, actions = {};
    for (; i < actionNames.length; i++) {
        actions[actionNames[i]] = Reflux.createAction();
    }
    return actions;
};

/**
 * Sets the eventmitter that Reflux uses
 */
Reflux.setEventEmitter = function(ctx) {
    var _ = utils;
    _.EventEmitter = ctx;
};

/**
 * Sets the method used for deferring actions and stores
 */
Reflux.nextTick = function(nextTick) {
    var _ = utils;
    _.nextTick = nextTick;
};

/**
 * Provides the set of created actions and stores for introspection
 */
Reflux.__keep = Keep;
