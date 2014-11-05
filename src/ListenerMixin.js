// var _ = require('./utils'),
//     ListenerMethods = require('./ListenerMethods');

/**
 * A module meant to be consumed as a mixin by a React component. Supplies the methods from
 * `ListenerMethods` mixin and takes care of teardown of subscriptions.
 */
Reflux.ListenerMixin = utils.extend({

    /**
     * Cleans up all listener previously registered.
     */
    componentWillUnmount: Reflux.ListenerMethods.stopListeningToAll

}, Reflux.ListenerMethods);
