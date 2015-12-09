!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Exim=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _Actions = require("./Actions");

var Action = _Actions.Action;
var Actions = _Actions.Actions;

var Store = _interopRequire(require("./Store"));

var helpers = _interopRequire(require("./helpers"));

var _DOMHelpers = require("./DOMHelpers");

var createView = _DOMHelpers.createView;
var Router = _DOMHelpers.Router;
var DOM = _DOMHelpers.DOM;

var Exim = { Action: Action, Actions: Actions, Store: Store, Router: Router, DOM: DOM, helpers: helpers, createView: createView };

Exim.createAction = function (args) {
  return new Action(args);
};

Exim.createActions = function (args) {
  return new Actions(args);
};

Exim.createStore = function (args) {
  return new Store(args);
};

module.exports = Exim;

},{"./Actions":8,"./DOMHelpers":9,"./Store":10,"./helpers":11}],2:[function(require,module,exports){
var Freezer = require('./src/freezer');
module.exports = Freezer;
},{"./src/freezer":4}],3:[function(require,module,exports){
'use strict';

var Utils = require( './utils' );

//#build

// The prototype methods are stored in a different object
// and applied as non enumerable properties later
var emitterProto = {
	on: function( eventName, listener, once ){
		var listeners = this._events[ eventName ] || [];

		listeners.push({ callback: listener, once: once});
		this._events[ eventName ] =  listeners;

		return this;
	},

	once: function( eventName, listener ){
		this.on( eventName, listener, true );
	},

	off: function( eventName, listener ){
		if( typeof eventName == 'undefined' ){
			this._events = {};
		}
		else if( typeof listener == 'undefined' ) {
			this._events[ eventName ] = [];
		}
		else {
			var listeners = this._events[ eventName ] || [],
				i
			;

			for (i = listeners.length - 1; i >= 0; i--) {
				if( listeners[i].callback === listener )
					listeners.splice( i, 1 );
			}
		}

		return this;
	},

	trigger: function( eventName ){
		var args = [].slice.call( arguments, 1 ),
			listeners = this._events[ eventName ] || [],
			onceListeners = [],
			i, listener
		;

		// Call listeners
		for (i = 0; i < listeners.length; i++) {
			listener = listeners[i];

			if( listener.callback )
				listener.callback.apply( null, args );
			else {
				// If there is not a callback, remove!
				listener.once = true;
			}

			if( listener.once )
				onceListeners.push( i );
		}

		// Remove listeners marked as once
		for( i = onceListeners.length - 1; i >= 0; i-- ){
			listeners.splice( onceListeners[i], 1 );
		}

		return this;
	}
};

// Methods are not enumerable so, when the stores are
// extended with the emitter, they can be iterated as
// hashmaps
var Emitter = Utils.createNonEnumerable( emitterProto );
//#build

module.exports = Emitter;

},{"./utils":7}],4:[function(require,module,exports){
'use strict';

var Utils = require( './utils.js' ),
	Emitter = require( './emitter' ),
	Mixins = require( './mixins' ),
	Frozen = require( './frozen' )
;

//#build
var Freezer = function( initialValue, options ) {
	var me = this,
		mutable = ( options && options.mutable ) || false,
		live = ( options && options.live ) || live
	;

	// Immutable data
	var frozen;

	var notify = function notify( eventName, node, options ){
		if( eventName == 'listener' )
			return Frozen.createListener( node );

		return Frozen.update( eventName, node, options );
	};

	var freeze = function(){};
	if( !mutable )
		freeze = function( obj ){ Object.freeze( obj ); };

	// Create the frozen object
	frozen = Frozen.freeze( initialValue, notify, freeze, live );

	// Listen to its changes immediately
	var listener = frozen.getListener();

	// Updating flag to trigger the event on nextTick
	var updating = false;

	listener.on( 'immediate', function( prevNode, updated ){
		if( prevNode != frozen )
			return;

		frozen = updated;

		if( live )
			return me.trigger( 'update', updated );

		// Trigger on next tick
		if( !updating ){
			updating = true;
			Utils.nextTick( function(){
				updating = false;
				me.trigger( 'update', frozen );
			});
		}
	});

	Utils.addNE( this, {
		get: function(){
			return frozen;
		},
		set: function( node ){
			var newNode = notify( 'reset', frozen, node );
			newNode.__.listener.trigger( 'immediate', frozen, newNode );
		}
	});

	Utils.addNE( this, { getData: this.get, setData: this.set } );

	// The event store
	this._events = [];
}

Freezer.prototype = Utils.createNonEnumerable({constructor: Freezer}, Emitter);
//#build

module.exports = Freezer;

},{"./emitter":3,"./frozen":5,"./mixins":6,"./utils.js":7}],5:[function(require,module,exports){
'use strict';

var Utils = require( './utils' ),
	Mixins = require( './mixins'),
	Emitter = require('./emitter')
;

//#build
var Frozen = {
	freeze: function( node, notify, freezeFn, live ){
		if( node && node.__ ){
			return node;
		}

		var me = this,
			frozen, mixin, cons
		;

		if( node.constructor == Array ){
			frozen = this.createArray( node.length );
		}
		else {
			frozen = Object.create( Mixins.Hash );
		}

		Utils.addNE( frozen, { __: {
			listener: false,
			parents: [],
			notify: notify,
			dirty: false,
			freezeFn: freezeFn,
			live: live || false
		}});

		// Freeze children
		Utils.each( node, function( child, key ){
			cons = child && child.constructor;
			if( cons == Array || cons == Object ){
				child = me.freeze( child, notify, freezeFn, live );
			}

			if( child && child.__ ){
				me.addParent( child, frozen );
			}

			frozen[ key ] = child;
		});

		freezeFn( frozen );

		return frozen;
	},

	update: function( type, node, options ){
		if( !this[ type ])
			return Utils.error( 'Unknown update type: ' + type );

		return this[ type ]( node, options );
	},

	reset: function( node, value ){
		var me = this,
			_ = node.__,
			frozen
		;

		if( value && value.__ ){
			frozen = value;
			frozen.__.listener = value.__.listener;
			frozen.__.parents = [];

			// Set back the parent on the children
			// that have been updated
			this.fixChildren( frozen, node );
			Utils.each( frozen, function( child ){
				if( child && child.__ ){
					me.removeParent( node );
					me.addParent( child, frozen );
				}
			});
		}
		else {
			frozen = this.freeze( node, _.notify, _.freezeFn, _.live );
		}

		return frozen;
	},

	merge: function( node, attrs ){
		var _ = node.__,
			trans = _.trans,

			// Clone the attrs to not modify the argument
			attrs = Utils.extend( {}, attrs)
		;

		if( trans ){

			for( var attr in attrs )
				trans[ attr ] = attrs[ attr ];
			return node;
		}

		var me = this,
			frozen = this.copyMeta( node ),
			notify = _.notify,
			val, cons, key, isFrozen
		;

		Utils.each( node, function( child, key ){
			isFrozen = child && child.__;

			if( isFrozen ){
				me.removeParent( child, node );
			}

			val = attrs[ key ];
			if( !val ){
				if( isFrozen )
					me.addParent( child, frozen );
				return frozen[ key ] = child;
			}

			cons = val && val.constructor;

			if( cons == Array || cons == Object )
				val = me.freeze( val, notify, _.freezeFn, _.live );

			if( val && val.__ )
				me.addParent( val, frozen );

			delete attrs[ key ];

			frozen[ key ] = val;
		});


		for( key in attrs ) {
			val = attrs[ key ];
			cons = val && val.constructor;

			if( cons == Array || cons == Object )
				val = me.freeze( val, notify, _.freezeFn, _.live );

			if( val && val.__ )
				me.addParent( val, frozen );

			frozen[ key ] = val;
		}

		_.freezeFn( frozen );

		this.refreshParents( node, frozen );

		return frozen;
	},

	replace: function( node, replacement ) {

		var me = this,
			cons = replacement && replacement.constructor,
			_ = node.__,
			frozen = replacement
		;

		if( cons == Array || cons == Object ) {

			frozen = me.freeze( replacement, _.notify, _.freezeFn, _.live );

			frozen.__.parents = _.parents;

			// Add the current listener if exists, replacing a
			// previous listener in the frozen if existed
			if( _.listener )
				frozen.__.listener = _.listener;

			// Since the parents will be refreshed directly,
			// Trigger the listener here
			if( frozen.__.listener )
				this.trigger( frozen, 'update', frozen );
		}

		// Refresh the parent nodes directly
		if( !_.parents.length && _.listener ){
			_.listener.trigger( 'immediate', node, frozen );
		}
		for (var i = _.parents.length - 1; i >= 0; i--) {
			if( i == 0 ){
				this.refresh( _.parents[i], node, frozen, false );
			}
			else{

				this.markDirty( _.parents[i], [node, frozen] );
			}
		}
		return frozen;
	},

	remove: function( node, attrs ){
		var trans = node.__.trans;
		if( trans ){
			for( var l = attrs.length - 1; l >= 0; l-- )
				delete trans[ attrs[l] ];
			return node;
		}

		var me = this,
			frozen = this.copyMeta( node ),
			isFrozen
		;

		Utils.each( node, function( child, key ){
			isFrozen = child && child.__;

			if( isFrozen ){
				me.removeParent( child, node );
			}

			if( attrs.indexOf( key ) != -1 ){
				return;
			}

			if( isFrozen )
				me.addParent( child, frozen );

			frozen[ key ] = child;
		});

		node.__.freezeFn( frozen );
		this.refreshParents( node, frozen );

		return frozen;
	},

	splice: function( node, args ){
		var _ = node.__,
			trans = _.trans
		;

		if( trans ){
			trans.splice.apply( trans, args );
			return node;
		}

		var me = this,
			frozen = this.copyMeta( node ),
			index = args[0],
			deleteIndex = index + args[1],
			con, child
		;

		// Clone the array
		Utils.each( node, function( child, i ){

			if( child && child.__ ){
				me.removeParent( child, node );

				// Skip the nodes to delete
				if( i < index || i>= deleteIndex )
					me.addParent( child, frozen );
			}

			frozen[i] = child;
		});

		// Prepare the new nodes
		if( args.length > 1 ){
			for (var i = args.length - 1; i >= 2; i--) {
				child = args[i];
				con = child && child.constructor;

				if( con == Array || con == Object )
					child = this.freeze( child, _.notify, _.freezeFn, _.live );

				if( child && child.__ )
					this.addParent( child, frozen );

				args[i] = child;
			}
		}

		// splice
		Array.prototype.splice.apply( frozen, args );

		node.__.freezeFn( frozen );
		this.refreshParents( node, frozen );

		return frozen;
	},

	transact: function( node ) {
		var me = this,
			transacting = node.__.trans,
			trans
		;

		if( transacting )
			return transacting;

		trans = node.constructor == Array ? [] : {};

		Utils.each( node, function( child, key ){
			trans[ key ] = child;
		});

		node.__.trans = trans;

		// Call run automatically in case
		// the user forgot about it
		Utils.nextTick( function(){
			if( node.__.trans )
				me.run( node );
		});

		return trans;
	},

	run: function( node ) {
		var me = this,
			trans = node.__.trans
		;

		if( !trans )
			return node;

		// Remove the node as a parent
		Utils.each( trans, function( child, key ){
			if( child && child.__ ){
				me.removeParent( child, node );
			}
		});

		delete node.__.trans;

		var result = this.replace( node, trans );
		return result;
	},

	refresh: function( node, oldChild, newChild, returnUpdated ){
		var me = this,
			trans = node.__.trans,
			found = 0
		;

		if( trans ){

			Utils.each( trans, function( child, key ){
				if( found ) return;

				if( child === oldChild ){

					trans[ key ] = newChild;
					found = 1;

					if( newChild && newChild.__ )
						me.addParent( newChild, node );
				}
			});

			return node;
		}

		var frozen = this.copyMeta( node ),
			dirty = node.__.dirty,
			dirt, replacement, __
		;

		if( dirty ){
			dirt = dirty[0],
			replacement = dirty[1]
		}

		Utils.each( node, function( child, key ){
			if( child === oldChild ){
				child = newChild;
			}
			else if( child === dirt ){
				child = replacement;
			}

			if( child && (__ = child.__) ){

				// If there is a trans happening we
				// don't update a dirty node now. The update
				// will occur on run.
				if( !__.trans && __.dirty ){
					child = me.refresh( child, __.dirty[0], __.dirty[1], true );
				}


				me.removeParent( child, node );
				me.addParent( child, frozen );
			}

			frozen[ key ] = child;
		});

		node.__.freezeFn( frozen );

		// If the node was dirty, clean it
		node.__.dirty = false;

		if( returnUpdated )
			return frozen;

		this.refreshParents( node, frozen );
	},

	fixChildren: function( node, oldNode ){
		var me = this;
		Utils.each( node, function( child ){
			if( !child || !child.__ )
				return;

			// If the child is linked to the node,
			// maybe its children are not linked
			if( child.__.parents.indexOf( node ) != -1 )
				return me.fixChildren( child );

			// If the child wasn't linked it is sure
			// that it wasn't modified. Just link it
			// to the new parent
			if( child.__.parents.length == 1 )
				return child.__.parents = [ node ];

			if( oldNode )
				me.removeParent( child, oldNode );

			me.addParent( child, node );
		});
	},

	copyMeta: function( node ){
		var me = this,
			frozen
		;

		if( node.constructor == Array ){
			frozen = this.createArray( node.length );
		}
		else {
			frozen = Object.create( Mixins.Hash );
		}

		var _ = node.__;

		Utils.addNE( frozen, {__: {
			notify: _.notify,
			listener: _.listener,
			parents: _.parents.slice( 0 ),
			trans: _.trans,
			dirty: false,
			freezeFn: _.freezeFn
		}});

		return frozen;
	},

	refreshParents: function( oldChild, newChild ){
		var _ = oldChild.__,
			i
		;

		if( _.listener )
			this.trigger( newChild, 'update', newChild );

		if( !_.parents.length ){
			if( _.listener ){
				_.listener.trigger( 'immediate', oldChild, newChild );
			}
		}
		else {
			for (i = _.parents.length - 1; i >= 0; i--) {
				// If there is more than one parent, mark everyone as dirty
				// but the last in the iteration, and when the last is refreshed
				// it will update the dirty nodes.
				if( i == 0 )
					this.refresh( _.parents[i], oldChild, newChild, false );
				else{

					this.markDirty( _.parents[i], [oldChild, newChild] );
				}
			}
		}
	},

	markDirty: function( node, dirt ){
		var _ = node.__,
			i
		;
		_.dirty = dirt;

		// If there is a transaction happening in the node
		// update the transaction data immediately
		if( _.trans )
			this.refresh( node, dirt[0], dirt[1] );

		for ( i = _.parents.length - 1; i >= 0; i-- ) {

			this.markDirty( _.parents[i], dirt );
		}
	},

	removeParent: function( node, parent ){
		var parents = node.__.parents,
			index = parents.indexOf( parent )
		;

		if( index != -1 ){
			parents.splice( index, 1 );
		}
	},

	addParent: function( node, parent ){
		var parents = node.__.parents,
			index = parents.indexOf( parent )
		;

		if( index == -1 ){
			parents[ parents.length ] = parent;
		}
	},

	trigger: function( node, eventName, param ){
		var listener = node.__.listener,
			ticking = listener.ticking
		;

		listener.ticking = param;
		if( !ticking ){
			Utils.nextTick( function(){
				var updated = listener.ticking;
				listener.ticking = false;
				listener.trigger( eventName, updated );
			});
		}
	},

	createListener: function( frozen ){
		var l = frozen.__.listener;

		if( !l ) {
			l = Object.create(Emitter, {
				_events: {
					value: {},
					writable: true
				}
			});

			frozen.__.listener = l;
		}

		return l;
	},

	createArray: (function(){
		// Set createArray method
		if( [].__proto__ )
			return function( length ){
				var arr = new Array( length );
				arr.__proto__ = Mixins.List;
				return arr;
			}
		return function( length ){
			var arr = new Array( length ),
				methods = Mixins.arrayMethods
			;
			for( var m in methods ){
				arr[ m ] = methods[ m ];
			}
			return arr;
		}
	})()
};
//#build

module.exports = Frozen;

},{"./emitter":3,"./mixins":6,"./utils":7}],6:[function(require,module,exports){
'use strict';

var Utils = require( './utils.js' );

//#build

/**
 * Creates non-enumerable property descriptors, to be used by Object.create.
 * @param  {Object} attrs Properties to create descriptors
 * @return {Object}       A hash with the descriptors.
 */
var createNE = function( attrs ){
	var ne = {};

	for( var key in attrs ){
		ne[ key ] = {
			writable: true,
			configurable: true,
			enumerable: false,
			value: attrs[ key]
		}
	}

	return ne;
}

var commonMethods = {
	set: function( attr, value ){
		var attrs = attr,
			update = this.__.trans
		;

		if( typeof value != 'undefined' ){
			attrs = {};
			attrs[ attr ] = value;
		}

		if( !update ){
			for( var key in attrs ){
				update = update || this[ key ] != attrs[ key ];
			}

			// No changes, just return the node
			if( !update )
				return this;
		}

		return this.__.notify( 'merge', this, attrs );
	},

	reset: function( attrs ) {
		return this.__.notify( 'replace', this, attrs );
	},

	getListener: function(){
		return this.__.notify( 'listener', this );
	},

	toJS: function(){
		var js;
		if( this.constructor == Array ){
			js = new Array( this.length );
		}
		else {
			js = {};
		}

		Utils.each( this, function( child, i ){
			if( child && child.__ )
				js[ i ] = child.toJS();
			else
				js[ i ] = child;
		});

		return js;
	},

	transact: function(){
		return this.__.notify( 'transact', this );
	},
	run: function(){
		return this.__.notify( 'run', this );
	}
};

var arrayMethods = Utils.extend({
	push: function( el ){
		return this.append( [el] );
	},

	append: function( els ){
		if( els && els.length )
			return this.__.notify( 'splice', this, [this.length, 0].concat( els ) );
		return this;
	},

	pop: function(){
		if( !this.length )
			return this;

		return this.__.notify( 'splice', this, [this.length -1, 1] );
	},

	unshift: function( el ){
		return this.prepend( [el] );
	},

	prepend: function( els ){
		if( els && els.length )
			return this.__.notify( 'splice', this, [0, 0].concat( els ) );
		return this;
	},

	shift: function(){
		if( !this.length )
			return this;

		return this.__.notify( 'splice', this, [0, 1] );
	},

	splice: function( index, toRemove, toAdd ){
		return this.__.notify( 'splice', this, arguments );
	}
}, commonMethods );

var FrozenArray = Object.create( Array.prototype, createNE( arrayMethods ) );

var Mixins = {

Hash: Object.create( Object.prototype, createNE( Utils.extend({
	remove: function( keys ){
		var filtered = [],
			k = keys
		;

		if( keys.constructor != Array )
			k = [ keys ];

		for( var i = 0, l = k.length; i<l; i++ ){
			if( this.hasOwnProperty( k[i] ) )
				filtered.push( k[i] );
		}

		if( filtered.length )
			return this.__.notify( 'remove', this, filtered );
		return this;
	}
}, commonMethods))),

List: FrozenArray,
arrayMethods: arrayMethods
};
//#build

module.exports = Mixins;
},{"./utils.js":7}],7:[function(require,module,exports){
'use strict';

//#build
var global = (new Function("return this")());

var Utils = {
	extend: function( ob, props ){
		for( var p in props ){
			ob[p] = props[p];
		}
		return ob;
	},

	createNonEnumerable: function( obj, proto ){
		var ne = {};
		for( var key in obj )
			ne[key] = {value: obj[key] };
		return Object.create( proto || {}, ne );
	},

	error: function( message ){
		var err = new Error( message );
		if( console )
			return console.error( err );
		else
			throw err;
	},

	each: function( o, clbk ){
		var i,l,keys;
		if( o && o.constructor == Array ){
			for (i = 0, l = o.length; i < l; i++)
				clbk( o[i], i );
		}
		else {
			keys = Object.keys( o );
			for( i = 0, l = keys.length; i < l; i++ )
				clbk( o[ keys[i] ], keys[i] );
		}
	},

	addNE: function( node, attrs ){
		for( var key in attrs ){
			Object.defineProperty( node, key, {
				enumerable: false,
				configurable: true,
				writable: true,
				value: attrs[ key ]
			});
		}
	},

	// nextTick - by stagas / public domain
  	nextTick: (function () {
      var queue = [],
			dirty = false,
			fn,
			hasPostMessage = !!global.postMessage,
			messageName = 'nexttick',
			trigger = (function () {
				return hasPostMessage
					? function trigger () {
					global.postMessage(messageName, '*');
				}
				: function trigger () {
					setTimeout(function () { processQueue() }, 0);
				};
			}()),
			processQueue = (function () {
				return hasPostMessage
					? function processQueue (event) {
						if (event.source === global && event.data === messageName) {
							event.stopPropagation();
							flushQueue();
						}
					}
					: flushQueue;
      	})()
      ;

      function flushQueue () {
          while (fn = queue.shift()) {
              fn();
          }
          dirty = false;
      }

      function nextTick (fn) {
          queue.push(fn);
          if (dirty) return;
          dirty = true;
          trigger();
      }

      if (hasPostMessage) global.addEventListener('message', processQueue, true);

      nextTick.removeListener = function () {
          global.removeEventListener('message', processQueue, true);
      }

      return nextTick;
  })()
};
//#build


module.exports = Utils;
},{}],8:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var Action = exports.Action = (function () {
  function Action(args) {
    _classCallCheck(this, Action);

    var store = args.store;
    var stores = args.stores;
    var allStores = [];

    this.name = args.name;

    if (store) allStores.push(store);
    if (stores) allStores.push.apply(allStores, stores);

    this.stores = allStores;
  }

  _createClass(Action, {
    run: {
      value: function run() {
        var _this = this;

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        var storesCycles = this.stores.map(function (store) {
          return store.runCycle.apply(store, [_this.name].concat(args));
        });
        return Promise.all(storesCycles);
      }
    },
    addStore: {
      value: function addStore(store) {
        this.stores.push(store);
      }
    }
  });

  return Action;
})();

var Actions = exports.Actions = (function () {
  function Actions(actions) {
    var _this = this;

    _classCallCheck(this, Actions);

    this.all = [];
    if (Array.isArray(actions)) {
      actions.forEach(function (action) {
        return _this.addAction(action);
      }, this);
    }
  }

  _createClass(Actions, {
    addAction: {
      value: function addAction(item, noOverride) {
        var action = noOverride ? false : this.detectAction(item);
        if (!noOverride) {
          var old = this[action.name];
          if (old) this.removeAction(old);
          this.all.push(action);
          this[action.name] = action.run.bind(action);
        }

        return action;
      }
    },
    removeAction: {
      value: function removeAction(item) {
        var action = this.detectAction(item, true);
        var index = this.all.indexOf(action);
        if (index !== -1) this.all.splice(index, 1);
        delete this[action.name];
      }
    },
    addStore: {
      value: function addStore(store) {
        this.all.forEach(function (action) {
          return action.addStore(store);
        });
      }
    },
    detectAction: {
      value: function detectAction(action, isOld) {
        if (action.constructor === Action) {
          return action;
        } else if (typeof action === "string") {
          return isOld ? this[action] : new Action({ name: action });
        }
      }
    }
  });

  return Actions;
})();

},{}],9:[function(require,module,exports){
(function (global){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

exports.createView = createView;
Object.defineProperty(exports, "__esModule", {
  value: true
});

var React = _interopRequire((typeof window !== "undefined" ? window['React'] : typeof global !== "undefined" ? global['React'] : null));

var ReactRouter = _interopRequire((typeof window !== "undefined" ? window['ReactRouter'] : typeof global !== "undefined" ? global['ReactRouter'] : null));

function getRouter() {
  var Router = {};
  if (typeof ReactRouter !== "undefined") {
    var routerElements = ["Route", "DefaultRoute", "RouteHandler", "ActiveHandler", "NotFoundRoute", "Link", "Redirect"],
        routerMixins = ["Navigation", "State"],
        routerFunctions = ["create", "createDefaultRoute", "createNotFoundRoute", "createRedirect", "createRoute", "createRoutesFromReactChildren", "run"],
        routerObjects = ["HashLocation", "History", "HistoryLocation", "RefreshLocation", "StaticLocation", "TestLocation", "ImitateBrowserBehavior", "ScrollToTopBehavior"],
        copiedItems = routerMixins.concat(routerFunctions).concat(routerObjects);

    routerElements.forEach(function (name) {
      Router[name] = React.createElement.bind(React, ReactRouter[name]);
    });

    copiedItems.forEach(function (name) {
      Router[name] = ReactRouter[name];
    });
  }
  return Router;
}

function getDOM() {
  var DOMHelpers = {};

  if (typeof React !== "undefined") {
    var tag = function tag(name) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var attributes = undefined;
      var first = args[0] && args[0].constructor;
      if (first === Object) {
        attributes = args.shift();
      } else {
        attributes = {};
      }
      return React.DOM[name].apply(React.DOM, [attributes].concat(args));
    };

    for (var tagName in React.DOM) {
      DOMHelpers[tagName] = tag.bind(this, tagName);
    }

    DOMHelpers.space = function () {
      return React.DOM.span({
        dangerouslySetInnerHTML: {
          __html: "&nbsp;"
        }
      });
    };
  }
  return DOMHelpers;
}

var Router = getRouter();
exports.Router = Router;
var DOM = getDOM();

exports.DOM = DOM;

function createView(classArgs) {
  var ReactClass = React.createClass(classArgs);
  var ReactElement = React.createElement.bind(React.createElement, ReactClass);
  return ReactElement;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9nb3NoYWtray9Qcm9qZWN0cy9vc3MvZXhpbS1mb3JrL3NyYy9ET01IZWxwZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O1FBd0RnQixVQUFVLEdBQVYsVUFBVTs7Ozs7SUF4RG5CLEtBQUssMkJBQU0sT0FBTzs7SUFDbEIsV0FBVywyQkFBTSxjQUFjOztBQUV0QyxTQUFTLFNBQVMsR0FBSTtBQUNwQixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDbEIsTUFBSSxPQUFPLFdBQVcsS0FBSyxXQUFXLEVBQUU7QUFDdEMsUUFBSSxjQUFjLEdBQUcsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUM7UUFDcEgsWUFBWSxHQUFHLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQztRQUN0QyxlQUFlLEdBQUcsQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLCtCQUErQixFQUFFLEtBQUssQ0FBQztRQUNsSixhQUFhLEdBQUcsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxxQkFBcUIsQ0FBQztRQUNwSyxXQUFXLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7O0FBRXpFLGtCQUFjLENBQUMsT0FBTyxDQUFDLFVBQVMsSUFBSSxFQUFFO0FBQ3BDLFlBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDbkUsQ0FBQyxDQUFDOztBQUVILGVBQVcsQ0FBQyxPQUFPLENBQUMsVUFBUyxJQUFJLEVBQUU7QUFDakMsWUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNsQyxDQUFDLENBQUM7R0FDSjtBQUNELFNBQU8sTUFBTSxDQUFDO0NBQ2Y7O0FBRUQsU0FBUyxNQUFNLEdBQUk7QUFDakIsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDOztBQUV0QixNQUFJLE9BQU8sS0FBSyxLQUFLLFdBQVcsRUFBRTtBQUNoQyxRQUFJLEdBQUcsR0FBRyxhQUFVLElBQUksRUFBVzt3Q0FBTixJQUFJO0FBQUosWUFBSTs7O0FBQy9CLFVBQUksVUFBVSxZQUFBLENBQUM7QUFDZixVQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUMzQyxVQUFJLEtBQUssS0FBSyxNQUFNLEVBQUU7QUFDcEIsa0JBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7T0FDM0IsTUFBTTtBQUNMLGtCQUFVLEdBQUcsRUFBRSxDQUFDO09BQ2pCO0FBQ0QsYUFBTyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDcEUsQ0FBQzs7QUFFRixTQUFLLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUU7QUFDN0IsZ0JBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztLQUMvQzs7QUFFRCxjQUFVLENBQUMsS0FBSyxHQUFHLFlBQVc7QUFDNUIsYUFBTyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztBQUNwQiwrQkFBdUIsRUFBRTtBQUN2QixnQkFBTSxFQUFFLFFBQVE7U0FDakI7T0FDRixDQUFDLENBQUM7S0FDSixDQUFDO0dBQ0g7QUFDRCxTQUFPLFVBQVUsQ0FBQztDQUNuQjs7QUFFTSxJQUFNLE1BQU0sR0FBRyxTQUFTLEVBQUUsQ0FBQztRQUFyQixNQUFNLEdBQU4sTUFBTTtBQUNaLElBQU0sR0FBRyxHQUFHLE1BQU0sRUFBRSxDQUFDOztRQUFmLEdBQUcsR0FBSCxHQUFHOztBQUVULFNBQVMsVUFBVSxDQUFFLFNBQVMsRUFBRTtBQUNyQyxNQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzlDLE1BQUksWUFBWSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDN0UsU0FBTyxZQUFZLENBQUM7Q0FDckIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgUmVhY3RSb3V0ZXIgZnJvbSAncmVhY3Qtcm91dGVyJztcblxuZnVuY3Rpb24gZ2V0Um91dGVyICgpIHtcbiAgY29uc3QgUm91dGVyID0ge307XG4gIGlmICh0eXBlb2YgUmVhY3RSb3V0ZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbGV0IHJvdXRlckVsZW1lbnRzID0gWydSb3V0ZScsICdEZWZhdWx0Um91dGUnLCAnUm91dGVIYW5kbGVyJywgJ0FjdGl2ZUhhbmRsZXInLCAnTm90Rm91bmRSb3V0ZScsICdMaW5rJywgJ1JlZGlyZWN0J10sXG4gICAgcm91dGVyTWl4aW5zID0gWydOYXZpZ2F0aW9uJywgJ1N0YXRlJ10sXG4gICAgcm91dGVyRnVuY3Rpb25zID0gWydjcmVhdGUnLCAnY3JlYXRlRGVmYXVsdFJvdXRlJywgJ2NyZWF0ZU5vdEZvdW5kUm91dGUnLCAnY3JlYXRlUmVkaXJlY3QnLCAnY3JlYXRlUm91dGUnLCAnY3JlYXRlUm91dGVzRnJvbVJlYWN0Q2hpbGRyZW4nLCAncnVuJ10sXG4gICAgcm91dGVyT2JqZWN0cyA9IFsnSGFzaExvY2F0aW9uJywgJ0hpc3RvcnknLCAnSGlzdG9yeUxvY2F0aW9uJywgJ1JlZnJlc2hMb2NhdGlvbicsICdTdGF0aWNMb2NhdGlvbicsICdUZXN0TG9jYXRpb24nLCAnSW1pdGF0ZUJyb3dzZXJCZWhhdmlvcicsICdTY3JvbGxUb1RvcEJlaGF2aW9yJ10sXG4gICAgY29waWVkSXRlbXMgPSByb3V0ZXJNaXhpbnMuY29uY2F0KHJvdXRlckZ1bmN0aW9ucykuY29uY2F0KHJvdXRlck9iamVjdHMpO1xuXG4gICAgcm91dGVyRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XG4gICAgICBSb3V0ZXJbbmFtZV0gPSBSZWFjdC5jcmVhdGVFbGVtZW50LmJpbmQoUmVhY3QsIFJlYWN0Um91dGVyW25hbWVdKTtcbiAgICB9KTtcblxuICAgIGNvcGllZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgUm91dGVyW25hbWVdID0gUmVhY3RSb3V0ZXJbbmFtZV07XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIFJvdXRlcjtcbn1cblxuZnVuY3Rpb24gZ2V0RE9NICgpIHtcbiAgY29uc3QgRE9NSGVscGVycyA9IHt9O1xuXG4gIGlmICh0eXBlb2YgUmVhY3QgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbGV0IHRhZyA9IGZ1bmN0aW9uIChuYW1lLCAuLi5hcmdzKSB7XG4gICAgICBsZXQgYXR0cmlidXRlcztcbiAgICAgIGxldCBmaXJzdCA9IGFyZ3NbMF0gJiYgYXJnc1swXS5jb25zdHJ1Y3RvcjtcbiAgICAgIGlmIChmaXJzdCA9PT0gT2JqZWN0KSB7XG4gICAgICAgIGF0dHJpYnV0ZXMgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhdHRyaWJ1dGVzID0ge307XG4gICAgICB9XG4gICAgICByZXR1cm4gUmVhY3QuRE9NW25hbWVdLmFwcGx5KFJlYWN0LkRPTSwgW2F0dHJpYnV0ZXNdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcblxuICAgIGZvciAobGV0IHRhZ05hbWUgaW4gUmVhY3QuRE9NKSB7XG4gICAgICBET01IZWxwZXJzW3RhZ05hbWVdID0gdGFnLmJpbmQodGhpcywgdGFnTmFtZSk7XG4gICAgfVxuXG4gICAgRE9NSGVscGVycy5zcGFjZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIFJlYWN0LkRPTS5zcGFuKHtcbiAgICAgICAgZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw6IHtcbiAgICAgICAgICBfX2h0bWw6ICcmbmJzcDsnXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIERPTUhlbHBlcnM7XG59XG5cbmV4cG9ydCBjb25zdCBSb3V0ZXIgPSBnZXRSb3V0ZXIoKTtcbmV4cG9ydCBjb25zdCBET00gPSBnZXRET00oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVZpZXcgKGNsYXNzQXJncykge1xuICBsZXQgUmVhY3RDbGFzcyA9IFJlYWN0LmNyZWF0ZUNsYXNzKGNsYXNzQXJncyk7XG4gIGxldCBSZWFjdEVsZW1lbnQgPSBSZWFjdC5jcmVhdGVFbGVtZW50LmJpbmQoUmVhY3QuY3JlYXRlRWxlbWVudCwgUmVhY3RDbGFzcyk7XG4gIHJldHVybiBSZWFjdEVsZW1lbnQ7XG59XG4iXX0=
},{}],10:[function(require,module,exports){
"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var Actions = require("./Actions").Actions;

var utils = _interopRequire(require("./utils"));

var Freezer = _interopRequire(require("freezer-js"));

var getConnectMixin = _interopRequire(require("./mixins/connect"));

var Store = (function () {
  function Store() {
    var args = arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Store);

    var actions = args.actions;
    var initial = args.initial;

    var init = typeof initial === "function" ? initial() : initial;
    var store = new Freezer(init || {});

    this.connect = function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return getConnectMixin(this, args);
    };

    this.handlers = args.handlers || utils.getWithoutFields(["actions"], args) || {};

    if (Array.isArray(actions)) {
      this.actions = actions = new Actions(actions);
      this.actions.addStore(this);
    }

    var set = function set(item, value) {
      store.get().set(item, value);
    };

    var get = (function (_get) {
      var _getWrapper = function get(_x) {
        return _get.apply(this, arguments);
      };

      _getWrapper.toString = function () {
        return _get.toString();
      };

      return _getWrapper;
    })(function (item) {
      if (typeof item === "string" || typeof item === "number") {
        return store.get().toJS()[item];
      } else if (Array.isArray(item)) {
        return item.map(function (key) {
          return get(key);
        });
      } else {
        return store.get();
      }
    });

    var reset = function reset() {
      this.set(init);
    };

    this.set = set;
    this.get = get;
    this.reset = reset;
    this.store = store;

    this.stateProto = { set: set, get: get, reset: reset, actions: actions };
    //this.getter = new Getter(this);
    return this;
  }

  _createClass(Store, {
    addAction: {
      value: function addAction(item) {
        if (Array.isArray(item)) {
          this.actions = this.actions.concat(this.actions);
        } else if (typeof item === "object") {
          this.actions.push(item);
        }
      }
    },
    removeAction: {
      value: function removeAction(item) {
        var action;
        if (typeof item === "string") {
          action = this.findByName("actions", "name", item);
          if (action) action.removeStore(this);
        } else if (typeof item === "object") {
          action = item;
          var index = this.actions.indexOf(action);
          if (index !== -1) {
            action.removeStore(this);
            this.actions = this.actions.splice(index, 1);
          }
        }
      }
    },
    getActionCycle: {
      value: function getActionCycle(actionName) {
        var prefix = arguments[1] === undefined ? "on" : arguments[1];

        var capitalized = utils.capitalize(actionName);
        var fullActionName = "" + prefix + "" + capitalized;
        var handler = this.handlers[fullActionName] || this.handlers[actionName];
        if (!handler) {
          throw new Error("No handlers for " + actionName + " action defined in current store");
        }

        var actions = undefined;
        if (typeof handler === "object") {
          actions = handler;
        } else if (typeof handler === "function") {
          actions = { on: handler };
        } else {
          throw new Error("" + handler + " must be an object or function");
        }
        return actions;
      }
    },
    runCycle: {

      // 1. will(initial) => willResult
      // 2. while(true)
      // 3. on(willResult || initial) => onResult
      // 4. while(false)
      // 5. did(onResult)

      value: function runCycle(actionName) {
        var _this = this;

        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        // new Promise(resolve => resolve(true))
        var cycle = this.getActionCycle(actionName);
        var promise = Promise.resolve();
        var will = cycle.will,
            while_ = cycle["while"],
            on_ = cycle.on;
        var did = cycle.did,
            didNot = cycle.didNot;

        // Local state for this cycle.
        var state = Object.create(this.stateProto);

        // Pre-check & preparations.
        if (will) promise = promise.then(function () {
          return will.apply(state, args);
        });

        // Start while().
        if (while_) promise = promise.then(function (willResult) {
          while_.call(state, true);
          return willResult;
        });

        // Actual execution.
        promise = promise.then(function (willResult) {
          if (willResult == null) {
            return on_.apply(state, args);
          } else {
            return on_.call(state, willResult);
          }
        });

        // Stop while().
        if (while_) promise = promise.then(function (onResult) {
          while_.call(state, false);
          return onResult;
        });

        // For did and didNot state is freezed.
        promise = promise.then(function (onResult) {
          Object.freeze(state);
          return onResult;
        });

        // Handle the result.
        if (did) promise = promise.then(function (onResult) {
          return did.call(state, onResult);
        });

        promise["catch"](function (error) {
          if (while_) while_.call(_this, state, false);
          if (didNot) {
            didNot.call(state, error);
          } else {
            throw error;
          }
        });

        return promise;
      }
    }
  });

  return Store;
})();

module.exports = Store;

},{"./Actions":8,"./mixins/connect":12,"./utils":13,"freezer-js":2}],11:[function(require,module,exports){
"use strict";

module.exports = {
  cx: function cx(classNames) {
    if (typeof classNames == "object") {
      return Object.keys(classNames).filter(function (className) {
        return classNames[className];
      }).join(" ");
    } else {
      return Array.prototype.join.call(arguments, " ");
    }
  }
};

},{}],12:[function(require,module,exports){
"use strict";

module.exports = getConnectMixin;

function getConnectMixin(store) {
  for (var _len = arguments.length, keys = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    keys[_key - 1] = arguments[_key];
  }

  var changeCallback = function changeCallback(state) {
    this.setState(state.toJS());
  };

  var listener = undefined;

  return {
    getInitialState: function getInitialState() {
      var state = store.get(keys);

      if (!this.boundEximChangeCallbacks) this.boundEximChangeCallbacks = {};

      this.boundEximChangeCallbacks[store] = changeCallback.bind(this);

      listener = store.store.get().getListener();
      return state;
    },

    componentDidMount: function componentDidMount() {
      listener.on("update", this.boundEximChangeCallbacks[store]);
    },

    componentWillUnmount: function componentWillUnmount() {
      if (listener) listener.off("update", this.boundEximChangeCallbacks[store]);
    }
  };
}

},{}],13:[function(require,module,exports){
"use strict";

var utils = {};

utils.getWithoutFields = function (outcast, target) {
  if (!target) throw new Error("TypeError: target is not an object.");
  var result = {};
  if (typeof outcast === "string") outcast = [outcast];
  var tKeys = Object.keys(target);
  outcast.forEach(function (fieldName) {
    tKeys.filter(function (key) {
      return key !== fieldName;
    }).forEach(function (key) {
      result[key] = target[key];
    });
  });
  return result;
};

utils.objectToArray = function (object) {
  return Object.keys(object).map(function (key) {
    return object[key];
  });
};

utils.classWithArgs = function (Item, args) {
  return Item.bind.apply(Item, [Item].concat(args));
};

// 1. will
// 2. while(true)
// 3. on
// 4. while(false)
// 5. did or didNot
utils.mapActionNames = function (object) {
  var list = [];
  var prefixes = ["will", "whileStart", "on", "whileEnd", "did", "didNot"];
  prefixes.forEach(function (item) {
    var name = item;
    if (item === "whileStart" || item === "whileEnd") {
      name = "while";
    }
    if (object[name]) {
      list.push([item, object[name]]);
    }
  });
  return list;
};

utils.isObject = function (targ) {
  return targ ? targ.toString().slice(8, 14) === "Object" : false;
};
utils.capitalize = function (str) {
  var first = str.charAt(0).toUpperCase();
  var rest = str.slice(1);
  return "" + first + "" + rest;
};

module.exports = utils;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ29zaGFra2svUHJvamVjdHMvb3NzL2V4aW0tZm9yay9zcmMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZnJlZXplci1qcy9mcmVlemVyLmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvc3JjL2VtaXR0ZXIuanMiLCJub2RlX21vZHVsZXMvZnJlZXplci1qcy9zcmMvZnJlZXplci5qcyIsIm5vZGVfbW9kdWxlcy9mcmVlemVyLWpzL3NyYy9mcm96ZW4uanMiLCJub2RlX21vZHVsZXMvZnJlZXplci1qcy9zcmMvbWl4aW5zLmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvc3JjL3V0aWxzLmpzIiwiL1VzZXJzL2dvc2hha2trL1Byb2plY3RzL29zcy9leGltLWZvcmsvc3JjL0FjdGlvbnMuanMiLCJzcmMvRE9NSGVscGVycy5qcyIsIi9Vc2Vycy9nb3NoYWtray9Qcm9qZWN0cy9vc3MvZXhpbS1mb3JrL3NyYy9TdG9yZS5qcyIsIi9Vc2Vycy9nb3NoYWtray9Qcm9qZWN0cy9vc3MvZXhpbS1mb3JrL3NyYy9oZWxwZXJzLmpzIiwiL1VzZXJzL2dvc2hha2trL1Byb2plY3RzL29zcy9leGltLWZvcmsvc3JjL21peGlucy9jb25uZWN0LmpzIiwiL1VzZXJzL2dvc2hha2trL1Byb2plY3RzL29zcy9leGltLWZvcmsvc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozt1QkNBOEIsV0FBVzs7SUFBakMsTUFBTSxZQUFOLE1BQU07SUFBRSxPQUFPLFlBQVAsT0FBTzs7SUFDaEIsS0FBSywyQkFBTSxTQUFTOztJQUNwQixPQUFPLDJCQUFNLFdBQVc7OzBCQUNPLGNBQWM7O0lBQTVDLFVBQVUsZUFBVixVQUFVO0lBQUUsTUFBTSxlQUFOLE1BQU07SUFBRSxHQUFHLGVBQUgsR0FBRzs7QUFFL0IsSUFBTSxJQUFJLEdBQUcsRUFBQyxNQUFNLEVBQU4sTUFBTSxFQUFFLE9BQU8sRUFBUCxPQUFPLEVBQUUsS0FBSyxFQUFMLEtBQUssRUFBRSxNQUFNLEVBQU4sTUFBTSxFQUFFLEdBQUcsRUFBSCxHQUFHLEVBQUUsT0FBTyxFQUFQLE9BQU8sRUFBRSxVQUFVLEVBQVYsVUFBVSxFQUFDLENBQUM7O0FBRXhFLElBQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDbEMsU0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUN6QixDQUFDOztBQUVGLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDbkMsU0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUMxQixDQUFDOztBQUVGLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDakMsU0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUN4QixDQUFDOztpQkFFYSxJQUFJOzs7QUNuQm5CO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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SyxDQUFDO0NBQ2hFLENBQUM7QUFDRixLQUFLLENBQUMsVUFBVSxHQUFHLFVBQVUsR0FBRyxFQUFFO0FBQ2hDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixjQUFVLEtBQUssUUFBRyxJQUFJLENBQUc7Q0FDMUIsQ0FBQzs7aUJBRWEsS0FBSyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQge0FjdGlvbiwgQWN0aW9uc30gZnJvbSAnLi9BY3Rpb25zJztcbmltcG9ydCBTdG9yZSBmcm9tICcuL1N0b3JlJztcbmltcG9ydCBoZWxwZXJzIGZyb20gJy4vaGVscGVycyc7XG5pbXBvcnQge2NyZWF0ZVZpZXcsIFJvdXRlciwgRE9NfSBmcm9tICcuL0RPTUhlbHBlcnMnO1xuXG5jb25zdCBFeGltID0ge0FjdGlvbiwgQWN0aW9ucywgU3RvcmUsIFJvdXRlciwgRE9NLCBoZWxwZXJzLCBjcmVhdGVWaWV3fTtcblxuRXhpbS5jcmVhdGVBY3Rpb24gPSBmdW5jdGlvbiAoYXJncykge1xuICByZXR1cm4gbmV3IEFjdGlvbihhcmdzKTtcbn07XG5cbkV4aW0uY3JlYXRlQWN0aW9ucyA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gIHJldHVybiBuZXcgQWN0aW9ucyhhcmdzKTtcbn07XG5cbkV4aW0uY3JlYXRlU3RvcmUgPSBmdW5jdGlvbiAoYXJncykge1xuICByZXR1cm4gbmV3IFN0b3JlKGFyZ3MpO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgRXhpbTtcbiIsInZhciBGcmVlemVyID0gcmVxdWlyZSgnLi9zcmMvZnJlZXplcicpO1xubW9kdWxlLmV4cG9ydHMgPSBGcmVlemVyOyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBVdGlscyA9IHJlcXVpcmUoICcuL3V0aWxzJyApO1xyXG5cclxuLy8jYnVpbGRcclxuXHJcbi8vIFRoZSBwcm90b3R5cGUgbWV0aG9kcyBhcmUgc3RvcmVkIGluIGEgZGlmZmVyZW50IG9iamVjdFxyXG4vLyBhbmQgYXBwbGllZCBhcyBub24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzIGxhdGVyXHJcbnZhciBlbWl0dGVyUHJvdG8gPSB7XHJcblx0b246IGZ1bmN0aW9uKCBldmVudE5hbWUsIGxpc3RlbmVyLCBvbmNlICl7XHJcblx0XHR2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzWyBldmVudE5hbWUgXSB8fCBbXTtcclxuXHJcblx0XHRsaXN0ZW5lcnMucHVzaCh7IGNhbGxiYWNrOiBsaXN0ZW5lciwgb25jZTogb25jZX0pO1xyXG5cdFx0dGhpcy5fZXZlbnRzWyBldmVudE5hbWUgXSA9ICBsaXN0ZW5lcnM7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0b25jZTogZnVuY3Rpb24oIGV2ZW50TmFtZSwgbGlzdGVuZXIgKXtcclxuXHRcdHRoaXMub24oIGV2ZW50TmFtZSwgbGlzdGVuZXIsIHRydWUgKTtcclxuXHR9LFxyXG5cclxuXHRvZmY6IGZ1bmN0aW9uKCBldmVudE5hbWUsIGxpc3RlbmVyICl7XHJcblx0XHRpZiggdHlwZW9mIGV2ZW50TmFtZSA9PSAndW5kZWZpbmVkJyApe1xyXG5cdFx0XHR0aGlzLl9ldmVudHMgPSB7fTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoIHR5cGVvZiBsaXN0ZW5lciA9PSAndW5kZWZpbmVkJyApIHtcclxuXHRcdFx0dGhpcy5fZXZlbnRzWyBldmVudE5hbWUgXSA9IFtdO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbIGV2ZW50TmFtZSBdIHx8IFtdLFxyXG5cdFx0XHRcdGlcclxuXHRcdFx0O1xyXG5cclxuXHRcdFx0Zm9yIChpID0gbGlzdGVuZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRcdFx0aWYoIGxpc3RlbmVyc1tpXS5jYWxsYmFjayA9PT0gbGlzdGVuZXIgKVxyXG5cdFx0XHRcdFx0bGlzdGVuZXJzLnNwbGljZSggaSwgMSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0dHJpZ2dlcjogZnVuY3Rpb24oIGV2ZW50TmFtZSApe1xyXG5cdFx0dmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKCBhcmd1bWVudHMsIDEgKSxcclxuXHRcdFx0bGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzWyBldmVudE5hbWUgXSB8fCBbXSxcclxuXHRcdFx0b25jZUxpc3RlbmVycyA9IFtdLFxyXG5cdFx0XHRpLCBsaXN0ZW5lclxyXG5cdFx0O1xyXG5cclxuXHRcdC8vIENhbGwgbGlzdGVuZXJzXHJcblx0XHRmb3IgKGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGxpc3RlbmVyID0gbGlzdGVuZXJzW2ldO1xyXG5cclxuXHRcdFx0aWYoIGxpc3RlbmVyLmNhbGxiYWNrIClcclxuXHRcdFx0XHRsaXN0ZW5lci5jYWxsYmFjay5hcHBseSggbnVsbCwgYXJncyApO1xyXG5cdFx0XHRlbHNlIHtcclxuXHRcdFx0XHQvLyBJZiB0aGVyZSBpcyBub3QgYSBjYWxsYmFjaywgcmVtb3ZlIVxyXG5cdFx0XHRcdGxpc3RlbmVyLm9uY2UgPSB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiggbGlzdGVuZXIub25jZSApXHJcblx0XHRcdFx0b25jZUxpc3RlbmVycy5wdXNoKCBpICk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGxpc3RlbmVycyBtYXJrZWQgYXMgb25jZVxyXG5cdFx0Zm9yKCBpID0gb25jZUxpc3RlbmVycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSApe1xyXG5cdFx0XHRsaXN0ZW5lcnMuc3BsaWNlKCBvbmNlTGlzdGVuZXJzW2ldLCAxICk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fVxyXG59O1xyXG5cclxuLy8gTWV0aG9kcyBhcmUgbm90IGVudW1lcmFibGUgc28sIHdoZW4gdGhlIHN0b3JlcyBhcmVcclxuLy8gZXh0ZW5kZWQgd2l0aCB0aGUgZW1pdHRlciwgdGhleSBjYW4gYmUgaXRlcmF0ZWQgYXNcclxuLy8gaGFzaG1hcHNcclxudmFyIEVtaXR0ZXIgPSBVdGlscy5jcmVhdGVOb25FbnVtZXJhYmxlKCBlbWl0dGVyUHJvdG8gKTtcclxuLy8jYnVpbGRcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFV0aWxzID0gcmVxdWlyZSggJy4vdXRpbHMuanMnICksXHJcblx0RW1pdHRlciA9IHJlcXVpcmUoICcuL2VtaXR0ZXInICksXHJcblx0TWl4aW5zID0gcmVxdWlyZSggJy4vbWl4aW5zJyApLFxyXG5cdEZyb3plbiA9IHJlcXVpcmUoICcuL2Zyb3plbicgKVxyXG47XHJcblxyXG4vLyNidWlsZFxyXG52YXIgRnJlZXplciA9IGZ1bmN0aW9uKCBpbml0aWFsVmFsdWUsIG9wdGlvbnMgKSB7XHJcblx0dmFyIG1lID0gdGhpcyxcclxuXHRcdG11dGFibGUgPSAoIG9wdGlvbnMgJiYgb3B0aW9ucy5tdXRhYmxlICkgfHwgZmFsc2UsXHJcblx0XHRsaXZlID0gKCBvcHRpb25zICYmIG9wdGlvbnMubGl2ZSApIHx8IGxpdmVcclxuXHQ7XHJcblxyXG5cdC8vIEltbXV0YWJsZSBkYXRhXHJcblx0dmFyIGZyb3plbjtcclxuXHJcblx0dmFyIG5vdGlmeSA9IGZ1bmN0aW9uIG5vdGlmeSggZXZlbnROYW1lLCBub2RlLCBvcHRpb25zICl7XHJcblx0XHRpZiggZXZlbnROYW1lID09ICdsaXN0ZW5lcicgKVxyXG5cdFx0XHRyZXR1cm4gRnJvemVuLmNyZWF0ZUxpc3RlbmVyKCBub2RlICk7XHJcblxyXG5cdFx0cmV0dXJuIEZyb3plbi51cGRhdGUoIGV2ZW50TmFtZSwgbm9kZSwgb3B0aW9ucyApO1xyXG5cdH07XHJcblxyXG5cdHZhciBmcmVlemUgPSBmdW5jdGlvbigpe307XHJcblx0aWYoICFtdXRhYmxlIClcclxuXHRcdGZyZWV6ZSA9IGZ1bmN0aW9uKCBvYmogKXsgT2JqZWN0LmZyZWV6ZSggb2JqICk7IH07XHJcblxyXG5cdC8vIENyZWF0ZSB0aGUgZnJvemVuIG9iamVjdFxyXG5cdGZyb3plbiA9IEZyb3plbi5mcmVlemUoIGluaXRpYWxWYWx1ZSwgbm90aWZ5LCBmcmVlemUsIGxpdmUgKTtcclxuXHJcblx0Ly8gTGlzdGVuIHRvIGl0cyBjaGFuZ2VzIGltbWVkaWF0ZWx5XHJcblx0dmFyIGxpc3RlbmVyID0gZnJvemVuLmdldExpc3RlbmVyKCk7XHJcblxyXG5cdC8vIFVwZGF0aW5nIGZsYWcgdG8gdHJpZ2dlciB0aGUgZXZlbnQgb24gbmV4dFRpY2tcclxuXHR2YXIgdXBkYXRpbmcgPSBmYWxzZTtcclxuXHJcblx0bGlzdGVuZXIub24oICdpbW1lZGlhdGUnLCBmdW5jdGlvbiggcHJldk5vZGUsIHVwZGF0ZWQgKXtcclxuXHRcdGlmKCBwcmV2Tm9kZSAhPSBmcm96ZW4gKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0ZnJvemVuID0gdXBkYXRlZDtcclxuXHJcblx0XHRpZiggbGl2ZSApXHJcblx0XHRcdHJldHVybiBtZS50cmlnZ2VyKCAndXBkYXRlJywgdXBkYXRlZCApO1xyXG5cclxuXHRcdC8vIFRyaWdnZXIgb24gbmV4dCB0aWNrXHJcblx0XHRpZiggIXVwZGF0aW5nICl7XHJcblx0XHRcdHVwZGF0aW5nID0gdHJ1ZTtcclxuXHRcdFx0VXRpbHMubmV4dFRpY2soIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dXBkYXRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRtZS50cmlnZ2VyKCAndXBkYXRlJywgZnJvemVuICk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRVdGlscy5hZGRORSggdGhpcywge1xyXG5cdFx0Z2V0OiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdFx0fSxcclxuXHRcdHNldDogZnVuY3Rpb24oIG5vZGUgKXtcclxuXHRcdFx0dmFyIG5ld05vZGUgPSBub3RpZnkoICdyZXNldCcsIGZyb3plbiwgbm9kZSApO1xyXG5cdFx0XHRuZXdOb2RlLl9fLmxpc3RlbmVyLnRyaWdnZXIoICdpbW1lZGlhdGUnLCBmcm96ZW4sIG5ld05vZGUgKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0VXRpbHMuYWRkTkUoIHRoaXMsIHsgZ2V0RGF0YTogdGhpcy5nZXQsIHNldERhdGE6IHRoaXMuc2V0IH0gKTtcclxuXHJcblx0Ly8gVGhlIGV2ZW50IHN0b3JlXHJcblx0dGhpcy5fZXZlbnRzID0gW107XHJcbn1cclxuXHJcbkZyZWV6ZXIucHJvdG90eXBlID0gVXRpbHMuY3JlYXRlTm9uRW51bWVyYWJsZSh7Y29uc3RydWN0b3I6IEZyZWV6ZXJ9LCBFbWl0dGVyKTtcclxuLy8jYnVpbGRcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRnJlZXplcjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFV0aWxzID0gcmVxdWlyZSggJy4vdXRpbHMnICksXHJcblx0TWl4aW5zID0gcmVxdWlyZSggJy4vbWl4aW5zJyksXHJcblx0RW1pdHRlciA9IHJlcXVpcmUoJy4vZW1pdHRlcicpXHJcbjtcclxuXHJcbi8vI2J1aWxkXHJcbnZhciBGcm96ZW4gPSB7XHJcblx0ZnJlZXplOiBmdW5jdGlvbiggbm9kZSwgbm90aWZ5LCBmcmVlemVGbiwgbGl2ZSApe1xyXG5cdFx0aWYoIG5vZGUgJiYgbm9kZS5fXyApe1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW4sIG1peGluLCBjb25zXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIG5vZGUuY29uc3RydWN0b3IgPT0gQXJyYXkgKXtcclxuXHRcdFx0ZnJvemVuID0gdGhpcy5jcmVhdGVBcnJheSggbm9kZS5sZW5ndGggKTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRmcm96ZW4gPSBPYmplY3QuY3JlYXRlKCBNaXhpbnMuSGFzaCApO1xyXG5cdFx0fVxyXG5cclxuXHRcdFV0aWxzLmFkZE5FKCBmcm96ZW4sIHsgX186IHtcclxuXHRcdFx0bGlzdGVuZXI6IGZhbHNlLFxyXG5cdFx0XHRwYXJlbnRzOiBbXSxcclxuXHRcdFx0bm90aWZ5OiBub3RpZnksXHJcblx0XHRcdGRpcnR5OiBmYWxzZSxcclxuXHRcdFx0ZnJlZXplRm46IGZyZWV6ZUZuLFxyXG5cdFx0XHRsaXZlOiBsaXZlIHx8IGZhbHNlXHJcblx0XHR9fSk7XHJcblxyXG5cdFx0Ly8gRnJlZXplIGNoaWxkcmVuXHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRjb25zID0gY2hpbGQgJiYgY2hpbGQuY29uc3RydWN0b3I7XHJcblx0XHRcdGlmKCBjb25zID09IEFycmF5IHx8IGNvbnMgPT0gT2JqZWN0ICl7XHJcblx0XHRcdFx0Y2hpbGQgPSBtZS5mcmVlemUoIGNoaWxkLCBub3RpZnksIGZyZWV6ZUZuLCBsaXZlICk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApe1xyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmcm96ZW5bIGtleSBdID0gY2hpbGQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRmcmVlemVGbiggZnJvemVuICk7XHJcblxyXG5cdFx0cmV0dXJuIGZyb3plbjtcclxuXHR9LFxyXG5cclxuXHR1cGRhdGU6IGZ1bmN0aW9uKCB0eXBlLCBub2RlLCBvcHRpb25zICl7XHJcblx0XHRpZiggIXRoaXNbIHR5cGUgXSlcclxuXHRcdFx0cmV0dXJuIFV0aWxzLmVycm9yKCAnVW5rbm93biB1cGRhdGUgdHlwZTogJyArIHR5cGUgKTtcclxuXHJcblx0XHRyZXR1cm4gdGhpc1sgdHlwZSBdKCBub2RlLCBvcHRpb25zICk7XHJcblx0fSxcclxuXHJcblx0cmVzZXQ6IGZ1bmN0aW9uKCBub2RlLCB2YWx1ZSApe1xyXG5cdFx0dmFyIG1lID0gdGhpcyxcclxuXHRcdFx0XyA9IG5vZGUuX18sXHJcblx0XHRcdGZyb3plblxyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCB2YWx1ZSAmJiB2YWx1ZS5fXyApe1xyXG5cdFx0XHRmcm96ZW4gPSB2YWx1ZTtcclxuXHRcdFx0ZnJvemVuLl9fLmxpc3RlbmVyID0gdmFsdWUuX18ubGlzdGVuZXI7XHJcblx0XHRcdGZyb3plbi5fXy5wYXJlbnRzID0gW107XHJcblxyXG5cdFx0XHQvLyBTZXQgYmFjayB0aGUgcGFyZW50IG9uIHRoZSBjaGlsZHJlblxyXG5cdFx0XHQvLyB0aGF0IGhhdmUgYmVlbiB1cGRhdGVkXHJcblx0XHRcdHRoaXMuZml4Q2hpbGRyZW4oIGZyb3plbiwgbm9kZSApO1xyXG5cdFx0XHRVdGlscy5lYWNoKCBmcm96ZW4sIGZ1bmN0aW9uKCBjaGlsZCApe1xyXG5cdFx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApe1xyXG5cdFx0XHRcdFx0bWUucmVtb3ZlUGFyZW50KCBub2RlICk7XHJcblx0XHRcdFx0XHRtZS5hZGRQYXJlbnQoIGNoaWxkLCBmcm96ZW4gKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGZyb3plbiA9IHRoaXMuZnJlZXplKCBub2RlLCBfLm5vdGlmeSwgXy5mcmVlemVGbiwgXy5saXZlICk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGZyb3plbjtcclxuXHR9LFxyXG5cclxuXHRtZXJnZTogZnVuY3Rpb24oIG5vZGUsIGF0dHJzICl7XHJcblx0XHR2YXIgXyA9IG5vZGUuX18sXHJcblx0XHRcdHRyYW5zID0gXy50cmFucyxcclxuXHJcblx0XHRcdC8vIENsb25lIHRoZSBhdHRycyB0byBub3QgbW9kaWZ5IHRoZSBhcmd1bWVudFxyXG5cdFx0XHRhdHRycyA9IFV0aWxzLmV4dGVuZCgge30sIGF0dHJzKVxyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCB0cmFucyApe1xyXG5cclxuXHRcdFx0Zm9yKCB2YXIgYXR0ciBpbiBhdHRycyApXHJcblx0XHRcdFx0dHJhbnNbIGF0dHIgXSA9IGF0dHJzWyBhdHRyIF07XHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdGZyb3plbiA9IHRoaXMuY29weU1ldGEoIG5vZGUgKSxcclxuXHRcdFx0bm90aWZ5ID0gXy5ub3RpZnksXHJcblx0XHRcdHZhbCwgY29ucywga2V5LCBpc0Zyb3plblxyXG5cdFx0O1xyXG5cclxuXHRcdFV0aWxzLmVhY2goIG5vZGUsIGZ1bmN0aW9uKCBjaGlsZCwga2V5ICl7XHJcblx0XHRcdGlzRnJvemVuID0gY2hpbGQgJiYgY2hpbGQuX187XHJcblxyXG5cdFx0XHRpZiggaXNGcm96ZW4gKXtcclxuXHRcdFx0XHRtZS5yZW1vdmVQYXJlbnQoIGNoaWxkLCBub2RlICk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhbCA9IGF0dHJzWyBrZXkgXTtcclxuXHRcdFx0aWYoICF2YWwgKXtcclxuXHRcdFx0XHRpZiggaXNGcm96ZW4gKVxyXG5cdFx0XHRcdFx0bWUuYWRkUGFyZW50KCBjaGlsZCwgZnJvemVuICk7XHJcblx0XHRcdFx0cmV0dXJuIGZyb3plblsga2V5IF0gPSBjaGlsZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29ucyA9IHZhbCAmJiB2YWwuY29uc3RydWN0b3I7XHJcblxyXG5cdFx0XHRpZiggY29ucyA9PSBBcnJheSB8fCBjb25zID09IE9iamVjdCApXHJcblx0XHRcdFx0dmFsID0gbWUuZnJlZXplKCB2YWwsIG5vdGlmeSwgXy5mcmVlemVGbiwgXy5saXZlICk7XHJcblxyXG5cdFx0XHRpZiggdmFsICYmIHZhbC5fXyApXHJcblx0XHRcdFx0bWUuYWRkUGFyZW50KCB2YWwsIGZyb3plbiApO1xyXG5cclxuXHRcdFx0ZGVsZXRlIGF0dHJzWyBrZXkgXTtcclxuXHJcblx0XHRcdGZyb3plblsga2V5IF0gPSB2YWw7XHJcblx0XHR9KTtcclxuXHJcblxyXG5cdFx0Zm9yKCBrZXkgaW4gYXR0cnMgKSB7XHJcblx0XHRcdHZhbCA9IGF0dHJzWyBrZXkgXTtcclxuXHRcdFx0Y29ucyA9IHZhbCAmJiB2YWwuY29uc3RydWN0b3I7XHJcblxyXG5cdFx0XHRpZiggY29ucyA9PSBBcnJheSB8fCBjb25zID09IE9iamVjdCApXHJcblx0XHRcdFx0dmFsID0gbWUuZnJlZXplKCB2YWwsIG5vdGlmeSwgXy5mcmVlemVGbiwgXy5saXZlICk7XHJcblxyXG5cdFx0XHRpZiggdmFsICYmIHZhbC5fXyApXHJcblx0XHRcdFx0bWUuYWRkUGFyZW50KCB2YWwsIGZyb3plbiApO1xyXG5cclxuXHRcdFx0ZnJvemVuWyBrZXkgXSA9IHZhbDtcclxuXHRcdH1cclxuXHJcblx0XHRfLmZyZWV6ZUZuKCBmcm96ZW4gKTtcclxuXHJcblx0XHR0aGlzLnJlZnJlc2hQYXJlbnRzKCBub2RlLCBmcm96ZW4gKTtcclxuXHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdHJlcGxhY2U6IGZ1bmN0aW9uKCBub2RlLCByZXBsYWNlbWVudCApIHtcclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRjb25zID0gcmVwbGFjZW1lbnQgJiYgcmVwbGFjZW1lbnQuY29uc3RydWN0b3IsXHJcblx0XHRcdF8gPSBub2RlLl9fLFxyXG5cdFx0XHRmcm96ZW4gPSByZXBsYWNlbWVudFxyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCBjb25zID09IEFycmF5IHx8IGNvbnMgPT0gT2JqZWN0ICkge1xyXG5cclxuXHRcdFx0ZnJvemVuID0gbWUuZnJlZXplKCByZXBsYWNlbWVudCwgXy5ub3RpZnksIF8uZnJlZXplRm4sIF8ubGl2ZSApO1xyXG5cclxuXHRcdFx0ZnJvemVuLl9fLnBhcmVudHMgPSBfLnBhcmVudHM7XHJcblxyXG5cdFx0XHQvLyBBZGQgdGhlIGN1cnJlbnQgbGlzdGVuZXIgaWYgZXhpc3RzLCByZXBsYWNpbmcgYVxyXG5cdFx0XHQvLyBwcmV2aW91cyBsaXN0ZW5lciBpbiB0aGUgZnJvemVuIGlmIGV4aXN0ZWRcclxuXHRcdFx0aWYoIF8ubGlzdGVuZXIgKVxyXG5cdFx0XHRcdGZyb3plbi5fXy5saXN0ZW5lciA9IF8ubGlzdGVuZXI7XHJcblxyXG5cdFx0XHQvLyBTaW5jZSB0aGUgcGFyZW50cyB3aWxsIGJlIHJlZnJlc2hlZCBkaXJlY3RseSxcclxuXHRcdFx0Ly8gVHJpZ2dlciB0aGUgbGlzdGVuZXIgaGVyZVxyXG5cdFx0XHRpZiggZnJvemVuLl9fLmxpc3RlbmVyIClcclxuXHRcdFx0XHR0aGlzLnRyaWdnZXIoIGZyb3plbiwgJ3VwZGF0ZScsIGZyb3plbiApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlZnJlc2ggdGhlIHBhcmVudCBub2RlcyBkaXJlY3RseVxyXG5cdFx0aWYoICFfLnBhcmVudHMubGVuZ3RoICYmIF8ubGlzdGVuZXIgKXtcclxuXHRcdFx0Xy5saXN0ZW5lci50cmlnZ2VyKCAnaW1tZWRpYXRlJywgbm9kZSwgZnJvemVuICk7XHJcblx0XHR9XHJcblx0XHRmb3IgKHZhciBpID0gXy5wYXJlbnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XHJcblx0XHRcdGlmKCBpID09IDAgKXtcclxuXHRcdFx0XHR0aGlzLnJlZnJlc2goIF8ucGFyZW50c1tpXSwgbm9kZSwgZnJvemVuLCBmYWxzZSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2V7XHJcblxyXG5cdFx0XHRcdHRoaXMubWFya0RpcnR5KCBfLnBhcmVudHNbaV0sIFtub2RlLCBmcm96ZW5dICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBmcm96ZW47XHJcblx0fSxcclxuXHJcblx0cmVtb3ZlOiBmdW5jdGlvbiggbm9kZSwgYXR0cnMgKXtcclxuXHRcdHZhciB0cmFucyA9IG5vZGUuX18udHJhbnM7XHJcblx0XHRpZiggdHJhbnMgKXtcclxuXHRcdFx0Zm9yKCB2YXIgbCA9IGF0dHJzLmxlbmd0aCAtIDE7IGwgPj0gMDsgbC0tIClcclxuXHRcdFx0XHRkZWxldGUgdHJhbnNbIGF0dHJzW2xdIF07XHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdGZyb3plbiA9IHRoaXMuY29weU1ldGEoIG5vZGUgKSxcclxuXHRcdFx0aXNGcm96ZW5cclxuXHRcdDtcclxuXHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRpc0Zyb3plbiA9IGNoaWxkICYmIGNoaWxkLl9fO1xyXG5cclxuXHRcdFx0aWYoIGlzRnJvemVuICl7XHJcblx0XHRcdFx0bWUucmVtb3ZlUGFyZW50KCBjaGlsZCwgbm9kZSApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiggYXR0cnMuaW5kZXhPZigga2V5ICkgIT0gLTEgKXtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKCBpc0Zyb3plbiApXHJcblx0XHRcdFx0bWUuYWRkUGFyZW50KCBjaGlsZCwgZnJvemVuICk7XHJcblxyXG5cdFx0XHRmcm96ZW5bIGtleSBdID0gY2hpbGQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRub2RlLl9fLmZyZWV6ZUZuKCBmcm96ZW4gKTtcclxuXHRcdHRoaXMucmVmcmVzaFBhcmVudHMoIG5vZGUsIGZyb3plbiApO1xyXG5cclxuXHRcdHJldHVybiBmcm96ZW47XHJcblx0fSxcclxuXHJcblx0c3BsaWNlOiBmdW5jdGlvbiggbm9kZSwgYXJncyApe1xyXG5cdFx0dmFyIF8gPSBub2RlLl9fLFxyXG5cdFx0XHR0cmFucyA9IF8udHJhbnNcclxuXHRcdDtcclxuXHJcblx0XHRpZiggdHJhbnMgKXtcclxuXHRcdFx0dHJhbnMuc3BsaWNlLmFwcGx5KCB0cmFucywgYXJncyApO1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmNvcHlNZXRhKCBub2RlICksXHJcblx0XHRcdGluZGV4ID0gYXJnc1swXSxcclxuXHRcdFx0ZGVsZXRlSW5kZXggPSBpbmRleCArIGFyZ3NbMV0sXHJcblx0XHRcdGNvbiwgY2hpbGRcclxuXHRcdDtcclxuXHJcblx0XHQvLyBDbG9uZSB0aGUgYXJyYXlcclxuXHRcdFV0aWxzLmVhY2goIG5vZGUsIGZ1bmN0aW9uKCBjaGlsZCwgaSApe1xyXG5cclxuXHRcdFx0aWYoIGNoaWxkICYmIGNoaWxkLl9fICl7XHJcblx0XHRcdFx0bWUucmVtb3ZlUGFyZW50KCBjaGlsZCwgbm9kZSApO1xyXG5cclxuXHRcdFx0XHQvLyBTa2lwIHRoZSBub2RlcyB0byBkZWxldGVcclxuXHRcdFx0XHRpZiggaSA8IGluZGV4IHx8IGk+PSBkZWxldGVJbmRleCApXHJcblx0XHRcdFx0XHRtZS5hZGRQYXJlbnQoIGNoaWxkLCBmcm96ZW4gKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZnJvemVuW2ldID0gY2hpbGQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBQcmVwYXJlIHRoZSBuZXcgbm9kZXNcclxuXHRcdGlmKCBhcmdzLmxlbmd0aCA+IDEgKXtcclxuXHRcdFx0Zm9yICh2YXIgaSA9IGFyZ3MubGVuZ3RoIC0gMTsgaSA+PSAyOyBpLS0pIHtcclxuXHRcdFx0XHRjaGlsZCA9IGFyZ3NbaV07XHJcblx0XHRcdFx0Y29uID0gY2hpbGQgJiYgY2hpbGQuY29uc3RydWN0b3I7XHJcblxyXG5cdFx0XHRcdGlmKCBjb24gPT0gQXJyYXkgfHwgY29uID09IE9iamVjdCApXHJcblx0XHRcdFx0XHRjaGlsZCA9IHRoaXMuZnJlZXplKCBjaGlsZCwgXy5ub3RpZnksIF8uZnJlZXplRm4sIF8ubGl2ZSApO1xyXG5cclxuXHRcdFx0XHRpZiggY2hpbGQgJiYgY2hpbGQuX18gKVxyXG5cdFx0XHRcdFx0dGhpcy5hZGRQYXJlbnQoIGNoaWxkLCBmcm96ZW4gKTtcclxuXHJcblx0XHRcdFx0YXJnc1tpXSA9IGNoaWxkO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gc3BsaWNlXHJcblx0XHRBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KCBmcm96ZW4sIGFyZ3MgKTtcclxuXHJcblx0XHRub2RlLl9fLmZyZWV6ZUZuKCBmcm96ZW4gKTtcclxuXHRcdHRoaXMucmVmcmVzaFBhcmVudHMoIG5vZGUsIGZyb3plbiApO1xyXG5cclxuXHRcdHJldHVybiBmcm96ZW47XHJcblx0fSxcclxuXHJcblx0dHJhbnNhY3Q6IGZ1bmN0aW9uKCBub2RlICkge1xyXG5cdFx0dmFyIG1lID0gdGhpcyxcclxuXHRcdFx0dHJhbnNhY3RpbmcgPSBub2RlLl9fLnRyYW5zLFxyXG5cdFx0XHR0cmFuc1xyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCB0cmFuc2FjdGluZyApXHJcblx0XHRcdHJldHVybiB0cmFuc2FjdGluZztcclxuXHJcblx0XHR0cmFucyA9IG5vZGUuY29uc3RydWN0b3IgPT0gQXJyYXkgPyBbXSA6IHt9O1xyXG5cclxuXHRcdFV0aWxzLmVhY2goIG5vZGUsIGZ1bmN0aW9uKCBjaGlsZCwga2V5ICl7XHJcblx0XHRcdHRyYW5zWyBrZXkgXSA9IGNoaWxkO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bm9kZS5fXy50cmFucyA9IHRyYW5zO1xyXG5cclxuXHRcdC8vIENhbGwgcnVuIGF1dG9tYXRpY2FsbHkgaW4gY2FzZVxyXG5cdFx0Ly8gdGhlIHVzZXIgZm9yZ290IGFib3V0IGl0XHJcblx0XHRVdGlscy5uZXh0VGljayggZnVuY3Rpb24oKXtcclxuXHRcdFx0aWYoIG5vZGUuX18udHJhbnMgKVxyXG5cdFx0XHRcdG1lLnJ1biggbm9kZSApO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIHRyYW5zO1xyXG5cdH0sXHJcblxyXG5cdHJ1bjogZnVuY3Rpb24oIG5vZGUgKSB7XHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHR0cmFucyA9IG5vZGUuX18udHJhbnNcclxuXHRcdDtcclxuXHJcblx0XHRpZiggIXRyYW5zIClcclxuXHRcdFx0cmV0dXJuIG5vZGU7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHRoZSBub2RlIGFzIGEgcGFyZW50XHJcblx0XHRVdGlscy5lYWNoKCB0cmFucywgZnVuY3Rpb24oIGNoaWxkLCBrZXkgKXtcclxuXHRcdFx0aWYoIGNoaWxkICYmIGNoaWxkLl9fICl7XHJcblx0XHRcdFx0bWUucmVtb3ZlUGFyZW50KCBjaGlsZCwgbm9kZSApO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRkZWxldGUgbm9kZS5fXy50cmFucztcclxuXHJcblx0XHR2YXIgcmVzdWx0ID0gdGhpcy5yZXBsYWNlKCBub2RlLCB0cmFucyApO1xyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9LFxyXG5cclxuXHRyZWZyZXNoOiBmdW5jdGlvbiggbm9kZSwgb2xkQ2hpbGQsIG5ld0NoaWxkLCByZXR1cm5VcGRhdGVkICl7XHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHR0cmFucyA9IG5vZGUuX18udHJhbnMsXHJcblx0XHRcdGZvdW5kID0gMFxyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCB0cmFucyApe1xyXG5cclxuXHRcdFx0VXRpbHMuZWFjaCggdHJhbnMsIGZ1bmN0aW9uKCBjaGlsZCwga2V5ICl7XHJcblx0XHRcdFx0aWYoIGZvdW5kICkgcmV0dXJuO1xyXG5cclxuXHRcdFx0XHRpZiggY2hpbGQgPT09IG9sZENoaWxkICl7XHJcblxyXG5cdFx0XHRcdFx0dHJhbnNbIGtleSBdID0gbmV3Q2hpbGQ7XHJcblx0XHRcdFx0XHRmb3VuZCA9IDE7XHJcblxyXG5cdFx0XHRcdFx0aWYoIG5ld0NoaWxkICYmIG5ld0NoaWxkLl9fIClcclxuXHRcdFx0XHRcdFx0bWUuYWRkUGFyZW50KCBuZXdDaGlsZCwgbm9kZSApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgZnJvemVuID0gdGhpcy5jb3B5TWV0YSggbm9kZSApLFxyXG5cdFx0XHRkaXJ0eSA9IG5vZGUuX18uZGlydHksXHJcblx0XHRcdGRpcnQsIHJlcGxhY2VtZW50LCBfX1xyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCBkaXJ0eSApe1xyXG5cdFx0XHRkaXJ0ID0gZGlydHlbMF0sXHJcblx0XHRcdHJlcGxhY2VtZW50ID0gZGlydHlbMV1cclxuXHRcdH1cclxuXHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRpZiggY2hpbGQgPT09IG9sZENoaWxkICl7XHJcblx0XHRcdFx0Y2hpbGQgPSBuZXdDaGlsZDtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIGlmKCBjaGlsZCA9PT0gZGlydCApe1xyXG5cdFx0XHRcdGNoaWxkID0gcmVwbGFjZW1lbnQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKCBjaGlsZCAmJiAoX18gPSBjaGlsZC5fXykgKXtcclxuXHJcblx0XHRcdFx0Ly8gSWYgdGhlcmUgaXMgYSB0cmFucyBoYXBwZW5pbmcgd2VcclxuXHRcdFx0XHQvLyBkb24ndCB1cGRhdGUgYSBkaXJ0eSBub2RlIG5vdy4gVGhlIHVwZGF0ZVxyXG5cdFx0XHRcdC8vIHdpbGwgb2NjdXIgb24gcnVuLlxyXG5cdFx0XHRcdGlmKCAhX18udHJhbnMgJiYgX18uZGlydHkgKXtcclxuXHRcdFx0XHRcdGNoaWxkID0gbWUucmVmcmVzaCggY2hpbGQsIF9fLmRpcnR5WzBdLCBfXy5kaXJ0eVsxXSwgdHJ1ZSApO1xyXG5cdFx0XHRcdH1cclxuXHJcblxyXG5cdFx0XHRcdG1lLnJlbW92ZVBhcmVudCggY2hpbGQsIG5vZGUgKTtcclxuXHRcdFx0XHRtZS5hZGRQYXJlbnQoIGNoaWxkLCBmcm96ZW4gKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0ZnJvemVuWyBrZXkgXSA9IGNoaWxkO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bm9kZS5fXy5mcmVlemVGbiggZnJvemVuICk7XHJcblxyXG5cdFx0Ly8gSWYgdGhlIG5vZGUgd2FzIGRpcnR5LCBjbGVhbiBpdFxyXG5cdFx0bm9kZS5fXy5kaXJ0eSA9IGZhbHNlO1xyXG5cclxuXHRcdGlmKCByZXR1cm5VcGRhdGVkIClcclxuXHRcdFx0cmV0dXJuIGZyb3plbjtcclxuXHJcblx0XHR0aGlzLnJlZnJlc2hQYXJlbnRzKCBub2RlLCBmcm96ZW4gKTtcclxuXHR9LFxyXG5cclxuXHRmaXhDaGlsZHJlbjogZnVuY3Rpb24oIG5vZGUsIG9sZE5vZGUgKXtcclxuXHRcdHZhciBtZSA9IHRoaXM7XHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQgKXtcclxuXHRcdFx0aWYoICFjaGlsZCB8fCAhY2hpbGQuX18gKVxyXG5cdFx0XHRcdHJldHVybjtcclxuXHJcblx0XHRcdC8vIElmIHRoZSBjaGlsZCBpcyBsaW5rZWQgdG8gdGhlIG5vZGUsXHJcblx0XHRcdC8vIG1heWJlIGl0cyBjaGlsZHJlbiBhcmUgbm90IGxpbmtlZFxyXG5cdFx0XHRpZiggY2hpbGQuX18ucGFyZW50cy5pbmRleE9mKCBub2RlICkgIT0gLTEgKVxyXG5cdFx0XHRcdHJldHVybiBtZS5maXhDaGlsZHJlbiggY2hpbGQgKTtcclxuXHJcblx0XHRcdC8vIElmIHRoZSBjaGlsZCB3YXNuJ3QgbGlua2VkIGl0IGlzIHN1cmVcclxuXHRcdFx0Ly8gdGhhdCBpdCB3YXNuJ3QgbW9kaWZpZWQuIEp1c3QgbGluayBpdFxyXG5cdFx0XHQvLyB0byB0aGUgbmV3IHBhcmVudFxyXG5cdFx0XHRpZiggY2hpbGQuX18ucGFyZW50cy5sZW5ndGggPT0gMSApXHJcblx0XHRcdFx0cmV0dXJuIGNoaWxkLl9fLnBhcmVudHMgPSBbIG5vZGUgXTtcclxuXHJcblx0XHRcdGlmKCBvbGROb2RlIClcclxuXHRcdFx0XHRtZS5yZW1vdmVQYXJlbnQoIGNoaWxkLCBvbGROb2RlICk7XHJcblxyXG5cdFx0XHRtZS5hZGRQYXJlbnQoIGNoaWxkLCBub2RlICk7XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cclxuXHRjb3B5TWV0YTogZnVuY3Rpb24oIG5vZGUgKXtcclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdGZyb3plblxyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCBub2RlLmNvbnN0cnVjdG9yID09IEFycmF5ICl7XHJcblx0XHRcdGZyb3plbiA9IHRoaXMuY3JlYXRlQXJyYXkoIG5vZGUubGVuZ3RoICk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0ZnJvemVuID0gT2JqZWN0LmNyZWF0ZSggTWl4aW5zLkhhc2ggKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgXyA9IG5vZGUuX187XHJcblxyXG5cdFx0VXRpbHMuYWRkTkUoIGZyb3plbiwge19fOiB7XHJcblx0XHRcdG5vdGlmeTogXy5ub3RpZnksXHJcblx0XHRcdGxpc3RlbmVyOiBfLmxpc3RlbmVyLFxyXG5cdFx0XHRwYXJlbnRzOiBfLnBhcmVudHMuc2xpY2UoIDAgKSxcclxuXHRcdFx0dHJhbnM6IF8udHJhbnMsXHJcblx0XHRcdGRpcnR5OiBmYWxzZSxcclxuXHRcdFx0ZnJlZXplRm46IF8uZnJlZXplRm5cclxuXHRcdH19KTtcclxuXHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdHJlZnJlc2hQYXJlbnRzOiBmdW5jdGlvbiggb2xkQ2hpbGQsIG5ld0NoaWxkICl7XHJcblx0XHR2YXIgXyA9IG9sZENoaWxkLl9fLFxyXG5cdFx0XHRpXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIF8ubGlzdGVuZXIgKVxyXG5cdFx0XHR0aGlzLnRyaWdnZXIoIG5ld0NoaWxkLCAndXBkYXRlJywgbmV3Q2hpbGQgKTtcclxuXHJcblx0XHRpZiggIV8ucGFyZW50cy5sZW5ndGggKXtcclxuXHRcdFx0aWYoIF8ubGlzdGVuZXIgKXtcclxuXHRcdFx0XHRfLmxpc3RlbmVyLnRyaWdnZXIoICdpbW1lZGlhdGUnLCBvbGRDaGlsZCwgbmV3Q2hpbGQgKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGZvciAoaSA9IF8ucGFyZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG5cdFx0XHRcdC8vIElmIHRoZXJlIGlzIG1vcmUgdGhhbiBvbmUgcGFyZW50LCBtYXJrIGV2ZXJ5b25lIGFzIGRpcnR5XHJcblx0XHRcdFx0Ly8gYnV0IHRoZSBsYXN0IGluIHRoZSBpdGVyYXRpb24sIGFuZCB3aGVuIHRoZSBsYXN0IGlzIHJlZnJlc2hlZFxyXG5cdFx0XHRcdC8vIGl0IHdpbGwgdXBkYXRlIHRoZSBkaXJ0eSBub2Rlcy5cclxuXHRcdFx0XHRpZiggaSA9PSAwIClcclxuXHRcdFx0XHRcdHRoaXMucmVmcmVzaCggXy5wYXJlbnRzW2ldLCBvbGRDaGlsZCwgbmV3Q2hpbGQsIGZhbHNlICk7XHJcblx0XHRcdFx0ZWxzZXtcclxuXHJcblx0XHRcdFx0XHR0aGlzLm1hcmtEaXJ0eSggXy5wYXJlbnRzW2ldLCBbb2xkQ2hpbGQsIG5ld0NoaWxkXSApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdG1hcmtEaXJ0eTogZnVuY3Rpb24oIG5vZGUsIGRpcnQgKXtcclxuXHRcdHZhciBfID0gbm9kZS5fXyxcclxuXHRcdFx0aVxyXG5cdFx0O1xyXG5cdFx0Xy5kaXJ0eSA9IGRpcnQ7XHJcblxyXG5cdFx0Ly8gSWYgdGhlcmUgaXMgYSB0cmFuc2FjdGlvbiBoYXBwZW5pbmcgaW4gdGhlIG5vZGVcclxuXHRcdC8vIHVwZGF0ZSB0aGUgdHJhbnNhY3Rpb24gZGF0YSBpbW1lZGlhdGVseVxyXG5cdFx0aWYoIF8udHJhbnMgKVxyXG5cdFx0XHR0aGlzLnJlZnJlc2goIG5vZGUsIGRpcnRbMF0sIGRpcnRbMV0gKTtcclxuXHJcblx0XHRmb3IgKCBpID0gXy5wYXJlbnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tICkge1xyXG5cclxuXHRcdFx0dGhpcy5tYXJrRGlydHkoIF8ucGFyZW50c1tpXSwgZGlydCApO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdHJlbW92ZVBhcmVudDogZnVuY3Rpb24oIG5vZGUsIHBhcmVudCApe1xyXG5cdFx0dmFyIHBhcmVudHMgPSBub2RlLl9fLnBhcmVudHMsXHJcblx0XHRcdGluZGV4ID0gcGFyZW50cy5pbmRleE9mKCBwYXJlbnQgKVxyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCBpbmRleCAhPSAtMSApe1xyXG5cdFx0XHRwYXJlbnRzLnNwbGljZSggaW5kZXgsIDEgKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRhZGRQYXJlbnQ6IGZ1bmN0aW9uKCBub2RlLCBwYXJlbnQgKXtcclxuXHRcdHZhciBwYXJlbnRzID0gbm9kZS5fXy5wYXJlbnRzLFxyXG5cdFx0XHRpbmRleCA9IHBhcmVudHMuaW5kZXhPZiggcGFyZW50IClcclxuXHRcdDtcclxuXHJcblx0XHRpZiggaW5kZXggPT0gLTEgKXtcclxuXHRcdFx0cGFyZW50c1sgcGFyZW50cy5sZW5ndGggXSA9IHBhcmVudDtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHR0cmlnZ2VyOiBmdW5jdGlvbiggbm9kZSwgZXZlbnROYW1lLCBwYXJhbSApe1xyXG5cdFx0dmFyIGxpc3RlbmVyID0gbm9kZS5fXy5saXN0ZW5lcixcclxuXHRcdFx0dGlja2luZyA9IGxpc3RlbmVyLnRpY2tpbmdcclxuXHRcdDtcclxuXHJcblx0XHRsaXN0ZW5lci50aWNraW5nID0gcGFyYW07XHJcblx0XHRpZiggIXRpY2tpbmcgKXtcclxuXHRcdFx0VXRpbHMubmV4dFRpY2soIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dmFyIHVwZGF0ZWQgPSBsaXN0ZW5lci50aWNraW5nO1xyXG5cdFx0XHRcdGxpc3RlbmVyLnRpY2tpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRsaXN0ZW5lci50cmlnZ2VyKCBldmVudE5hbWUsIHVwZGF0ZWQgKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0Y3JlYXRlTGlzdGVuZXI6IGZ1bmN0aW9uKCBmcm96ZW4gKXtcclxuXHRcdHZhciBsID0gZnJvemVuLl9fLmxpc3RlbmVyO1xyXG5cclxuXHRcdGlmKCAhbCApIHtcclxuXHRcdFx0bCA9IE9iamVjdC5jcmVhdGUoRW1pdHRlciwge1xyXG5cdFx0XHRcdF9ldmVudHM6IHtcclxuXHRcdFx0XHRcdHZhbHVlOiB7fSxcclxuXHRcdFx0XHRcdHdyaXRhYmxlOiB0cnVlXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGZyb3plbi5fXy5saXN0ZW5lciA9IGw7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGw7XHJcblx0fSxcclxuXHJcblx0Y3JlYXRlQXJyYXk6IChmdW5jdGlvbigpe1xyXG5cdFx0Ly8gU2V0IGNyZWF0ZUFycmF5IG1ldGhvZFxyXG5cdFx0aWYoIFtdLl9fcHJvdG9fXyApXHJcblx0XHRcdHJldHVybiBmdW5jdGlvbiggbGVuZ3RoICl7XHJcblx0XHRcdFx0dmFyIGFyciA9IG5ldyBBcnJheSggbGVuZ3RoICk7XHJcblx0XHRcdFx0YXJyLl9fcHJvdG9fXyA9IE1peGlucy5MaXN0O1xyXG5cdFx0XHRcdHJldHVybiBhcnI7XHJcblx0XHRcdH1cclxuXHRcdHJldHVybiBmdW5jdGlvbiggbGVuZ3RoICl7XHJcblx0XHRcdHZhciBhcnIgPSBuZXcgQXJyYXkoIGxlbmd0aCApLFxyXG5cdFx0XHRcdG1ldGhvZHMgPSBNaXhpbnMuYXJyYXlNZXRob2RzXHJcblx0XHRcdDtcclxuXHRcdFx0Zm9yKCB2YXIgbSBpbiBtZXRob2RzICl7XHJcblx0XHRcdFx0YXJyWyBtIF0gPSBtZXRob2RzWyBtIF07XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGFycjtcclxuXHRcdH1cclxuXHR9KSgpXHJcbn07XHJcbi8vI2J1aWxkXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZyb3plbjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFV0aWxzID0gcmVxdWlyZSggJy4vdXRpbHMuanMnICk7XHJcblxyXG4vLyNidWlsZFxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgZGVzY3JpcHRvcnMsIHRvIGJlIHVzZWQgYnkgT2JqZWN0LmNyZWF0ZS5cclxuICogQHBhcmFtICB7T2JqZWN0fSBhdHRycyBQcm9wZXJ0aWVzIHRvIGNyZWF0ZSBkZXNjcmlwdG9yc1xyXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgIEEgaGFzaCB3aXRoIHRoZSBkZXNjcmlwdG9ycy5cclxuICovXHJcbnZhciBjcmVhdGVORSA9IGZ1bmN0aW9uKCBhdHRycyApe1xyXG5cdHZhciBuZSA9IHt9O1xyXG5cclxuXHRmb3IoIHZhciBrZXkgaW4gYXR0cnMgKXtcclxuXHRcdG5lWyBrZXkgXSA9IHtcclxuXHRcdFx0d3JpdGFibGU6IHRydWUsXHJcblx0XHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRcdHZhbHVlOiBhdHRyc1sga2V5XVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG5lO1xyXG59XHJcblxyXG52YXIgY29tbW9uTWV0aG9kcyA9IHtcclxuXHRzZXQ6IGZ1bmN0aW9uKCBhdHRyLCB2YWx1ZSApe1xyXG5cdFx0dmFyIGF0dHJzID0gYXR0cixcclxuXHRcdFx0dXBkYXRlID0gdGhpcy5fXy50cmFuc1xyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCB0eXBlb2YgdmFsdWUgIT0gJ3VuZGVmaW5lZCcgKXtcclxuXHRcdFx0YXR0cnMgPSB7fTtcclxuXHRcdFx0YXR0cnNbIGF0dHIgXSA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKCAhdXBkYXRlICl7XHJcblx0XHRcdGZvciggdmFyIGtleSBpbiBhdHRycyApe1xyXG5cdFx0XHRcdHVwZGF0ZSA9IHVwZGF0ZSB8fCB0aGlzWyBrZXkgXSAhPSBhdHRyc1sga2V5IF07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE5vIGNoYW5nZXMsIGp1c3QgcmV0dXJuIHRoZSBub2RlXHJcblx0XHRcdGlmKCAhdXBkYXRlIClcclxuXHRcdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdtZXJnZScsIHRoaXMsIGF0dHJzICk7XHJcblx0fSxcclxuXHJcblx0cmVzZXQ6IGZ1bmN0aW9uKCBhdHRycyApIHtcclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3JlcGxhY2UnLCB0aGlzLCBhdHRycyApO1xyXG5cdH0sXHJcblxyXG5cdGdldExpc3RlbmVyOiBmdW5jdGlvbigpe1xyXG5cdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAnbGlzdGVuZXInLCB0aGlzICk7XHJcblx0fSxcclxuXHJcblx0dG9KUzogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBqcztcclxuXHRcdGlmKCB0aGlzLmNvbnN0cnVjdG9yID09IEFycmF5ICl7XHJcblx0XHRcdGpzID0gbmV3IEFycmF5KCB0aGlzLmxlbmd0aCApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGpzID0ge307XHJcblx0XHR9XHJcblxyXG5cdFx0VXRpbHMuZWFjaCggdGhpcywgZnVuY3Rpb24oIGNoaWxkLCBpICl7XHJcblx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApXHJcblx0XHRcdFx0anNbIGkgXSA9IGNoaWxkLnRvSlMoKTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdGpzWyBpIF0gPSBjaGlsZDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBqcztcclxuXHR9LFxyXG5cclxuXHR0cmFuc2FjdDogZnVuY3Rpb24oKXtcclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3RyYW5zYWN0JywgdGhpcyApO1xyXG5cdH0sXHJcblx0cnVuOiBmdW5jdGlvbigpe1xyXG5cdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAncnVuJywgdGhpcyApO1xyXG5cdH1cclxufTtcclxuXHJcbnZhciBhcnJheU1ldGhvZHMgPSBVdGlscy5leHRlbmQoe1xyXG5cdHB1c2g6IGZ1bmN0aW9uKCBlbCApe1xyXG5cdFx0cmV0dXJuIHRoaXMuYXBwZW5kKCBbZWxdICk7XHJcblx0fSxcclxuXHJcblx0YXBwZW5kOiBmdW5jdGlvbiggZWxzICl7XHJcblx0XHRpZiggZWxzICYmIGVscy5sZW5ndGggKVxyXG5cdFx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdzcGxpY2UnLCB0aGlzLCBbdGhpcy5sZW5ndGgsIDBdLmNvbmNhdCggZWxzICkgKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHBvcDogZnVuY3Rpb24oKXtcclxuXHRcdGlmKCAhdGhpcy5sZW5ndGggKVxyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdzcGxpY2UnLCB0aGlzLCBbdGhpcy5sZW5ndGggLTEsIDFdICk7XHJcblx0fSxcclxuXHJcblx0dW5zaGlmdDogZnVuY3Rpb24oIGVsICl7XHJcblx0XHRyZXR1cm4gdGhpcy5wcmVwZW5kKCBbZWxdICk7XHJcblx0fSxcclxuXHJcblx0cHJlcGVuZDogZnVuY3Rpb24oIGVscyApe1xyXG5cdFx0aWYoIGVscyAmJiBlbHMubGVuZ3RoIClcclxuXHRcdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAnc3BsaWNlJywgdGhpcywgWzAsIDBdLmNvbmNhdCggZWxzICkgKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHNoaWZ0OiBmdW5jdGlvbigpe1xyXG5cdFx0aWYoICF0aGlzLmxlbmd0aCApXHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3NwbGljZScsIHRoaXMsIFswLCAxXSApO1xyXG5cdH0sXHJcblxyXG5cdHNwbGljZTogZnVuY3Rpb24oIGluZGV4LCB0b1JlbW92ZSwgdG9BZGQgKXtcclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3NwbGljZScsIHRoaXMsIGFyZ3VtZW50cyApO1xyXG5cdH1cclxufSwgY29tbW9uTWV0aG9kcyApO1xyXG5cclxudmFyIEZyb3plbkFycmF5ID0gT2JqZWN0LmNyZWF0ZSggQXJyYXkucHJvdG90eXBlLCBjcmVhdGVORSggYXJyYXlNZXRob2RzICkgKTtcclxuXHJcbnZhciBNaXhpbnMgPSB7XHJcblxyXG5IYXNoOiBPYmplY3QuY3JlYXRlKCBPYmplY3QucHJvdG90eXBlLCBjcmVhdGVORSggVXRpbHMuZXh0ZW5kKHtcclxuXHRyZW1vdmU6IGZ1bmN0aW9uKCBrZXlzICl7XHJcblx0XHR2YXIgZmlsdGVyZWQgPSBbXSxcclxuXHRcdFx0ayA9IGtleXNcclxuXHRcdDtcclxuXHJcblx0XHRpZigga2V5cy5jb25zdHJ1Y3RvciAhPSBBcnJheSApXHJcblx0XHRcdGsgPSBbIGtleXMgXTtcclxuXHJcblx0XHRmb3IoIHZhciBpID0gMCwgbCA9IGsubGVuZ3RoOyBpPGw7IGkrKyApe1xyXG5cdFx0XHRpZiggdGhpcy5oYXNPd25Qcm9wZXJ0eSgga1tpXSApIClcclxuXHRcdFx0XHRmaWx0ZXJlZC5wdXNoKCBrW2ldICk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoIGZpbHRlcmVkLmxlbmd0aCApXHJcblx0XHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3JlbW92ZScsIHRoaXMsIGZpbHRlcmVkICk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9XHJcbn0sIGNvbW1vbk1ldGhvZHMpKSksXHJcblxyXG5MaXN0OiBGcm96ZW5BcnJheSxcclxuYXJyYXlNZXRob2RzOiBhcnJheU1ldGhvZHNcclxufTtcclxuLy8jYnVpbGRcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWl4aW5zOyIsIid1c2Ugc3RyaWN0JztcblxuLy8jYnVpbGRcbnZhciBnbG9iYWwgPSAobmV3IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKSk7XG5cbnZhciBVdGlscyA9IHtcblx0ZXh0ZW5kOiBmdW5jdGlvbiggb2IsIHByb3BzICl7XG5cdFx0Zm9yKCB2YXIgcCBpbiBwcm9wcyApe1xuXHRcdFx0b2JbcF0gPSBwcm9wc1twXTtcblx0XHR9XG5cdFx0cmV0dXJuIG9iO1xuXHR9LFxuXG5cdGNyZWF0ZU5vbkVudW1lcmFibGU6IGZ1bmN0aW9uKCBvYmosIHByb3RvICl7XG5cdFx0dmFyIG5lID0ge307XG5cdFx0Zm9yKCB2YXIga2V5IGluIG9iaiApXG5cdFx0XHRuZVtrZXldID0ge3ZhbHVlOiBvYmpba2V5XSB9O1xuXHRcdHJldHVybiBPYmplY3QuY3JlYXRlKCBwcm90byB8fCB7fSwgbmUgKTtcblx0fSxcblxuXHRlcnJvcjogZnVuY3Rpb24oIG1lc3NhZ2UgKXtcblx0XHR2YXIgZXJyID0gbmV3IEVycm9yKCBtZXNzYWdlICk7XG5cdFx0aWYoIGNvbnNvbGUgKVxuXHRcdFx0cmV0dXJuIGNvbnNvbGUuZXJyb3IoIGVyciApO1xuXHRcdGVsc2Vcblx0XHRcdHRocm93IGVycjtcblx0fSxcblxuXHRlYWNoOiBmdW5jdGlvbiggbywgY2xiayApe1xuXHRcdHZhciBpLGwsa2V5cztcblx0XHRpZiggbyAmJiBvLmNvbnN0cnVjdG9yID09IEFycmF5ICl7XG5cdFx0XHRmb3IgKGkgPSAwLCBsID0gby5sZW5ndGg7IGkgPCBsOyBpKyspXG5cdFx0XHRcdGNsYmsoIG9baV0sIGkgKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRrZXlzID0gT2JqZWN0LmtleXMoIG8gKTtcblx0XHRcdGZvciggaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKyApXG5cdFx0XHRcdGNsYmsoIG9bIGtleXNbaV0gXSwga2V5c1tpXSApO1xuXHRcdH1cblx0fSxcblxuXHRhZGRORTogZnVuY3Rpb24oIG5vZGUsIGF0dHJzICl7XG5cdFx0Zm9yKCB2YXIga2V5IGluIGF0dHJzICl7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoIG5vZGUsIGtleSwge1xuXHRcdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdFx0XHR3cml0YWJsZTogdHJ1ZSxcblx0XHRcdFx0dmFsdWU6IGF0dHJzWyBrZXkgXVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIG5leHRUaWNrIC0gYnkgc3RhZ2FzIC8gcHVibGljIGRvbWFpblxuICBcdG5leHRUaWNrOiAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHF1ZXVlID0gW10sXG5cdFx0XHRkaXJ0eSA9IGZhbHNlLFxuXHRcdFx0Zm4sXG5cdFx0XHRoYXNQb3N0TWVzc2FnZSA9ICEhZ2xvYmFsLnBvc3RNZXNzYWdlLFxuXHRcdFx0bWVzc2FnZU5hbWUgPSAnbmV4dHRpY2snLFxuXHRcdFx0dHJpZ2dlciA9IChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBoYXNQb3N0TWVzc2FnZVxuXHRcdFx0XHRcdD8gZnVuY3Rpb24gdHJpZ2dlciAoKSB7XG5cdFx0XHRcdFx0Z2xvYmFsLnBvc3RNZXNzYWdlKG1lc3NhZ2VOYW1lLCAnKicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdDogZnVuY3Rpb24gdHJpZ2dlciAoKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHByb2Nlc3NRdWV1ZSgpIH0sIDApO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSgpKSxcblx0XHRcdHByb2Nlc3NRdWV1ZSA9IChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBoYXNQb3N0TWVzc2FnZVxuXHRcdFx0XHRcdD8gZnVuY3Rpb24gcHJvY2Vzc1F1ZXVlIChldmVudCkge1xuXHRcdFx0XHRcdFx0aWYgKGV2ZW50LnNvdXJjZSA9PT0gZ2xvYmFsICYmIGV2ZW50LmRhdGEgPT09IG1lc3NhZ2VOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdFx0XHRmbHVzaFF1ZXVlKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdDogZmx1c2hRdWV1ZTtcbiAgICAgIFx0fSkoKVxuICAgICAgO1xuXG4gICAgICBmdW5jdGlvbiBmbHVzaFF1ZXVlICgpIHtcbiAgICAgICAgICB3aGlsZSAoZm4gPSBxdWV1ZS5zaGlmdCgpKSB7XG4gICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRpcnR5ID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG5leHRUaWNrIChmbikge1xuICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgIGlmIChkaXJ0eSkgcmV0dXJuO1xuICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICB0cmlnZ2VyKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChoYXNQb3N0TWVzc2FnZSkgZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBwcm9jZXNzUXVldWUsIHRydWUpO1xuXG4gICAgICBuZXh0VGljay5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBnbG9iYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHByb2Nlc3NRdWV1ZSwgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXh0VGljaztcbiAgfSkoKVxufTtcbi8vI2J1aWxkXG5cblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsczsiLCJleHBvcnQgY2xhc3MgQWN0aW9uIHtcbiAgY29uc3RydWN0b3IoYXJncykge1xuICAgIGNvbnN0IFtzdG9yZSwgc3RvcmVzLCBhbGxTdG9yZXNdID0gW2FyZ3Muc3RvcmUsIGFyZ3Muc3RvcmVzLCBbXV07XG4gICAgdGhpcy5uYW1lID0gYXJncy5uYW1lO1xuXG4gICAgaWYgKHN0b3JlKSBhbGxTdG9yZXMucHVzaChzdG9yZSk7XG4gICAgaWYgKHN0b3JlcykgYWxsU3RvcmVzLnB1c2guYXBwbHkoYWxsU3RvcmVzLCBzdG9yZXMpO1xuXG4gICAgdGhpcy5zdG9yZXMgPSBhbGxTdG9yZXM7XG4gIH1cblxuICBydW4oLi4uYXJncykge1xuICAgIGNvbnN0IHN0b3Jlc0N5Y2xlcyA9IHRoaXMuc3RvcmVzLm1hcChzdG9yZSA9PlxuICAgICAgc3RvcmUucnVuQ3ljbGUuYXBwbHkoc3RvcmUsIFt0aGlzLm5hbWVdLmNvbmNhdChhcmdzKSlcbiAgICApO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzdG9yZXNDeWNsZXMpO1xuICB9XG5cbiAgYWRkU3RvcmUoc3RvcmUpIHtcbiAgICB0aGlzLnN0b3Jlcy5wdXNoKHN0b3JlKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQWN0aW9ucyB7XG4gIGNvbnN0cnVjdG9yKGFjdGlvbnMpIHtcbiAgICB0aGlzLmFsbCA9IFtdO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFjdGlvbnMpKSB7XG4gICAgICBhY3Rpb25zLmZvckVhY2goKGFjdGlvbiA9PiB0aGlzLmFkZEFjdGlvbihhY3Rpb24pKSwgdGhpcyk7XG4gICAgfVxuICB9XG5cbiAgYWRkQWN0aW9uKGl0ZW0sIG5vT3ZlcnJpZGUpIHtcbiAgICBjb25zdCBhY3Rpb24gPSBub092ZXJyaWRlID8gZmFsc2UgOiB0aGlzLmRldGVjdEFjdGlvbihpdGVtKTtcbiAgICBpZiAoIW5vT3ZlcnJpZGUpIHtcbiAgICAgIGxldCBvbGQgPSB0aGlzW2FjdGlvbi5uYW1lXTtcbiAgICAgIGlmIChvbGQpIHRoaXMucmVtb3ZlQWN0aW9uKG9sZCk7XG4gICAgICB0aGlzLmFsbC5wdXNoKGFjdGlvbik7XG4gICAgICB0aGlzW2FjdGlvbi5uYW1lXSA9IGFjdGlvbi5ydW4uYmluZChhY3Rpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBhY3Rpb247XG4gIH1cblxuICByZW1vdmVBY3Rpb24oaXRlbSkge1xuICAgIGNvbnN0IGFjdGlvbiA9IHRoaXMuZGV0ZWN0QWN0aW9uKGl0ZW0sIHRydWUpO1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5hbGwuaW5kZXhPZihhY3Rpb24pO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHRoaXMuYWxsLnNwbGljZShpbmRleCwgMSk7XG4gICAgZGVsZXRlIHRoaXNbYWN0aW9uLm5hbWVdO1xuICB9XG5cbiAgYWRkU3RvcmUoc3RvcmUpIHtcbiAgICB0aGlzLmFsbC5mb3JFYWNoKGFjdGlvbiA9PiBhY3Rpb24uYWRkU3RvcmUoc3RvcmUpKTtcbiAgfVxuXG4gIGRldGVjdEFjdGlvbihhY3Rpb24sIGlzT2xkKSB7XG4gICAgaWYgKGFjdGlvbi5jb25zdHJ1Y3RvciA9PT0gQWN0aW9uKSB7XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiAoaXNPbGQpID8gdGhpc1thY3Rpb25dIDogbmV3IEFjdGlvbih7bmFtZTogYWN0aW9ufSk7XG4gICAgfVxuICB9XG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF9pbnRlcm9wUmVxdWlyZSA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9ialtcImRlZmF1bHRcIl0gOiBvYmo7IH07XG5cbmV4cG9ydHMuY3JlYXRlVmlldyA9IGNyZWF0ZVZpZXc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgUmVhY3QgPSBfaW50ZXJvcFJlcXVpcmUoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdCddIDogbnVsbCkpO1xuXG52YXIgUmVhY3RSb3V0ZXIgPSBfaW50ZXJvcFJlcXVpcmUoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0Um91dGVyJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdFJvdXRlciddIDogbnVsbCkpO1xuXG5mdW5jdGlvbiBnZXRSb3V0ZXIoKSB7XG4gIHZhciBSb3V0ZXIgPSB7fTtcbiAgaWYgKHR5cGVvZiBSZWFjdFJvdXRlciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciByb3V0ZXJFbGVtZW50cyA9IFtcIlJvdXRlXCIsIFwiRGVmYXVsdFJvdXRlXCIsIFwiUm91dGVIYW5kbGVyXCIsIFwiQWN0aXZlSGFuZGxlclwiLCBcIk5vdEZvdW5kUm91dGVcIiwgXCJMaW5rXCIsIFwiUmVkaXJlY3RcIl0sXG4gICAgICAgIHJvdXRlck1peGlucyA9IFtcIk5hdmlnYXRpb25cIiwgXCJTdGF0ZVwiXSxcbiAgICAgICAgcm91dGVyRnVuY3Rpb25zID0gW1wiY3JlYXRlXCIsIFwiY3JlYXRlRGVmYXVsdFJvdXRlXCIsIFwiY3JlYXRlTm90Rm91bmRSb3V0ZVwiLCBcImNyZWF0ZVJlZGlyZWN0XCIsIFwiY3JlYXRlUm91dGVcIiwgXCJjcmVhdGVSb3V0ZXNGcm9tUmVhY3RDaGlsZHJlblwiLCBcInJ1blwiXSxcbiAgICAgICAgcm91dGVyT2JqZWN0cyA9IFtcIkhhc2hMb2NhdGlvblwiLCBcIkhpc3RvcnlcIiwgXCJIaXN0b3J5TG9jYXRpb25cIiwgXCJSZWZyZXNoTG9jYXRpb25cIiwgXCJTdGF0aWNMb2NhdGlvblwiLCBcIlRlc3RMb2NhdGlvblwiLCBcIkltaXRhdGVCcm93c2VyQmVoYXZpb3JcIiwgXCJTY3JvbGxUb1RvcEJlaGF2aW9yXCJdLFxuICAgICAgICBjb3BpZWRJdGVtcyA9IHJvdXRlck1peGlucy5jb25jYXQocm91dGVyRnVuY3Rpb25zKS5jb25jYXQocm91dGVyT2JqZWN0cyk7XG5cbiAgICByb3V0ZXJFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICBSb3V0ZXJbbmFtZV0gPSBSZWFjdC5jcmVhdGVFbGVtZW50LmJpbmQoUmVhY3QsIFJlYWN0Um91dGVyW25hbWVdKTtcbiAgICB9KTtcblxuICAgIGNvcGllZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgIFJvdXRlcltuYW1lXSA9IFJlYWN0Um91dGVyW25hbWVdO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBSb3V0ZXI7XG59XG5cbmZ1bmN0aW9uIGdldERPTSgpIHtcbiAgdmFyIERPTUhlbHBlcnMgPSB7fTtcblxuICBpZiAodHlwZW9mIFJlYWN0ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdmFyIHRhZyA9IGZ1bmN0aW9uIHRhZyhuYW1lKSB7XG4gICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgYXJnc1tfa2V5IC0gMV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgICB9XG5cbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gdW5kZWZpbmVkO1xuICAgICAgdmFyIGZpcnN0ID0gYXJnc1swXSAmJiBhcmdzWzBdLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKGZpcnN0ID09PSBPYmplY3QpIHtcbiAgICAgICAgYXR0cmlidXRlcyA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF0dHJpYnV0ZXMgPSB7fTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBSZWFjdC5ET01bbmFtZV0uYXBwbHkoUmVhY3QuRE9NLCBbYXR0cmlidXRlc10uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgdGFnTmFtZSBpbiBSZWFjdC5ET00pIHtcbiAgICAgIERPTUhlbHBlcnNbdGFnTmFtZV0gPSB0YWcuYmluZCh0aGlzLCB0YWdOYW1lKTtcbiAgICB9XG5cbiAgICBET01IZWxwZXJzLnNwYWNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFJlYWN0LkRPTS5zcGFuKHtcbiAgICAgICAgZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw6IHtcbiAgICAgICAgICBfX2h0bWw6IFwiJm5ic3A7XCJcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gRE9NSGVscGVycztcbn1cblxudmFyIFJvdXRlciA9IGdldFJvdXRlcigpO1xuZXhwb3J0cy5Sb3V0ZXIgPSBSb3V0ZXI7XG52YXIgRE9NID0gZ2V0RE9NKCk7XG5cbmV4cG9ydHMuRE9NID0gRE9NO1xuXG5mdW5jdGlvbiBjcmVhdGVWaWV3KGNsYXNzQXJncykge1xuICB2YXIgUmVhY3RDbGFzcyA9IFJlYWN0LmNyZWF0ZUNsYXNzKGNsYXNzQXJncyk7XG4gIHZhciBSZWFjdEVsZW1lbnQgPSBSZWFjdC5jcmVhdGVFbGVtZW50LmJpbmQoUmVhY3QuY3JlYXRlRWxlbWVudCwgUmVhY3RDbGFzcyk7XG4gIHJldHVybiBSZWFjdEVsZW1lbnQ7XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSWk5VmMyVnljeTluYjNOb1lXdHJheTlRY205cVpXTjBjeTl2YzNNdlpYaHBiUzFtYjNKckwzTnlZeTlFVDAxSVpXeHdaWEp6TG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lJN096czdPMUZCZDBSblFpeFZRVUZWTEVkQlFWWXNWVUZCVlRzN096czdTVUY0Ukc1Q0xFdEJRVXNzTWtKQlFVMHNUMEZCVHpzN1NVRkRiRUlzVjBGQlZ5d3lRa0ZCVFN4alFVRmpPenRCUVVWMFF5eFRRVUZUTEZOQlFWTXNSMEZCU1R0QlFVTndRaXhOUVVGTkxFMUJRVTBzUjBGQlJ5eEZRVUZGTEVOQlFVTTdRVUZEYkVJc1RVRkJTU3hQUVVGUExGZEJRVmNzUzBGQlN5eFhRVUZYTEVWQlFVVTdRVUZEZEVNc1VVRkJTU3hqUVVGakxFZEJRVWNzUTBGQlF5eFBRVUZQTEVWQlFVVXNZMEZCWXl4RlFVRkZMR05CUVdNc1JVRkJSU3hsUVVGbExFVkJRVVVzWlVGQlpTeEZRVUZGTEUxQlFVMHNSVUZCUlN4VlFVRlZMRU5CUVVNN1VVRkRjRWdzV1VGQldTeEhRVUZITEVOQlFVTXNXVUZCV1N4RlFVRkZMRTlCUVU4c1EwRkJRenRSUVVOMFF5eGxRVUZsTEVkQlFVY3NRMEZCUXl4UlFVRlJMRVZCUVVVc2IwSkJRVzlDTEVWQlFVVXNjVUpCUVhGQ0xFVkJRVVVzWjBKQlFXZENMRVZCUVVVc1lVRkJZU3hGUVVGRkxDdENRVUVyUWl4RlFVRkZMRXRCUVVzc1EwRkJRenRSUVVOc1NpeGhRVUZoTEVkQlFVY3NRMEZCUXl4alFVRmpMRVZCUVVVc1UwRkJVeXhGUVVGRkxHbENRVUZwUWl4RlFVRkZMR2xDUVVGcFFpeEZRVUZGTEdkQ1FVRm5RaXhGUVVGRkxHTkJRV01zUlVGQlJTeDNRa0ZCZDBJc1JVRkJSU3h4UWtGQmNVSXNRMEZCUXp0UlFVTndTeXhYUVVGWExFZEJRVWNzV1VGQldTeERRVUZETEUxQlFVMHNRMEZCUXl4bFFVRmxMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTTdPMEZCUlhwRkxHdENRVUZqTEVOQlFVTXNUMEZCVHl4RFFVRkRMRlZCUVZNc1NVRkJTU3hGUVVGRk8wRkJRM0JETEZsQlFVMHNRMEZCUXl4SlFVRkpMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU1zWVVGQllTeERRVUZETEVsQlFVa3NRMEZCUXl4TFFVRkxMRVZCUVVVc1YwRkJWeXhEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETEVOQlFVTTdTMEZEYmtVc1EwRkJReXhEUVVGRE96dEJRVVZJTEdWQlFWY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1ZVRkJVeXhKUVVGSkxFVkJRVVU3UVVGRGFrTXNXVUZCVFN4RFFVRkRMRWxCUVVrc1EwRkJReXhIUVVGSExGZEJRVmNzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0TFFVTnNReXhEUVVGRExFTkJRVU03UjBGRFNqdEJRVU5FTEZOQlFVOHNUVUZCVFN4RFFVRkRPME5CUTJZN08wRkJSVVFzVTBGQlV5eE5RVUZOTEVkQlFVazdRVUZEYWtJc1RVRkJUU3hWUVVGVkxFZEJRVWNzUlVGQlJTeERRVUZET3p0QlFVVjBRaXhOUVVGSkxFOUJRVThzUzBGQlN5eExRVUZMTEZkQlFWY3NSVUZCUlR0QlFVTm9ReXhSUVVGSkxFZEJRVWNzUjBGQlJ5eGhRVUZWTEVsQlFVa3NSVUZCVnp0M1EwRkJUaXhKUVVGSk8wRkJRVW9zV1VGQlNUczdPMEZCUXk5Q0xGVkJRVWtzVlVGQlZTeFpRVUZCTEVOQlFVTTdRVUZEWml4VlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlF5eERRVUZETEVsQlFVa3NTVUZCU1N4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExGZEJRVmNzUTBGQlF6dEJRVU16UXl4VlFVRkpMRXRCUVVzc1MwRkJTeXhOUVVGTkxFVkJRVVU3UVVGRGNFSXNhMEpCUVZVc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eEZRVUZGTEVOQlFVTTdUMEZETTBJc1RVRkJUVHRCUVVOTUxHdENRVUZWTEVkQlFVY3NSVUZCUlN4RFFVRkRPMDlCUTJwQ08wRkJRMFFzWVVGQlR5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRExFdEJRVXNzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RlFVRkZMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRMRU5CUVVNN1MwRkRjRVVzUTBGQlF6czdRVUZGUml4VFFVRkxMRWxCUVVrc1QwRkJUeXhKUVVGSkxFdEJRVXNzUTBGQlF5eEhRVUZITEVWQlFVVTdRVUZETjBJc1owSkJRVlVzUTBGQlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4SFFVRkhMRU5CUVVNc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0TFFVTXZRenM3UVVGRlJDeGpRVUZWTEVOQlFVTXNTMEZCU3l4SFFVRkhMRmxCUVZjN1FVRkROVUlzWVVGQlR5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJRenRCUVVOd1Fpd3JRa0ZCZFVJc1JVRkJSVHRCUVVOMlFpeG5Ra0ZCVFN4RlFVRkZMRkZCUVZFN1UwRkRha0k3VDBGRFJpeERRVUZETEVOQlFVTTdTMEZEU2l4RFFVRkRPMGRCUTBnN1FVRkRSQ3hUUVVGUExGVkJRVlVzUTBGQlF6dERRVU51UWpzN1FVRkZUU3hKUVVGTkxFMUJRVTBzUjBGQlJ5eFRRVUZUTEVWQlFVVXNRMEZCUXp0UlFVRnlRaXhOUVVGTkxFZEJRVTRzVFVGQlRUdEJRVU5hTEVsQlFVMHNSMEZCUnl4SFFVRkhMRTFCUVUwc1JVRkJSU3hEUVVGRE96dFJRVUZtTEVkQlFVY3NSMEZCU0N4SFFVRkhPenRCUVVWVUxGTkJRVk1zVlVGQlZTeERRVUZGTEZOQlFWTXNSVUZCUlR0QlFVTnlReXhOUVVGSkxGVkJRVlVzUjBGQlJ5eExRVUZMTEVOQlFVTXNWMEZCVnl4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRE8wRkJRemxETEUxQlFVa3NXVUZCV1N4SFFVRkhMRXRCUVVzc1EwRkJReXhoUVVGaExFTkJRVU1zU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4aFFVRmhMRVZCUVVVc1ZVRkJWU3hEUVVGRExFTkJRVU03UVVGRE4wVXNVMEZCVHl4WlFVRlpMRU5CUVVNN1EwRkRja0lpTENKbWFXeGxJam9pWjJWdVpYSmhkR1ZrTG1weklpd2ljMjkxY21ObFVtOXZkQ0k2SWlJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYkltbHRjRzl5ZENCU1pXRmpkQ0JtY205dElDZHlaV0ZqZENjN1hHNXBiWEJ2Y25RZ1VtVmhZM1JTYjNWMFpYSWdabkp2YlNBbmNtVmhZM1F0Y205MWRHVnlKenRjYmx4dVpuVnVZM1JwYjI0Z1oyVjBVbTkxZEdWeUlDZ3BJSHRjYmlBZ1kyOXVjM1FnVW05MWRHVnlJRDBnZTMwN1hHNGdJR2xtSUNoMGVYQmxiMllnVW1WaFkzUlNiM1YwWlhJZ0lUMDlJQ2QxYm1SbFptbHVaV1FuS1NCN1hHNGdJQ0FnYkdWMElISnZkWFJsY2tWc1pXMWxiblJ6SUQwZ1d5ZFNiM1YwWlNjc0lDZEVaV1poZFd4MFVtOTFkR1VuTENBblVtOTFkR1ZJWVc1a2JHVnlKeXdnSjBGamRHbDJaVWhoYm1Sc1pYSW5MQ0FuVG05MFJtOTFibVJTYjNWMFpTY3NJQ2RNYVc1ckp5d2dKMUpsWkdseVpXTjBKMTBzWEc0Z0lDQWdjbTkxZEdWeVRXbDRhVzV6SUQwZ1d5ZE9ZWFpwWjJGMGFXOXVKeXdnSjFOMFlYUmxKMTBzWEc0Z0lDQWdjbTkxZEdWeVJuVnVZM1JwYjI1eklEMGdXeWRqY21WaGRHVW5MQ0FuWTNKbFlYUmxSR1ZtWVhWc2RGSnZkWFJsSnl3Z0oyTnlaV0YwWlU1dmRFWnZkVzVrVW05MWRHVW5MQ0FuWTNKbFlYUmxVbVZrYVhKbFkzUW5MQ0FuWTNKbFlYUmxVbTkxZEdVbkxDQW5ZM0psWVhSbFVtOTFkR1Z6Um5KdmJWSmxZV04wUTJocGJHUnlaVzRuTENBbmNuVnVKMTBzWEc0Z0lDQWdjbTkxZEdWeVQySnFaV04wY3lBOUlGc25TR0Z6YUV4dlkyRjBhVzl1Snl3Z0owaHBjM1J2Y25rbkxDQW5TR2x6ZEc5eWVVeHZZMkYwYVc5dUp5d2dKMUpsWm5KbGMyaE1iMk5oZEdsdmJpY3NJQ2RUZEdGMGFXTk1iMk5oZEdsdmJpY3NJQ2RVWlhOMFRHOWpZWFJwYjI0bkxDQW5TVzFwZEdGMFpVSnliM2R6WlhKQ1pXaGhkbWx2Y2ljc0lDZFRZM0p2Ykd4VWIxUnZjRUpsYUdGMmFXOXlKMTBzWEc0Z0lDQWdZMjl3YVdWa1NYUmxiWE1nUFNCeWIzVjBaWEpOYVhocGJuTXVZMjl1WTJGMEtISnZkWFJsY2taMWJtTjBhVzl1Y3lrdVkyOXVZMkYwS0hKdmRYUmxjazlpYW1WamRITXBPMXh1WEc0Z0lDQWdjbTkxZEdWeVJXeGxiV1Z1ZEhNdVptOXlSV0ZqYUNobWRXNWpkR2x2YmlodVlXMWxLU0I3WEc0Z0lDQWdJQ0JTYjNWMFpYSmJibUZ0WlYwZ1BTQlNaV0ZqZEM1amNtVmhkR1ZGYkdWdFpXNTBMbUpwYm1Rb1VtVmhZM1FzSUZKbFlXTjBVbTkxZEdWeVcyNWhiV1ZkS1R0Y2JpQWdJQ0I5S1R0Y2JseHVJQ0FnSUdOdmNHbGxaRWwwWlcxekxtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2JtRnRaU2tnZTF4dUlDQWdJQ0FnVW05MWRHVnlXMjVoYldWZElEMGdVbVZoWTNSU2IzVjBaWEpiYm1GdFpWMDdYRzRnSUNBZ2ZTazdYRzRnSUgxY2JpQWdjbVYwZFhKdUlGSnZkWFJsY2p0Y2JuMWNibHh1Wm5WdVkzUnBiMjRnWjJWMFJFOU5JQ2dwSUh0Y2JpQWdZMjl1YzNRZ1JFOU5TR1ZzY0dWeWN5QTlJSHQ5TzF4dVhHNGdJR2xtSUNoMGVYQmxiMllnVW1WaFkzUWdJVDA5SUNkMWJtUmxabWx1WldRbktTQjdYRzRnSUNBZ2JHVjBJSFJoWnlBOUlHWjFibU4wYVc5dUlDaHVZVzFsTENBdUxpNWhjbWR6S1NCN1hHNGdJQ0FnSUNCc1pYUWdZWFIwY21saWRYUmxjenRjYmlBZ0lDQWdJR3hsZENCbWFYSnpkQ0E5SUdGeVozTmJNRjBnSmlZZ1lYSm5jMXN3WFM1amIyNXpkSEoxWTNSdmNqdGNiaUFnSUNBZ0lHbG1JQ2htYVhKemRDQTlQVDBnVDJKcVpXTjBLU0I3WEc0Z0lDQWdJQ0FnSUdGMGRISnBZblYwWlhNZ1BTQmhjbWR6TG5Ob2FXWjBLQ2s3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0JoZEhSeWFXSjFkR1Z6SUQwZ2UzMDdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQnlaWFIxY200Z1VtVmhZM1F1UkU5TlcyNWhiV1ZkTG1Gd2NHeDVLRkpsWVdOMExrUlBUU3dnVzJGMGRISnBZblYwWlhOZExtTnZibU5oZENoaGNtZHpLU2s3WEc0Z0lDQWdmVHRjYmx4dUlDQWdJR1p2Y2lBb2JHVjBJSFJoWjA1aGJXVWdhVzRnVW1WaFkzUXVSRTlOS1NCN1hHNGdJQ0FnSUNCRVQwMUlaV3h3WlhKelczUmhaMDVoYldWZElEMGdkR0ZuTG1KcGJtUW9kR2hwY3l3Z2RHRm5UbUZ0WlNrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnUkU5TlNHVnNjR1Z5Y3k1emNHRmpaU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUZKbFlXTjBMa1JQVFM1emNHRnVLSHRjYmlBZ0lDQWdJQ0FnWkdGdVoyVnliM1Z6YkhsVFpYUkpibTVsY2toVVRVdzZJSHRjYmlBZ0lDQWdJQ0FnSUNCZlgyaDBiV3c2SUNjbWJtSnpjRHNuWEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwcE8xeHVJQ0FnSUgwN1hHNGdJSDFjYmlBZ2NtVjBkWEp1SUVSUFRVaGxiSEJsY25NN1hHNTlYRzVjYm1WNGNHOXlkQ0JqYjI1emRDQlNiM1YwWlhJZ1BTQm5aWFJTYjNWMFpYSW9LVHRjYm1WNGNHOXlkQ0JqYjI1emRDQkVUMDBnUFNCblpYUkVUMDBvS1R0Y2JseHVaWGh3YjNKMElHWjFibU4wYVc5dUlHTnlaV0YwWlZacFpYY2dLR05zWVhOelFYSm5jeWtnZTF4dUlDQnNaWFFnVW1WaFkzUkRiR0Z6Y3lBOUlGSmxZV04wTG1OeVpXRjBaVU5zWVhOektHTnNZWE56UVhKbmN5azdYRzRnSUd4bGRDQlNaV0ZqZEVWc1pXMWxiblFnUFNCU1pXRmpkQzVqY21WaGRHVkZiR1Z0Wlc1MExtSnBibVFvVW1WaFkzUXVZM0psWVhSbFJXeGxiV1Z1ZEN3Z1VtVmhZM1JEYkdGemN5azdYRzRnSUhKbGRIVnliaUJTWldGamRFVnNaVzFsYm5RN1hHNTlYRzRpWFgwPSIsImltcG9ydCB7QWN0aW9uc30gZnJvbSAnLi9BY3Rpb25zJztcbmltcG9ydCB1dGlscyBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBGcmVlemVyIGZyb20gJ2ZyZWV6ZXItanMnO1xuaW1wb3J0IGdldENvbm5lY3RNaXhpbiBmcm9tICcuL21peGlucy9jb25uZWN0JztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdG9yZSB7XG4gIGNvbnN0cnVjdG9yKGFyZ3M9e30pIHtcbiAgICBsZXQge2FjdGlvbnMsIGluaXRpYWx9ID0gYXJncztcbiAgICBsZXQgaW5pdCA9IHR5cGVvZiBpbml0aWFsID09PSAnZnVuY3Rpb24nID8gaW5pdGlhbCgpIDogaW5pdGlhbDtcbiAgICBsZXQgc3RvcmUgPSBuZXcgRnJlZXplcihpbml0IHx8IHt9KTtcblxuICAgIHRoaXMuY29ubmVjdCA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICByZXR1cm4gZ2V0Q29ubmVjdE1peGluKHRoaXMsIGFyZ3MpO1xuICAgIH07XG5cbiAgICB0aGlzLmhhbmRsZXJzID0gYXJncy5oYW5kbGVycyB8fCB1dGlscy5nZXRXaXRob3V0RmllbGRzKFsnYWN0aW9ucyddLCBhcmdzKSB8fCB7fTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KGFjdGlvbnMpKSB7XG4gICAgICB0aGlzLmFjdGlvbnMgPSBhY3Rpb25zID0gbmV3IEFjdGlvbnMoYWN0aW9ucyk7XG4gICAgICB0aGlzLmFjdGlvbnMuYWRkU3RvcmUodGhpcyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2V0ID0gZnVuY3Rpb24gKGl0ZW0sIHZhbHVlKSB7XG4gICAgICBzdG9yZS5nZXQoKS5zZXQoaXRlbSwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBjb25zdCBnZXQgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyB8fCB0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgcmV0dXJuIHN0b3JlLmdldCgpLnRvSlMoKVtpdGVtXTtcbiAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShpdGVtKSkge1xuICAgICAgICByZXR1cm4gaXRlbS5tYXAoa2V5ID0+IGdldChrZXkpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzdG9yZS5nZXQoKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgY29uc3QgcmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLnNldChpbml0KTtcbiAgICB9O1xuXG4gICAgdGhpcy5zZXQgPSBzZXQ7XG4gICAgdGhpcy5nZXQgPSBnZXQ7XG4gICAgdGhpcy5yZXNldCA9IHJlc2V0O1xuICAgIHRoaXMuc3RvcmUgPSBzdG9yZTtcblxuICAgIHRoaXMuc3RhdGVQcm90byA9IHtzZXQsIGdldCwgcmVzZXQsIGFjdGlvbnN9O1xuICAgIC8vdGhpcy5nZXR0ZXIgPSBuZXcgR2V0dGVyKHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgYWRkQWN0aW9uKGl0ZW0pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShpdGVtKSkge1xuICAgICAgdGhpcy5hY3Rpb25zID0gdGhpcy5hY3Rpb25zLmNvbmNhdCh0aGlzLmFjdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XG4gICAgICB0aGlzLmFjdGlvbnMucHVzaChpdGVtKTtcbiAgICB9XG4gIH1cblxuICByZW1vdmVBY3Rpb24oaXRlbSkge1xuICAgIHZhciBhY3Rpb247XG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgYWN0aW9uID0gdGhpcy5maW5kQnlOYW1lKCdhY3Rpb25zJywgJ25hbWUnLCBpdGVtKTtcbiAgICAgIGlmIChhY3Rpb24pIGFjdGlvbi5yZW1vdmVTdG9yZSh0aGlzKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgYWN0aW9uID0gaXRlbTtcbiAgICAgIGxldCBpbmRleCA9IHRoaXMuYWN0aW9ucy5pbmRleE9mKGFjdGlvbik7XG4gICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgIGFjdGlvbi5yZW1vdmVTdG9yZSh0aGlzKTtcbiAgICAgICAgdGhpcy5hY3Rpb25zID0gdGhpcy5hY3Rpb25zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0QWN0aW9uQ3ljbGUoYWN0aW9uTmFtZSwgcHJlZml4PSdvbicpIHtcbiAgICBjb25zdCBjYXBpdGFsaXplZCA9IHV0aWxzLmNhcGl0YWxpemUoYWN0aW9uTmFtZSk7XG4gICAgY29uc3QgZnVsbEFjdGlvbk5hbWUgPSBgJHtwcmVmaXh9JHtjYXBpdGFsaXplZH1gO1xuICAgIGNvbnN0IGhhbmRsZXIgPSB0aGlzLmhhbmRsZXJzW2Z1bGxBY3Rpb25OYW1lXSB8fCB0aGlzLmhhbmRsZXJzW2FjdGlvbk5hbWVdO1xuICAgIGlmICghaGFuZGxlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBoYW5kbGVycyBmb3IgJHthY3Rpb25OYW1lfSBhY3Rpb24gZGVmaW5lZCBpbiBjdXJyZW50IHN0b3JlYCk7XG4gICAgfVxuXG4gICAgbGV0IGFjdGlvbnM7XG4gICAgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnb2JqZWN0Jykge1xuICAgICAgYWN0aW9ucyA9IGhhbmRsZXI7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYWN0aW9ucyA9IHtvbjogaGFuZGxlcn07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHtoYW5kbGVyfSBtdXN0IGJlIGFuIG9iamVjdCBvciBmdW5jdGlvbmApO1xuICAgIH1cbiAgICByZXR1cm4gYWN0aW9ucztcbiAgfVxuXG4gIC8vIDEuIHdpbGwoaW5pdGlhbCkgPT4gd2lsbFJlc3VsdFxuICAvLyAyLiB3aGlsZSh0cnVlKVxuICAvLyAzLiBvbih3aWxsUmVzdWx0IHx8IGluaXRpYWwpID0+IG9uUmVzdWx0XG4gIC8vIDQuIHdoaWxlKGZhbHNlKVxuICAvLyA1LiBkaWQob25SZXN1bHQpXG4gIHJ1bkN5Y2xlKGFjdGlvbk5hbWUsIC4uLmFyZ3MpIHtcbiAgICAvLyBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHJlc29sdmUodHJ1ZSkpXG4gICAgY29uc3QgY3ljbGUgPSB0aGlzLmdldEFjdGlvbkN5Y2xlKGFjdGlvbk5hbWUpO1xuICAgIGxldCBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgbGV0IHdpbGwgPSBjeWNsZS53aWxsLCB3aGlsZV8gPSBjeWNsZS53aGlsZSwgb25fID0gY3ljbGUub247XG4gICAgbGV0IGRpZCA9IGN5Y2xlLmRpZCwgZGlkTm90ID0gY3ljbGUuZGlkTm90O1xuXG4gICAgLy8gTG9jYWwgc3RhdGUgZm9yIHRoaXMgY3ljbGUuXG4gICAgbGV0IHN0YXRlID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnN0YXRlUHJvdG8pO1xuXG4gICAgLy8gUHJlLWNoZWNrICYgcHJlcGFyYXRpb25zLlxuICAgIGlmICh3aWxsKSBwcm9taXNlID0gcHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgIHJldHVybiB3aWxsLmFwcGx5KHN0YXRlLCBhcmdzKTtcbiAgICB9KTtcblxuICAgIC8vIFN0YXJ0IHdoaWxlKCkuXG4gICAgaWYgKHdoaWxlXykgcHJvbWlzZSA9IHByb21pc2UudGhlbigod2lsbFJlc3VsdCkgPT4ge1xuICAgICAgd2hpbGVfLmNhbGwoc3RhdGUsIHRydWUpO1xuICAgICAgcmV0dXJuIHdpbGxSZXN1bHQ7XG4gICAgfSk7XG5cbiAgICAvLyBBY3R1YWwgZXhlY3V0aW9uLlxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKHdpbGxSZXN1bHQpID0+IHtcbiAgICAgIGlmICh3aWxsUmVzdWx0ID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG9uXy5hcHBseShzdGF0ZSwgYXJncyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gb25fLmNhbGwoc3RhdGUsIHdpbGxSZXN1bHQpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gU3RvcCB3aGlsZSgpLlxuICAgIGlmICh3aGlsZV8pIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKG9uUmVzdWx0KSA9PiB7XG4gICAgICB3aGlsZV8uY2FsbChzdGF0ZSwgZmFsc2UpO1xuICAgICAgcmV0dXJuIG9uUmVzdWx0O1xuICAgIH0pO1xuXG4gICAgLy8gRm9yIGRpZCBhbmQgZGlkTm90IHN0YXRlIGlzIGZyZWV6ZWQuXG4gICAgcHJvbWlzZSA9IHByb21pc2UudGhlbigob25SZXN1bHQpID0+IHtcbiAgICAgIE9iamVjdC5mcmVlemUoc3RhdGUpO1xuICAgICAgcmV0dXJuIG9uUmVzdWx0O1xuICAgIH0pO1xuXG4gICAgLy8gSGFuZGxlIHRoZSByZXN1bHQuXG4gICAgaWYgKGRpZCkgcHJvbWlzZSA9IHByb21pc2UudGhlbihvblJlc3VsdCA9PiB7XG4gICAgICByZXR1cm4gZGlkLmNhbGwoc3RhdGUsIG9uUmVzdWx0KTtcbiAgICB9KTtcblxuICAgIHByb21pc2UuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgaWYgKHdoaWxlXykgd2hpbGVfLmNhbGwodGhpcywgc3RhdGUsIGZhbHNlKTtcbiAgICAgIGlmIChkaWROb3QpIHtcbiAgICAgICAgZGlkTm90LmNhbGwoc3RhdGUsIGVycm9yKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycm9yO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cbn1cbiIsImV4cG9ydCBkZWZhdWx0IHtcbiAgY3g6IGZ1bmN0aW9uIChjbGFzc05hbWVzKSB7XG4gICAgaWYgKHR5cGVvZiBjbGFzc05hbWVzID09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoY2xhc3NOYW1lcykuZmlsdGVyKGZ1bmN0aW9uKGNsYXNzTmFtZSkge1xuICAgICAgICByZXR1cm4gY2xhc3NOYW1lc1tjbGFzc05hbWVdO1xuICAgICAgfSkuam9pbignICcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gQXJyYXkucHJvdG90eXBlLmpvaW4uY2FsbChhcmd1bWVudHMsICcgJyk7XG4gICAgfVxuICB9XG59O1xuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2V0Q29ubmVjdE1peGluIChzdG9yZSwgLi4ua2V5cykge1xuICBsZXQgY2hhbmdlQ2FsbGJhY2sgPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICB0aGlzLnNldFN0YXRlKHN0YXRlLnRvSlMoKSk7XG4gIH07XG5cbiAgbGV0IGxpc3RlbmVyO1xuXG4gIHJldHVybiB7XG4gICAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldChrZXlzKTtcblxuICAgICAgaWYgKCF0aGlzLmJvdW5kRXhpbUNoYW5nZUNhbGxiYWNrcylcbiAgICAgICAgdGhpcy5ib3VuZEV4aW1DaGFuZ2VDYWxsYmFja3MgPSB7fTtcblxuICAgICAgdGhpcy5ib3VuZEV4aW1DaGFuZ2VDYWxsYmFja3Nbc3RvcmVdID0gY2hhbmdlQ2FsbGJhY2suYmluZCh0aGlzKTtcblxuICAgICAgbGlzdGVuZXIgPSBzdG9yZS5zdG9yZS5nZXQoKS5nZXRMaXN0ZW5lcigpO1xuICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH0sXG5cbiAgICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgICAgbGlzdGVuZXIub24oJ3VwZGF0ZScsIHRoaXMuYm91bmRFeGltQ2hhbmdlQ2FsbGJhY2tzW3N0b3JlXSk7XG4gICAgfSxcblxuICAgIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAobGlzdGVuZXIpXG4gICAgICAgIGxpc3RlbmVyLm9mZigndXBkYXRlJywgdGhpcy5ib3VuZEV4aW1DaGFuZ2VDYWxsYmFja3Nbc3RvcmVdKTtcbiAgICB9XG4gIH07XG59XG4iLCJjb25zdCB1dGlscyA9IHt9O1xuXG51dGlscy5nZXRXaXRob3V0RmllbGRzID0gZnVuY3Rpb24gKG91dGNhc3QsIHRhcmdldCkge1xuICBpZiAoIXRhcmdldCkgdGhyb3cgbmV3IEVycm9yKCdUeXBlRXJyb3I6IHRhcmdldCBpcyBub3QgYW4gb2JqZWN0LicpO1xuICB2YXIgcmVzdWx0ID0ge307XG4gIGlmICh0eXBlb2Ygb3V0Y2FzdCA9PT0gJ3N0cmluZycpIG91dGNhc3QgPSBbb3V0Y2FzdF07XG4gIHZhciB0S2V5cyA9IE9iamVjdC5rZXlzKHRhcmdldCk7XG4gIG91dGNhc3QuZm9yRWFjaChmdW5jdGlvbihmaWVsZE5hbWUpIHtcbiAgICB0S2V5c1xuICAgICAgLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgcmV0dXJuIGtleSAhPT0gZmllbGROYW1lO1xuICAgICAgfSlcbiAgICAgIC5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXN1bHRba2V5XSA9IHRhcmdldFtrZXldO1xuICAgICAgfSk7XG4gIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufTtcblxudXRpbHMub2JqZWN0VG9BcnJheSA9IGZ1bmN0aW9uIChvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdCkubWFwKGtleSA9PiBvYmplY3Rba2V5XSk7XG59O1xuXG51dGlscy5jbGFzc1dpdGhBcmdzID0gZnVuY3Rpb24gKEl0ZW0sIGFyZ3MpIHtcbiAgcmV0dXJuIEl0ZW0uYmluZC5hcHBseShJdGVtLFtJdGVtXS5jb25jYXQoYXJncykpO1xufTtcblxuLy8gMS4gd2lsbFxuLy8gMi4gd2hpbGUodHJ1ZSlcbi8vIDMuIG9uXG4vLyA0LiB3aGlsZShmYWxzZSlcbi8vIDUuIGRpZCBvciBkaWROb3RcbnV0aWxzLm1hcEFjdGlvbk5hbWVzID0gZnVuY3Rpb24ob2JqZWN0KSB7XG4gIGNvbnN0IGxpc3QgPSBbXTtcbiAgY29uc3QgcHJlZml4ZXMgPSBbJ3dpbGwnLCAnd2hpbGVTdGFydCcsICdvbicsICd3aGlsZUVuZCcsICdkaWQnLCAnZGlkTm90J107XG4gIHByZWZpeGVzLmZvckVhY2goaXRlbSA9PiB7XG4gICAgbGV0IG5hbWUgPSBpdGVtO1xuICAgIGlmIChpdGVtID09PSAnd2hpbGVTdGFydCcgfHwgaXRlbSA9PT0gJ3doaWxlRW5kJykge1xuICAgICAgbmFtZSA9ICd3aGlsZSc7XG4gICAgfVxuICAgIGlmIChvYmplY3RbbmFtZV0pIHtcbiAgICAgIGxpc3QucHVzaChbaXRlbSwgb2JqZWN0W25hbWVdXSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGxpc3Q7XG59O1xuXG51dGlscy5pc09iamVjdCA9IGZ1bmN0aW9uICh0YXJnKSB7XG4gIHJldHVybiB0YXJnID8gdGFyZy50b1N0cmluZygpLnNsaWNlKDgsMTQpID09PSAnT2JqZWN0JyA6IGZhbHNlO1xufTtcbnV0aWxzLmNhcGl0YWxpemUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gIGNvbnN0IGZpcnN0ID0gc3RyLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpO1xuICBjb25zdCByZXN0ID0gc3RyLnNsaWNlKDEpO1xuICByZXR1cm4gYCR7Zmlyc3R9JHtyZXN0fWA7XG59O1xuXG5leHBvcnQgZGVmYXVsdCB1dGlscztcbiJdfQ==
