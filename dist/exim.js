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
				if( listeners[i] === listener )
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
			frozen = this.freeze( node, node.__.notify, node.__.freezeFn, node.__.live );
		}

		return frozen;
	},

	merge: function( node, attrs ){
		var trans = node.__.trans,

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
			notify = node.__.notify,
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
				val = me.freeze( val, notify, node.__.freezeFn, node.__.live );

			if( val && val.__ )
				me.addParent( val, frozen );

			delete attrs[ key ];

			frozen[ key ] = val;
		});


		for( key in attrs ) {
			val = attrs[ key ];
			cons = val && val.constructor;

			if( cons == Array || cons == Object )
				val = me.freeze( val, notify, node.__.freezeFn, node.__.live );

			if( val && val.__ )
				me.addParent( val, frozen );

			frozen[ key ] = val;
		}

		node.__.freezeFn( frozen );

		this.refreshParents( node, frozen );

		return frozen;
	},

	replace: function( node, replacement ) {

		var me = this,
			cons = replacement && replacement.constructor,
			__ = node.__,
			frozen = replacement
		;

		if( cons == Array || cons == Object ) {

			frozen = me.freeze( replacement, __.notify, __.freezeFn, __.live );

			frozen.__.parents = __.parents;

			// Add the current listener if exists, replacing a
			// previous listener in the frozen if existed
			if( __.listener )
				frozen.__.listener = node.__.listener;

			// Since the parents will be refreshed directly,
			// Trigger the listener here
			if( frozen.__.listener )
				this.trigger( frozen, 'update', frozen );
		}

		// Refresh the parent nodes directly
		if( !__.parents.length && __.listener ){
			__.listener.trigger( 'immediate', node, frozen );
		}
		for (var i = __.parents.length - 1; i >= 0; i--) {
			if( i == 0 ){
				this.refresh( __.parents[i], node, frozen, false );
			}
			else{

				this.markDirty( __.parents[i], [node, frozen] );
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
		var trans = node.__.trans;
		if( trans ){
			trans.splice.apply( trans, args );
			return node;
		}

		var me = this,
			frozen = this.copyMeta( node ),
			index = args[0],
			deleteIndex = index + args[1],
			__ = node.__,
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
					child = this.freeze( child, __.notify, __.freezeFn, __.live );

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

			me.addParent( node );
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

		var __ = node.__;

		Utils.addNE( frozen, {__: {
			notify: __.notify,
			listener: __.listener,
			parents: __.parents.slice( 0 ),
			trans: __.trans,
			dirty: false,
			freezeFn: __.freezeFn
		}});

		return frozen;
	},

	refreshParents: function( oldChild, newChild ){
		var __ = oldChild.__,
			i
		;

		if( __.listener )
			this.trigger( newChild, 'update', newChild );

		if( !__.parents.length ){
			if( __.listener ){
				__.listener.trigger( 'immediate', oldChild, newChild );
			}
		}
		else {
			for (i = __.parents.length - 1; i >= 0; i--) {
				// If there is more than one parent, mark everyone as dirty
				// but the last in the iteration, and when the last is refreshed
				// it will update the dirty nodes.
				if( i == 0 )
					this.refresh( __.parents[i], oldChild, newChild, false );
				else{

					this.markDirty( __.parents[i], [oldChild, newChild] );
				}
			}
		}
	},

	markDirty: function( node, dirt ){
		var __ = node.__,
			i
		;
		__.dirty = dirt;

		// If there is a transaction happening in the node
		// update the transaction data immediately
		if( __.trans )
			this.refresh( node, dirt[0], dirt[1] );

		for ( i = __.parents.length - 1; i >= 0; i-- ) {

			this.markDirty( __.parents[i], dirt );
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImU6L2NvZGUvZWxpeGVyL3Jlc3RydWN0dXJlL3dlYi9wYWNrYWdlcy9leGltL3NyYy9ET01IZWxwZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O1FBd0RnQixVQUFVLEdBQVYsVUFBVTs7Ozs7SUF4RG5CLEtBQUssMkJBQU0sT0FBTzs7SUFDbEIsV0FBVywyQkFBTSxjQUFjOztBQUV0QyxTQUFTLFNBQVMsR0FBSTtBQUNwQixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUM7QUFDbEIsTUFBSSxPQUFPLFdBQVcsS0FBSyxXQUFXLEVBQUU7QUFDdEMsUUFBSSxjQUFjLEdBQUcsQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUM7UUFDcEgsWUFBWSxHQUFHLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQztRQUN0QyxlQUFlLEdBQUcsQ0FBQyxRQUFRLEVBQUUsb0JBQW9CLEVBQUUscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLCtCQUErQixFQUFFLEtBQUssQ0FBQztRQUNsSixhQUFhLEdBQUcsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSxxQkFBcUIsQ0FBQztRQUNwSyxXQUFXLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUM7O0FBRXpFLGtCQUFjLENBQUMsT0FBTyxDQUFDLFVBQVMsSUFBSSxFQUFFO0FBQ3BDLFlBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDbkUsQ0FBQyxDQUFDOztBQUVILGVBQVcsQ0FBQyxPQUFPLENBQUMsVUFBUyxJQUFJLEVBQUU7QUFDakMsWUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNsQyxDQUFDLENBQUM7R0FDSjtBQUNELFNBQU8sTUFBTSxDQUFDO0NBQ2Y7O0FBRUQsU0FBUyxNQUFNLEdBQUk7QUFDakIsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDOztBQUV0QixNQUFJLE9BQU8sS0FBSyxLQUFLLFdBQVcsRUFBRTtBQUNoQyxRQUFJLEdBQUcsR0FBRyxhQUFVLElBQUksRUFBVzt3Q0FBTixJQUFJO0FBQUosWUFBSTs7O0FBQy9CLFVBQUksVUFBVSxZQUFBLENBQUM7QUFDZixVQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUMzQyxVQUFJLEtBQUssS0FBSyxNQUFNLEVBQUU7QUFDcEIsa0JBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7T0FDM0IsTUFBTTtBQUNMLGtCQUFVLEdBQUcsRUFBRSxDQUFDO09BQ2pCO0FBQ0QsYUFBTyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDcEUsQ0FBQzs7QUFFRixTQUFLLElBQUksT0FBTyxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUU7QUFDN0IsZ0JBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztLQUMvQzs7QUFFRCxjQUFVLENBQUMsS0FBSyxHQUFHLFlBQVc7QUFDNUIsYUFBTyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztBQUNwQiwrQkFBdUIsRUFBRTtBQUN2QixnQkFBTSxFQUFFLFFBQVE7U0FDakI7T0FDRixDQUFDLENBQUM7S0FDSixDQUFDO0dBQ0g7QUFDRCxTQUFPLFVBQVUsQ0FBQztDQUNuQjs7QUFFTSxJQUFNLE1BQU0sR0FBRyxTQUFTLEVBQUUsQ0FBQztRQUFyQixNQUFNLEdBQU4sTUFBTTtBQUNaLElBQU0sR0FBRyxHQUFHLE1BQU0sRUFBRSxDQUFDOztRQUFmLEdBQUcsR0FBSCxHQUFHOztBQUVULFNBQVMsVUFBVSxDQUFFLFNBQVMsRUFBRTtBQUNyQyxNQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzlDLE1BQUksWUFBWSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUM7QUFDN0UsU0FBTyxZQUFZLENBQUM7Q0FDckIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XHJcbmltcG9ydCBSZWFjdFJvdXRlciBmcm9tICdyZWFjdC1yb3V0ZXInO1xyXG5cclxuZnVuY3Rpb24gZ2V0Um91dGVyICgpIHtcclxuICBjb25zdCBSb3V0ZXIgPSB7fTtcclxuICBpZiAodHlwZW9mIFJlYWN0Um91dGVyICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgbGV0IHJvdXRlckVsZW1lbnRzID0gWydSb3V0ZScsICdEZWZhdWx0Um91dGUnLCAnUm91dGVIYW5kbGVyJywgJ0FjdGl2ZUhhbmRsZXInLCAnTm90Rm91bmRSb3V0ZScsICdMaW5rJywgJ1JlZGlyZWN0J10sXHJcbiAgICByb3V0ZXJNaXhpbnMgPSBbJ05hdmlnYXRpb24nLCAnU3RhdGUnXSxcclxuICAgIHJvdXRlckZ1bmN0aW9ucyA9IFsnY3JlYXRlJywgJ2NyZWF0ZURlZmF1bHRSb3V0ZScsICdjcmVhdGVOb3RGb3VuZFJvdXRlJywgJ2NyZWF0ZVJlZGlyZWN0JywgJ2NyZWF0ZVJvdXRlJywgJ2NyZWF0ZVJvdXRlc0Zyb21SZWFjdENoaWxkcmVuJywgJ3J1biddLFxyXG4gICAgcm91dGVyT2JqZWN0cyA9IFsnSGFzaExvY2F0aW9uJywgJ0hpc3RvcnknLCAnSGlzdG9yeUxvY2F0aW9uJywgJ1JlZnJlc2hMb2NhdGlvbicsICdTdGF0aWNMb2NhdGlvbicsICdUZXN0TG9jYXRpb24nLCAnSW1pdGF0ZUJyb3dzZXJCZWhhdmlvcicsICdTY3JvbGxUb1RvcEJlaGF2aW9yJ10sXHJcbiAgICBjb3BpZWRJdGVtcyA9IHJvdXRlck1peGlucy5jb25jYXQocm91dGVyRnVuY3Rpb25zKS5jb25jYXQocm91dGVyT2JqZWN0cyk7XHJcblxyXG4gICAgcm91dGVyRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgIFJvdXRlcltuYW1lXSA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQuYmluZChSZWFjdCwgUmVhY3RSb3V0ZXJbbmFtZV0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29waWVkSXRlbXMuZm9yRWFjaChmdW5jdGlvbihuYW1lKSB7XHJcbiAgICAgIFJvdXRlcltuYW1lXSA9IFJlYWN0Um91dGVyW25hbWVdO1xyXG4gICAgfSk7XHJcbiAgfVxyXG4gIHJldHVybiBSb3V0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldERPTSAoKSB7XHJcbiAgY29uc3QgRE9NSGVscGVycyA9IHt9O1xyXG5cclxuICBpZiAodHlwZW9mIFJlYWN0ICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgbGV0IHRhZyA9IGZ1bmN0aW9uIChuYW1lLCAuLi5hcmdzKSB7XHJcbiAgICAgIGxldCBhdHRyaWJ1dGVzO1xyXG4gICAgICBsZXQgZmlyc3QgPSBhcmdzWzBdICYmIGFyZ3NbMF0uY29uc3RydWN0b3I7XHJcbiAgICAgIGlmIChmaXJzdCA9PT0gT2JqZWN0KSB7XHJcbiAgICAgICAgYXR0cmlidXRlcyA9IGFyZ3Muc2hpZnQoKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBhdHRyaWJ1dGVzID0ge307XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIFJlYWN0LkRPTVtuYW1lXS5hcHBseShSZWFjdC5ET00sIFthdHRyaWJ1dGVzXS5jb25jYXQoYXJncykpO1xyXG4gICAgfTtcclxuXHJcbiAgICBmb3IgKGxldCB0YWdOYW1lIGluIFJlYWN0LkRPTSkge1xyXG4gICAgICBET01IZWxwZXJzW3RhZ05hbWVdID0gdGFnLmJpbmQodGhpcywgdGFnTmFtZSk7XHJcbiAgICB9XHJcblxyXG4gICAgRE9NSGVscGVycy5zcGFjZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICByZXR1cm4gUmVhY3QuRE9NLnNwYW4oe1xyXG4gICAgICAgIGRhbmdlcm91c2x5U2V0SW5uZXJIVE1MOiB7XHJcbiAgICAgICAgICBfX2h0bWw6ICcmbmJzcDsnXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH07XHJcbiAgfVxyXG4gIHJldHVybiBET01IZWxwZXJzO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgUm91dGVyID0gZ2V0Um91dGVyKCk7XHJcbmV4cG9ydCBjb25zdCBET00gPSBnZXRET00oKTtcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVWaWV3IChjbGFzc0FyZ3MpIHtcclxuICBsZXQgUmVhY3RDbGFzcyA9IFJlYWN0LmNyZWF0ZUNsYXNzKGNsYXNzQXJncyk7XHJcbiAgbGV0IFJlYWN0RWxlbWVudCA9IFJlYWN0LmNyZWF0ZUVsZW1lbnQuYmluZChSZWFjdC5jcmVhdGVFbGVtZW50LCBSZWFjdENsYXNzKTtcclxuICByZXR1cm4gUmVhY3RFbGVtZW50O1xyXG59XHJcbiJdfQ==
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

      return getConnectMixin(this, args.concat(args));
    };

    this.handlers = args.handlers || utils.getWithoutFields(["actions"], args) || {};

    if (Array.isArray(actions)) {
      this.actions = actions = new Actions(actions);
      this.actions.addStore(this);
    }

    var set = function set(item, value) {
      store.get().set(item, value);
    };

    var get = function get(item) {
      if (item) {
        return store.get().toJS()[item];
      }return store.get();
    };

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
  var changeCallback = function changeCallback(state) {
    this.setState(state.toJS());
  };

  var listener = undefined;

  return {
    getInitialState: function getInitialState() {
      var frozen = store.store.get(arguments);
      var state = frozen.toJS();

      if (!this.boundEximChangeCallbacks) this.boundEximChangeCallbacks = {};

      this.boundEximChangeCallbacks[store] = changeCallback.bind(this);

      listener = frozen.getListener();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiZTovY29kZS9lbGl4ZXIvcmVzdHJ1Y3R1cmUvd2ViL3BhY2thZ2VzL2V4aW0vc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvZnJlZXplci5qcyIsIm5vZGVfbW9kdWxlcy9mcmVlemVyLWpzL3NyYy9lbWl0dGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvc3JjL2ZyZWV6ZXIuanMiLCJub2RlX21vZHVsZXMvZnJlZXplci1qcy9zcmMvZnJvemVuLmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvc3JjL21peGlucy5qcyIsIm5vZGVfbW9kdWxlcy9mcmVlemVyLWpzL3NyYy91dGlscy5qcyIsImU6L2NvZGUvZWxpeGVyL3Jlc3RydWN0dXJlL3dlYi9wYWNrYWdlcy9leGltL3NyYy9BY3Rpb25zLmpzIiwic3JjL0RPTUhlbHBlcnMuanMiLCJlOi9jb2RlL2VsaXhlci9yZXN0cnVjdHVyZS93ZWIvcGFja2FnZXMvZXhpbS9zcmMvU3RvcmUuanMiLCJlOi9jb2RlL2VsaXhlci9yZXN0cnVjdHVyZS93ZWIvcGFja2FnZXMvZXhpbS9zcmMvaGVscGVycy5qcyIsImU6L2NvZGUvZWxpeGVyL3Jlc3RydWN0dXJlL3dlYi9wYWNrYWdlcy9leGltL3NyYy9taXhpbnMvY29ubmVjdC5qcyIsImU6L2NvZGUvZWxpeGVyL3Jlc3RydWN0dXJlL3dlYi9wYWNrYWdlcy9leGltL3NyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7dUJDQThCLFdBQVc7O0lBQWpDLE1BQU0sWUFBTixNQUFNO0lBQUUsT0FBTyxZQUFQLE9BQU87O0lBQ2hCLEtBQUssMkJBQU0sU0FBUzs7SUFDcEIsT0FBTywyQkFBTSxXQUFXOzswQkFDTyxjQUFjOztJQUE1QyxVQUFVLGVBQVYsVUFBVTtJQUFFLE1BQU0sZUFBTixNQUFNO0lBQUUsR0FBRyxlQUFILEdBQUc7O0FBRS9CLElBQU0sSUFBSSxHQUFHLEVBQUMsTUFBTSxFQUFOLE1BQU0sRUFBRSxPQUFPLEVBQVAsT0FBTyxFQUFFLEtBQUssRUFBTCxLQUFLLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRSxHQUFHLEVBQUgsR0FBRyxFQUFFLE9BQU8sRUFBUCxPQUFPLEVBQUUsVUFBVSxFQUFWLFVBQVUsRUFBQyxDQUFDOztBQUV4RSxJQUFJLENBQUMsWUFBWSxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQ2xDLFNBQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDekIsQ0FBQzs7QUFFRixJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQ25DLFNBQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDMUIsQ0FBQzs7QUFFRixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQ2pDLFNBQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDeEIsQ0FBQzs7aUJBRWEsSUFBSTs7O0FDbkJuQjtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUM7QUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixjQUFVLEtBQUssUUFBRyxJQUFJLENBQUc7Q0FDMUIsQ0FBQzs7aUJBRWEsS0FBSyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQge0FjdGlvbiwgQWN0aW9uc30gZnJvbSAnLi9BY3Rpb25zJztcclxuaW1wb3J0IFN0b3JlIGZyb20gJy4vU3RvcmUnO1xyXG5pbXBvcnQgaGVscGVycyBmcm9tICcuL2hlbHBlcnMnO1xyXG5pbXBvcnQge2NyZWF0ZVZpZXcsIFJvdXRlciwgRE9NfSBmcm9tICcuL0RPTUhlbHBlcnMnO1xyXG5cclxuY29uc3QgRXhpbSA9IHtBY3Rpb24sIEFjdGlvbnMsIFN0b3JlLCBSb3V0ZXIsIERPTSwgaGVscGVycywgY3JlYXRlVmlld307XHJcblxyXG5FeGltLmNyZWF0ZUFjdGlvbiA9IGZ1bmN0aW9uIChhcmdzKSB7XHJcbiAgcmV0dXJuIG5ldyBBY3Rpb24oYXJncyk7XHJcbn07XHJcblxyXG5FeGltLmNyZWF0ZUFjdGlvbnMgPSBmdW5jdGlvbiAoYXJncykge1xyXG4gIHJldHVybiBuZXcgQWN0aW9ucyhhcmdzKTtcclxufTtcclxuXHJcbkV4aW0uY3JlYXRlU3RvcmUgPSBmdW5jdGlvbiAoYXJncykge1xyXG4gIHJldHVybiBuZXcgU3RvcmUoYXJncyk7XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCBFeGltO1xyXG4iLCJ2YXIgRnJlZXplciA9IHJlcXVpcmUoJy4vc3JjL2ZyZWV6ZXInKTtcbm1vZHVsZS5leHBvcnRzID0gRnJlZXplcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBVdGlscyA9IHJlcXVpcmUoICcuL3V0aWxzJyApO1xuXG4vLyNidWlsZFxuXG4vLyBUaGUgcHJvdG90eXBlIG1ldGhvZHMgYXJlIHN0b3JlZCBpbiBhIGRpZmZlcmVudCBvYmplY3Rcbi8vIGFuZCBhcHBsaWVkIGFzIG5vbiBlbnVtZXJhYmxlIHByb3BlcnRpZXMgbGF0ZXJcbnZhciBlbWl0dGVyUHJvdG8gPSB7XG5cdG9uOiBmdW5jdGlvbiggZXZlbnROYW1lLCBsaXN0ZW5lciwgb25jZSApe1xuXHRcdHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbIGV2ZW50TmFtZSBdIHx8IFtdO1xuXG5cdFx0bGlzdGVuZXJzLnB1c2goeyBjYWxsYmFjazogbGlzdGVuZXIsIG9uY2U6IG9uY2V9KTtcblx0XHR0aGlzLl9ldmVudHNbIGV2ZW50TmFtZSBdID0gIGxpc3RlbmVycztcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXG5cdG9uY2U6IGZ1bmN0aW9uKCBldmVudE5hbWUsIGxpc3RlbmVyICl7XG5cdFx0dGhpcy5vbiggZXZlbnROYW1lLCBsaXN0ZW5lciwgdHJ1ZSApO1xuXHR9LFxuXG5cdG9mZjogZnVuY3Rpb24oIGV2ZW50TmFtZSwgbGlzdGVuZXIgKXtcblx0XHRpZiggdHlwZW9mIGV2ZW50TmFtZSA9PSAndW5kZWZpbmVkJyApe1xuXHRcdFx0dGhpcy5fZXZlbnRzID0ge307XG5cdFx0fVxuXHRcdGVsc2UgaWYoIHR5cGVvZiBsaXN0ZW5lciA9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdHRoaXMuX2V2ZW50c1sgZXZlbnROYW1lIF0gPSBbXTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHR2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzWyBldmVudE5hbWUgXSB8fCBbXSxcblx0XHRcdFx0aVxuXHRcdFx0O1xuXG5cdFx0XHRmb3IgKGkgPSBsaXN0ZW5lcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcblx0XHRcdFx0aWYoIGxpc3RlbmVyc1tpXSA9PT0gbGlzdGVuZXIgKVxuXHRcdFx0XHRcdGxpc3RlbmVycy5zcGxpY2UoIGksIDEgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHR0cmlnZ2VyOiBmdW5jdGlvbiggZXZlbnROYW1lICl7XG5cdFx0dmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKCBhcmd1bWVudHMsIDEgKSxcblx0XHRcdGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1sgZXZlbnROYW1lIF0gfHwgW10sXG5cdFx0XHRvbmNlTGlzdGVuZXJzID0gW10sXG5cdFx0XHRpLCBsaXN0ZW5lclxuXHRcdDtcblxuXHRcdC8vIENhbGwgbGlzdGVuZXJzXG5cdFx0Zm9yIChpID0gMDsgaSA8IGxpc3RlbmVycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0bGlzdGVuZXIgPSBsaXN0ZW5lcnNbaV07XG5cblx0XHRcdGlmKCBsaXN0ZW5lci5jYWxsYmFjayApXG5cdFx0XHRcdGxpc3RlbmVyLmNhbGxiYWNrLmFwcGx5KCBudWxsLCBhcmdzICk7XG5cdFx0XHRlbHNlIHtcblx0XHRcdFx0Ly8gSWYgdGhlcmUgaXMgbm90IGEgY2FsbGJhY2ssIHJlbW92ZSFcblx0XHRcdFx0bGlzdGVuZXIub25jZSA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmKCBsaXN0ZW5lci5vbmNlIClcblx0XHRcdFx0b25jZUxpc3RlbmVycy5wdXNoKCBpICk7XG5cdFx0fVxuXG5cdFx0Ly8gUmVtb3ZlIGxpc3RlbmVycyBtYXJrZWQgYXMgb25jZVxuXHRcdGZvciggaSA9IG9uY2VMaXN0ZW5lcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0gKXtcblx0XHRcdGxpc3RlbmVycy5zcGxpY2UoIG9uY2VMaXN0ZW5lcnNbaV0sIDEgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fVxufTtcblxuLy8gTWV0aG9kcyBhcmUgbm90IGVudW1lcmFibGUgc28sIHdoZW4gdGhlIHN0b3JlcyBhcmVcbi8vIGV4dGVuZGVkIHdpdGggdGhlIGVtaXR0ZXIsIHRoZXkgY2FuIGJlIGl0ZXJhdGVkIGFzXG4vLyBoYXNobWFwc1xudmFyIEVtaXR0ZXIgPSBVdGlscy5jcmVhdGVOb25FbnVtZXJhYmxlKCBlbWl0dGVyUHJvdG8gKTtcbi8vI2J1aWxkXG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjsiLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgVXRpbHMgPSByZXF1aXJlKCAnLi91dGlscy5qcycgKSxcclxuXHRFbWl0dGVyID0gcmVxdWlyZSggJy4vZW1pdHRlcicgKSxcclxuXHRNaXhpbnMgPSByZXF1aXJlKCAnLi9taXhpbnMnICksXHJcblx0RnJvemVuID0gcmVxdWlyZSggJy4vZnJvemVuJyApXHJcbjtcclxuXHJcbi8vI2J1aWxkXHJcbnZhciBGcmVlemVyID0gZnVuY3Rpb24oIGluaXRpYWxWYWx1ZSwgb3B0aW9ucyApIHtcclxuXHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0bXV0YWJsZSA9ICggb3B0aW9ucyAmJiBvcHRpb25zLm11dGFibGUgKSB8fCBmYWxzZSxcclxuXHRcdGxpdmUgPSAoIG9wdGlvbnMgJiYgb3B0aW9ucy5saXZlICkgfHwgbGl2ZVxyXG5cdDtcclxuXHJcblx0Ly8gSW1tdXRhYmxlIGRhdGFcclxuXHR2YXIgZnJvemVuO1xyXG5cclxuXHR2YXIgbm90aWZ5ID0gZnVuY3Rpb24gbm90aWZ5KCBldmVudE5hbWUsIG5vZGUsIG9wdGlvbnMgKXtcclxuXHRcdGlmKCBldmVudE5hbWUgPT0gJ2xpc3RlbmVyJyApXHJcblx0XHRcdHJldHVybiBGcm96ZW4uY3JlYXRlTGlzdGVuZXIoIG5vZGUgKTtcclxuXHJcblx0XHRyZXR1cm4gRnJvemVuLnVwZGF0ZSggZXZlbnROYW1lLCBub2RlLCBvcHRpb25zICk7XHJcblx0fTtcclxuXHJcblx0dmFyIGZyZWV6ZSA9IGZ1bmN0aW9uKCl7fTtcclxuXHRpZiggIW11dGFibGUgKVxyXG5cdFx0ZnJlZXplID0gZnVuY3Rpb24oIG9iaiApeyBPYmplY3QuZnJlZXplKCBvYmogKTsgfTtcclxuXHJcblx0Ly8gQ3JlYXRlIHRoZSBmcm96ZW4gb2JqZWN0XHJcblx0ZnJvemVuID0gRnJvemVuLmZyZWV6ZSggaW5pdGlhbFZhbHVlLCBub3RpZnksIGZyZWV6ZSwgbGl2ZSApO1xyXG5cclxuXHQvLyBMaXN0ZW4gdG8gaXRzIGNoYW5nZXMgaW1tZWRpYXRlbHlcclxuXHR2YXIgbGlzdGVuZXIgPSBmcm96ZW4uZ2V0TGlzdGVuZXIoKTtcclxuXHJcblx0Ly8gVXBkYXRpbmcgZmxhZyB0byB0cmlnZ2VyIHRoZSBldmVudCBvbiBuZXh0VGlja1xyXG5cdHZhciB1cGRhdGluZyA9IGZhbHNlO1xyXG5cclxuXHRsaXN0ZW5lci5vbiggJ2ltbWVkaWF0ZScsIGZ1bmN0aW9uKCBwcmV2Tm9kZSwgdXBkYXRlZCApe1xyXG5cdFx0aWYoIHByZXZOb2RlICE9IGZyb3plbiApXHJcblx0XHRcdHJldHVybjtcclxuXHJcblx0XHRmcm96ZW4gPSB1cGRhdGVkO1xyXG5cclxuXHRcdGlmKCBsaXZlIClcclxuXHRcdFx0cmV0dXJuIG1lLnRyaWdnZXIoICd1cGRhdGUnLCB1cGRhdGVkICk7XHJcblxyXG5cdFx0Ly8gVHJpZ2dlciBvbiBuZXh0IHRpY2tcclxuXHRcdGlmKCAhdXBkYXRpbmcgKXtcclxuXHRcdFx0dXBkYXRpbmcgPSB0cnVlO1xyXG5cdFx0XHRVdGlscy5uZXh0VGljayggZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR1cGRhdGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdG1lLnRyaWdnZXIoICd1cGRhdGUnLCBmcm96ZW4gKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdFV0aWxzLmFkZE5FKCB0aGlzLCB7XHJcblx0XHRnZXQ6IGZ1bmN0aW9uKCl7XHJcblx0XHRcdHJldHVybiBmcm96ZW47XHJcblx0XHR9LFxyXG5cdFx0c2V0OiBmdW5jdGlvbiggbm9kZSApe1xyXG5cdFx0XHR2YXIgbmV3Tm9kZSA9IG5vdGlmeSggJ3Jlc2V0JywgZnJvemVuLCBub2RlICk7XHJcblx0XHRcdG5ld05vZGUuX18ubGlzdGVuZXIudHJpZ2dlciggJ2ltbWVkaWF0ZScsIGZyb3plbiwgbmV3Tm9kZSApO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRVdGlscy5hZGRORSggdGhpcywgeyBnZXREYXRhOiB0aGlzLmdldCwgc2V0RGF0YTogdGhpcy5zZXQgfSApO1xyXG5cclxuXHQvLyBUaGUgZXZlbnQgc3RvcmVcclxuXHR0aGlzLl9ldmVudHMgPSBbXTtcclxufVxyXG5cclxuRnJlZXplci5wcm90b3R5cGUgPSBVdGlscy5jcmVhdGVOb25FbnVtZXJhYmxlKHtjb25zdHJ1Y3RvcjogRnJlZXplcn0sIEVtaXR0ZXIpO1xyXG4vLyNidWlsZFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGcmVlemVyO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgVXRpbHMgPSByZXF1aXJlKCAnLi91dGlscycgKSxcclxuXHRNaXhpbnMgPSByZXF1aXJlKCAnLi9taXhpbnMnKSxcclxuXHRFbWl0dGVyID0gcmVxdWlyZSgnLi9lbWl0dGVyJylcclxuO1xyXG5cclxuLy8jYnVpbGRcclxudmFyIEZyb3plbiA9IHtcclxuXHRmcmVlemU6IGZ1bmN0aW9uKCBub2RlLCBub3RpZnksIGZyZWV6ZUZuLCBsaXZlICl7XHJcblx0XHRpZiggbm9kZSAmJiBub2RlLl9fICl7XHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdGZyb3plbiwgbWl4aW4sIGNvbnNcclxuXHRcdDtcclxuXHJcblx0XHRpZiggbm9kZS5jb25zdHJ1Y3RvciA9PSBBcnJheSApe1xyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmNyZWF0ZUFycmF5KCBub2RlLmxlbmd0aCApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGZyb3plbiA9IE9iamVjdC5jcmVhdGUoIE1peGlucy5IYXNoICk7XHJcblx0XHR9XHJcblxyXG5cdFx0VXRpbHMuYWRkTkUoIGZyb3plbiwgeyBfXzoge1xyXG5cdFx0XHRsaXN0ZW5lcjogZmFsc2UsXHJcblx0XHRcdHBhcmVudHM6IFtdLFxyXG5cdFx0XHRub3RpZnk6IG5vdGlmeSxcclxuXHRcdFx0ZGlydHk6IGZhbHNlLFxyXG5cdFx0XHRmcmVlemVGbjogZnJlZXplRm4sXHJcblx0XHRcdGxpdmU6IGxpdmUgfHwgZmFsc2VcclxuXHRcdH19KTtcclxuXHJcblx0XHQvLyBGcmVlemUgY2hpbGRyZW5cclxuXHRcdFV0aWxzLmVhY2goIG5vZGUsIGZ1bmN0aW9uKCBjaGlsZCwga2V5ICl7XHJcblx0XHRcdGNvbnMgPSBjaGlsZCAmJiBjaGlsZC5jb25zdHJ1Y3RvcjtcclxuXHRcdFx0aWYoIGNvbnMgPT0gQXJyYXkgfHwgY29ucyA9PSBPYmplY3QgKXtcclxuXHRcdFx0XHRjaGlsZCA9IG1lLmZyZWV6ZSggY2hpbGQsIG5vdGlmeSwgZnJlZXplRm4sIGxpdmUgKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYoIGNoaWxkICYmIGNoaWxkLl9fICl7XHJcblx0XHRcdFx0bWUuYWRkUGFyZW50KCBjaGlsZCwgZnJvemVuICk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZyb3plblsga2V5IF0gPSBjaGlsZDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGZyZWV6ZUZuKCBmcm96ZW4gKTtcclxuXHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdHVwZGF0ZTogZnVuY3Rpb24oIHR5cGUsIG5vZGUsIG9wdGlvbnMgKXtcclxuXHRcdGlmKCAhdGhpc1sgdHlwZSBdKVxyXG5cdFx0XHRyZXR1cm4gVXRpbHMuZXJyb3IoICdVbmtub3duIHVwZGF0ZSB0eXBlOiAnICsgdHlwZSApO1xyXG5cclxuXHRcdHJldHVybiB0aGlzWyB0eXBlIF0oIG5vZGUsIG9wdGlvbnMgKTtcclxuXHR9LFxyXG5cclxuXHRyZXNldDogZnVuY3Rpb24oIG5vZGUsIHZhbHVlICl7XHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW5cclxuXHRcdDtcclxuXHJcblx0XHRpZiggdmFsdWUgJiYgdmFsdWUuX18gKXtcclxuXHRcdFx0ZnJvemVuID0gdmFsdWU7XHJcblx0XHRcdGZyb3plbi5fXy5saXN0ZW5lciA9IHZhbHVlLl9fLmxpc3RlbmVyO1xyXG5cdFx0XHRmcm96ZW4uX18ucGFyZW50cyA9IFtdO1xyXG5cclxuXHRcdFx0Ly8gU2V0IGJhY2sgdGhlIHBhcmVudCBvbiB0aGUgY2hpbGRyZW5cclxuXHRcdFx0Ly8gdGhhdCBoYXZlIGJlZW4gdXBkYXRlZFxyXG5cdFx0XHR0aGlzLmZpeENoaWxkcmVuKCBmcm96ZW4sIG5vZGUgKTtcclxuXHRcdFx0VXRpbHMuZWFjaCggZnJvemVuLCBmdW5jdGlvbiggY2hpbGQgKXtcclxuXHRcdFx0XHRpZiggY2hpbGQgJiYgY2hpbGQuX18gKXtcclxuXHRcdFx0XHRcdG1lLnJlbW92ZVBhcmVudCggbm9kZSApO1xyXG5cdFx0XHRcdFx0bWUuYWRkUGFyZW50KCBjaGlsZCwgZnJvemVuICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmZyZWV6ZSggbm9kZSwgbm9kZS5fXy5ub3RpZnksIG5vZGUuX18uZnJlZXplRm4sIG5vZGUuX18ubGl2ZSApO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBmcm96ZW47XHJcblx0fSxcclxuXHJcblx0bWVyZ2U6IGZ1bmN0aW9uKCBub2RlLCBhdHRycyApe1xyXG5cdFx0dmFyIHRyYW5zID0gbm9kZS5fXy50cmFucyxcclxuXHJcblx0XHRcdC8vIENsb25lIHRoZSBhdHRycyB0byBub3QgbW9kaWZ5IHRoZSBhcmd1bWVudFxyXG5cdFx0XHRhdHRycyA9IFV0aWxzLmV4dGVuZCgge30sIGF0dHJzKVxyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCB0cmFucyApe1xyXG5cclxuXHRcdFx0Zm9yKCB2YXIgYXR0ciBpbiBhdHRycyApXHJcblx0XHRcdFx0dHJhbnNbIGF0dHIgXSA9IGF0dHJzWyBhdHRyIF07XHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdGZyb3plbiA9IHRoaXMuY29weU1ldGEoIG5vZGUgKSxcclxuXHRcdFx0bm90aWZ5ID0gbm9kZS5fXy5ub3RpZnksXHJcblx0XHRcdHZhbCwgY29ucywga2V5LCBpc0Zyb3plblxyXG5cdFx0O1xyXG5cclxuXHRcdFV0aWxzLmVhY2goIG5vZGUsIGZ1bmN0aW9uKCBjaGlsZCwga2V5ICl7XHJcblx0XHRcdGlzRnJvemVuID0gY2hpbGQgJiYgY2hpbGQuX187XHJcblxyXG5cdFx0XHRpZiggaXNGcm96ZW4gKXtcclxuXHRcdFx0XHRtZS5yZW1vdmVQYXJlbnQoIGNoaWxkLCBub2RlICk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZhbCA9IGF0dHJzWyBrZXkgXTtcclxuXHRcdFx0aWYoICF2YWwgKXtcclxuXHRcdFx0XHRpZiggaXNGcm96ZW4gKVxyXG5cdFx0XHRcdFx0bWUuYWRkUGFyZW50KCBjaGlsZCwgZnJvemVuICk7XHJcblx0XHRcdFx0cmV0dXJuIGZyb3plblsga2V5IF0gPSBjaGlsZDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29ucyA9IHZhbCAmJiB2YWwuY29uc3RydWN0b3I7XHJcblxyXG5cdFx0XHRpZiggY29ucyA9PSBBcnJheSB8fCBjb25zID09IE9iamVjdCApXHJcblx0XHRcdFx0dmFsID0gbWUuZnJlZXplKCB2YWwsIG5vdGlmeSwgbm9kZS5fXy5mcmVlemVGbiwgbm9kZS5fXy5saXZlICk7XHJcblxyXG5cdFx0XHRpZiggdmFsICYmIHZhbC5fXyApXHJcblx0XHRcdFx0bWUuYWRkUGFyZW50KCB2YWwsIGZyb3plbiApO1xyXG5cclxuXHRcdFx0ZGVsZXRlIGF0dHJzWyBrZXkgXTtcclxuXHJcblx0XHRcdGZyb3plblsga2V5IF0gPSB2YWw7XHJcblx0XHR9KTtcclxuXHJcblxyXG5cdFx0Zm9yKCBrZXkgaW4gYXR0cnMgKSB7XHJcblx0XHRcdHZhbCA9IGF0dHJzWyBrZXkgXTtcclxuXHRcdFx0Y29ucyA9IHZhbCAmJiB2YWwuY29uc3RydWN0b3I7XHJcblxyXG5cdFx0XHRpZiggY29ucyA9PSBBcnJheSB8fCBjb25zID09IE9iamVjdCApXHJcblx0XHRcdFx0dmFsID0gbWUuZnJlZXplKCB2YWwsIG5vdGlmeSwgbm9kZS5fXy5mcmVlemVGbiwgbm9kZS5fXy5saXZlICk7XHJcblxyXG5cdFx0XHRpZiggdmFsICYmIHZhbC5fXyApXHJcblx0XHRcdFx0bWUuYWRkUGFyZW50KCB2YWwsIGZyb3plbiApO1xyXG5cclxuXHRcdFx0ZnJvemVuWyBrZXkgXSA9IHZhbDtcclxuXHRcdH1cclxuXHJcblx0XHRub2RlLl9fLmZyZWV6ZUZuKCBmcm96ZW4gKTtcclxuXHJcblx0XHR0aGlzLnJlZnJlc2hQYXJlbnRzKCBub2RlLCBmcm96ZW4gKTtcclxuXHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdHJlcGxhY2U6IGZ1bmN0aW9uKCBub2RlLCByZXBsYWNlbWVudCApIHtcclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRjb25zID0gcmVwbGFjZW1lbnQgJiYgcmVwbGFjZW1lbnQuY29uc3RydWN0b3IsXHJcblx0XHRcdF9fID0gbm9kZS5fXyxcclxuXHRcdFx0ZnJvemVuID0gcmVwbGFjZW1lbnRcclxuXHRcdDtcclxuXHJcblx0XHRpZiggY29ucyA9PSBBcnJheSB8fCBjb25zID09IE9iamVjdCApIHtcclxuXHJcblx0XHRcdGZyb3plbiA9IG1lLmZyZWV6ZSggcmVwbGFjZW1lbnQsIF9fLm5vdGlmeSwgX18uZnJlZXplRm4sIF9fLmxpdmUgKTtcclxuXHJcblx0XHRcdGZyb3plbi5fXy5wYXJlbnRzID0gX18ucGFyZW50cztcclxuXHJcblx0XHRcdC8vIEFkZCB0aGUgY3VycmVudCBsaXN0ZW5lciBpZiBleGlzdHMsIHJlcGxhY2luZyBhXHJcblx0XHRcdC8vIHByZXZpb3VzIGxpc3RlbmVyIGluIHRoZSBmcm96ZW4gaWYgZXhpc3RlZFxyXG5cdFx0XHRpZiggX18ubGlzdGVuZXIgKVxyXG5cdFx0XHRcdGZyb3plbi5fXy5saXN0ZW5lciA9IG5vZGUuX18ubGlzdGVuZXI7XHJcblxyXG5cdFx0XHQvLyBTaW5jZSB0aGUgcGFyZW50cyB3aWxsIGJlIHJlZnJlc2hlZCBkaXJlY3RseSxcclxuXHRcdFx0Ly8gVHJpZ2dlciB0aGUgbGlzdGVuZXIgaGVyZVxyXG5cdFx0XHRpZiggZnJvemVuLl9fLmxpc3RlbmVyIClcclxuXHRcdFx0XHR0aGlzLnRyaWdnZXIoIGZyb3plbiwgJ3VwZGF0ZScsIGZyb3plbiApO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlZnJlc2ggdGhlIHBhcmVudCBub2RlcyBkaXJlY3RseVxyXG5cdFx0aWYoICFfXy5wYXJlbnRzLmxlbmd0aCAmJiBfXy5saXN0ZW5lciApe1xyXG5cdFx0XHRfXy5saXN0ZW5lci50cmlnZ2VyKCAnaW1tZWRpYXRlJywgbm9kZSwgZnJvemVuICk7XHJcblx0XHR9XHJcblx0XHRmb3IgKHZhciBpID0gX18ucGFyZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG5cdFx0XHRpZiggaSA9PSAwICl7XHJcblx0XHRcdFx0dGhpcy5yZWZyZXNoKCBfXy5wYXJlbnRzW2ldLCBub2RlLCBmcm96ZW4sIGZhbHNlICk7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZXtcclxuXHJcblx0XHRcdFx0dGhpcy5tYXJrRGlydHkoIF9fLnBhcmVudHNbaV0sIFtub2RlLCBmcm96ZW5dICk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBmcm96ZW47XHJcblx0fSxcclxuXHJcblx0cmVtb3ZlOiBmdW5jdGlvbiggbm9kZSwgYXR0cnMgKXtcclxuXHRcdHZhciB0cmFucyA9IG5vZGUuX18udHJhbnM7XHJcblx0XHRpZiggdHJhbnMgKXtcclxuXHRcdFx0Zm9yKCB2YXIgbCA9IGF0dHJzLmxlbmd0aCAtIDE7IGwgPj0gMDsgbC0tIClcclxuXHRcdFx0XHRkZWxldGUgdHJhbnNbIGF0dHJzW2xdIF07XHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdGZyb3plbiA9IHRoaXMuY29weU1ldGEoIG5vZGUgKSxcclxuXHRcdFx0aXNGcm96ZW5cclxuXHRcdDtcclxuXHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRpc0Zyb3plbiA9IGNoaWxkICYmIGNoaWxkLl9fO1xyXG5cclxuXHRcdFx0aWYoIGlzRnJvemVuICl7XHJcblx0XHRcdFx0bWUucmVtb3ZlUGFyZW50KCBjaGlsZCwgbm9kZSApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiggYXR0cnMuaW5kZXhPZigga2V5ICkgIT0gLTEgKXtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKCBpc0Zyb3plbiApXHJcblx0XHRcdFx0bWUuYWRkUGFyZW50KCBjaGlsZCwgZnJvemVuICk7XHJcblxyXG5cdFx0XHRmcm96ZW5bIGtleSBdID0gY2hpbGQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRub2RlLl9fLmZyZWV6ZUZuKCBmcm96ZW4gKTtcclxuXHRcdHRoaXMucmVmcmVzaFBhcmVudHMoIG5vZGUsIGZyb3plbiApO1xyXG5cclxuXHRcdHJldHVybiBmcm96ZW47XHJcblx0fSxcclxuXHJcblx0c3BsaWNlOiBmdW5jdGlvbiggbm9kZSwgYXJncyApe1xyXG5cdFx0dmFyIHRyYW5zID0gbm9kZS5fXy50cmFucztcclxuXHRcdGlmKCB0cmFucyApe1xyXG5cdFx0XHR0cmFucy5zcGxpY2UuYXBwbHkoIHRyYW5zLCBhcmdzICk7XHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdGZyb3plbiA9IHRoaXMuY29weU1ldGEoIG5vZGUgKSxcclxuXHRcdFx0aW5kZXggPSBhcmdzWzBdLFxyXG5cdFx0XHRkZWxldGVJbmRleCA9IGluZGV4ICsgYXJnc1sxXSxcclxuXHRcdFx0X18gPSBub2RlLl9fLFxyXG5cdFx0XHRjb24sIGNoaWxkXHJcblx0XHQ7XHJcblxyXG5cdFx0Ly8gQ2xvbmUgdGhlIGFycmF5XHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQsIGkgKXtcclxuXHJcblx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApe1xyXG5cdFx0XHRcdG1lLnJlbW92ZVBhcmVudCggY2hpbGQsIG5vZGUgKTtcclxuXHJcblx0XHRcdFx0Ly8gU2tpcCB0aGUgbm9kZXMgdG8gZGVsZXRlXHJcblx0XHRcdFx0aWYoIGkgPCBpbmRleCB8fCBpPj0gZGVsZXRlSW5kZXggKVxyXG5cdFx0XHRcdFx0bWUuYWRkUGFyZW50KCBjaGlsZCwgZnJvemVuICk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZyb3plbltpXSA9IGNoaWxkO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUHJlcGFyZSB0aGUgbmV3IG5vZGVzXHJcblx0XHRpZiggYXJncy5sZW5ndGggPiAxICl7XHJcblx0XHRcdGZvciAodmFyIGkgPSBhcmdzLmxlbmd0aCAtIDE7IGkgPj0gMjsgaS0tKSB7XHJcblx0XHRcdFx0Y2hpbGQgPSBhcmdzW2ldO1xyXG5cdFx0XHRcdGNvbiA9IGNoaWxkICYmIGNoaWxkLmNvbnN0cnVjdG9yO1xyXG5cclxuXHRcdFx0XHRpZiggY29uID09IEFycmF5IHx8IGNvbiA9PSBPYmplY3QgKVxyXG5cdFx0XHRcdFx0Y2hpbGQgPSB0aGlzLmZyZWV6ZSggY2hpbGQsIF9fLm5vdGlmeSwgX18uZnJlZXplRm4sIF9fLmxpdmUgKTtcclxuXHJcblx0XHRcdFx0aWYoIGNoaWxkICYmIGNoaWxkLl9fIClcclxuXHRcdFx0XHRcdHRoaXMuYWRkUGFyZW50KCBjaGlsZCwgZnJvemVuICk7XHJcblxyXG5cdFx0XHRcdGFyZ3NbaV0gPSBjaGlsZDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIHNwbGljZVxyXG5cdFx0QXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseSggZnJvemVuLCBhcmdzICk7XHJcblxyXG5cdFx0bm9kZS5fXy5mcmVlemVGbiggZnJvemVuICk7XHJcblx0XHR0aGlzLnJlZnJlc2hQYXJlbnRzKCBub2RlLCBmcm96ZW4gKTtcclxuXHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdHRyYW5zYWN0OiBmdW5jdGlvbiggbm9kZSApIHtcclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdHRyYW5zYWN0aW5nID0gbm9kZS5fXy50cmFucyxcclxuXHRcdFx0dHJhbnNcclxuXHRcdDtcclxuXHJcblx0XHRpZiggdHJhbnNhY3RpbmcgKVxyXG5cdFx0XHRyZXR1cm4gdHJhbnNhY3Rpbmc7XHJcblxyXG5cdFx0dHJhbnMgPSBub2RlLmNvbnN0cnVjdG9yID09IEFycmF5ID8gW10gOiB7fTtcclxuXHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHR0cmFuc1sga2V5IF0gPSBjaGlsZDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG5vZGUuX18udHJhbnMgPSB0cmFucztcclxuXHJcblx0XHQvLyBDYWxsIHJ1biBhdXRvbWF0aWNhbGx5IGluIGNhc2VcclxuXHRcdC8vIHRoZSB1c2VyIGZvcmdvdCBhYm91dCBpdFxyXG5cdFx0VXRpbHMubmV4dFRpY2soIGZ1bmN0aW9uKCl7XHJcblx0XHRcdGlmKCBub2RlLl9fLnRyYW5zIClcclxuXHRcdFx0XHRtZS5ydW4oIG5vZGUgKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiB0cmFucztcclxuXHR9LFxyXG5cclxuXHRydW46IGZ1bmN0aW9uKCBub2RlICkge1xyXG5cdFx0dmFyIG1lID0gdGhpcyxcclxuXHRcdFx0dHJhbnMgPSBub2RlLl9fLnRyYW5zXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoICF0cmFucyApXHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cclxuXHRcdC8vIFJlbW92ZSB0aGUgbm9kZSBhcyBhIHBhcmVudFxyXG5cdFx0VXRpbHMuZWFjaCggdHJhbnMsIGZ1bmN0aW9uKCBjaGlsZCwga2V5ICl7XHJcblx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApe1xyXG5cdFx0XHRcdG1lLnJlbW92ZVBhcmVudCggY2hpbGQsIG5vZGUgKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZGVsZXRlIG5vZGUuX18udHJhbnM7XHJcblxyXG5cdFx0dmFyIHJlc3VsdCA9IHRoaXMucmVwbGFjZSggbm9kZSwgdHJhbnMgKTtcclxuXHRcdHJldHVybiByZXN1bHQ7XHJcblx0fSxcclxuXHJcblx0cmVmcmVzaDogZnVuY3Rpb24oIG5vZGUsIG9sZENoaWxkLCBuZXdDaGlsZCwgcmV0dXJuVXBkYXRlZCApe1xyXG5cdFx0dmFyIG1lID0gdGhpcyxcclxuXHRcdFx0dHJhbnMgPSBub2RlLl9fLnRyYW5zLFxyXG5cdFx0XHRmb3VuZCA9IDBcclxuXHRcdDtcclxuXHJcblx0XHRpZiggdHJhbnMgKXtcclxuXHJcblx0XHRcdFV0aWxzLmVhY2goIHRyYW5zLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRcdGlmKCBmb3VuZCApIHJldHVybjtcclxuXHJcblx0XHRcdFx0aWYoIGNoaWxkID09PSBvbGRDaGlsZCApe1xyXG5cclxuXHRcdFx0XHRcdHRyYW5zWyBrZXkgXSA9IG5ld0NoaWxkO1xyXG5cdFx0XHRcdFx0Zm91bmQgPSAxO1xyXG5cclxuXHRcdFx0XHRcdGlmKCBuZXdDaGlsZCAmJiBuZXdDaGlsZC5fXyApXHJcblx0XHRcdFx0XHRcdG1lLmFkZFBhcmVudCggbmV3Q2hpbGQsIG5vZGUgKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0cmV0dXJuIG5vZGU7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIGZyb3plbiA9IHRoaXMuY29weU1ldGEoIG5vZGUgKSxcclxuXHRcdFx0ZGlydHkgPSBub2RlLl9fLmRpcnR5LFxyXG5cdFx0XHRkaXJ0LCByZXBsYWNlbWVudCwgX19cclxuXHRcdDtcclxuXHJcblx0XHRpZiggZGlydHkgKXtcclxuXHRcdFx0ZGlydCA9IGRpcnR5WzBdLFxyXG5cdFx0XHRyZXBsYWNlbWVudCA9IGRpcnR5WzFdXHJcblx0XHR9XHJcblxyXG5cdFx0VXRpbHMuZWFjaCggbm9kZSwgZnVuY3Rpb24oIGNoaWxkLCBrZXkgKXtcclxuXHRcdFx0aWYoIGNoaWxkID09PSBvbGRDaGlsZCApe1xyXG5cdFx0XHRcdGNoaWxkID0gbmV3Q2hpbGQ7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSBpZiggY2hpbGQgPT09IGRpcnQgKXtcclxuXHRcdFx0XHRjaGlsZCA9IHJlcGxhY2VtZW50O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiggY2hpbGQgJiYgKF9fID0gY2hpbGQuX18pICl7XHJcblxyXG5cdFx0XHRcdC8vIElmIHRoZXJlIGlzIGEgdHJhbnMgaGFwcGVuaW5nIHdlXHJcblx0XHRcdFx0Ly8gZG9uJ3QgdXBkYXRlIGEgZGlydHkgbm9kZSBub3cuIFRoZSB1cGRhdGVcclxuXHRcdFx0XHQvLyB3aWxsIG9jY3VyIG9uIHJ1bi5cclxuXHRcdFx0XHRpZiggIV9fLnRyYW5zICYmIF9fLmRpcnR5ICl7XHJcblx0XHRcdFx0XHRjaGlsZCA9IG1lLnJlZnJlc2goIGNoaWxkLCBfXy5kaXJ0eVswXSwgX18uZGlydHlbMV0sIHRydWUgKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cclxuXHRcdFx0XHRtZS5yZW1vdmVQYXJlbnQoIGNoaWxkLCBub2RlICk7XHJcblx0XHRcdFx0bWUuYWRkUGFyZW50KCBjaGlsZCwgZnJvemVuICk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZyb3plblsga2V5IF0gPSBjaGlsZDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG5vZGUuX18uZnJlZXplRm4oIGZyb3plbiApO1xyXG5cclxuXHRcdC8vIElmIHRoZSBub2RlIHdhcyBkaXJ0eSwgY2xlYW4gaXRcclxuXHRcdG5vZGUuX18uZGlydHkgPSBmYWxzZTtcclxuXHJcblx0XHRpZiggcmV0dXJuVXBkYXRlZCApXHJcblx0XHRcdHJldHVybiBmcm96ZW47XHJcblxyXG5cdFx0dGhpcy5yZWZyZXNoUGFyZW50cyggbm9kZSwgZnJvemVuICk7XHJcblx0fSxcclxuXHJcblx0Zml4Q2hpbGRyZW46IGZ1bmN0aW9uKCBub2RlLCBvbGROb2RlICl7XHJcblx0XHR2YXIgbWUgPSB0aGlzO1xyXG5cdFx0VXRpbHMuZWFjaCggbm9kZSwgZnVuY3Rpb24oIGNoaWxkICl7XHJcblx0XHRcdGlmKCAhY2hpbGQgfHwgIWNoaWxkLl9fIClcclxuXHRcdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0XHQvLyBJZiB0aGUgY2hpbGQgaXMgbGlua2VkIHRvIHRoZSBub2RlLFxyXG5cdFx0XHQvLyBtYXliZSBpdHMgY2hpbGRyZW4gYXJlIG5vdCBsaW5rZWRcclxuXHRcdFx0aWYoIGNoaWxkLl9fLnBhcmVudHMuaW5kZXhPZiggbm9kZSApICE9IC0xIClcclxuXHRcdFx0XHRyZXR1cm4gbWUuZml4Q2hpbGRyZW4oIGNoaWxkICk7XHJcblxyXG5cdFx0XHQvLyBJZiB0aGUgY2hpbGQgd2Fzbid0IGxpbmtlZCBpdCBpcyBzdXJlXHJcblx0XHRcdC8vIHRoYXQgaXQgd2Fzbid0IG1vZGlmaWVkLiBKdXN0IGxpbmsgaXRcclxuXHRcdFx0Ly8gdG8gdGhlIG5ldyBwYXJlbnRcclxuXHRcdFx0aWYoIGNoaWxkLl9fLnBhcmVudHMubGVuZ3RoID09IDEgKVxyXG5cdFx0XHRcdHJldHVybiBjaGlsZC5fXy5wYXJlbnRzID0gWyBub2RlIF07XHJcblxyXG5cdFx0XHRpZiggb2xkTm9kZSApXHJcblx0XHRcdFx0bWUucmVtb3ZlUGFyZW50KCBjaGlsZCwgb2xkTm9kZSApO1xyXG5cclxuXHRcdFx0bWUuYWRkUGFyZW50KCBub2RlICk7XHJcblx0XHR9KTtcclxuXHR9LFxyXG5cclxuXHRjb3B5TWV0YTogZnVuY3Rpb24oIG5vZGUgKXtcclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdGZyb3plblxyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCBub2RlLmNvbnN0cnVjdG9yID09IEFycmF5ICl7XHJcblx0XHRcdGZyb3plbiA9IHRoaXMuY3JlYXRlQXJyYXkoIG5vZGUubGVuZ3RoICk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0ZnJvemVuID0gT2JqZWN0LmNyZWF0ZSggTWl4aW5zLkhhc2ggKTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgX18gPSBub2RlLl9fO1xyXG5cclxuXHRcdFV0aWxzLmFkZE5FKCBmcm96ZW4sIHtfXzoge1xyXG5cdFx0XHRub3RpZnk6IF9fLm5vdGlmeSxcclxuXHRcdFx0bGlzdGVuZXI6IF9fLmxpc3RlbmVyLFxyXG5cdFx0XHRwYXJlbnRzOiBfXy5wYXJlbnRzLnNsaWNlKCAwICksXHJcblx0XHRcdHRyYW5zOiBfXy50cmFucyxcclxuXHRcdFx0ZGlydHk6IGZhbHNlLFxyXG5cdFx0XHRmcmVlemVGbjogX18uZnJlZXplRm5cclxuXHRcdH19KTtcclxuXHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdHJlZnJlc2hQYXJlbnRzOiBmdW5jdGlvbiggb2xkQ2hpbGQsIG5ld0NoaWxkICl7XHJcblx0XHR2YXIgX18gPSBvbGRDaGlsZC5fXyxcclxuXHRcdFx0aVxyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCBfXy5saXN0ZW5lciApXHJcblx0XHRcdHRoaXMudHJpZ2dlciggbmV3Q2hpbGQsICd1cGRhdGUnLCBuZXdDaGlsZCApO1xyXG5cclxuXHRcdGlmKCAhX18ucGFyZW50cy5sZW5ndGggKXtcclxuXHRcdFx0aWYoIF9fLmxpc3RlbmVyICl7XHJcblx0XHRcdFx0X18ubGlzdGVuZXIudHJpZ2dlciggJ2ltbWVkaWF0ZScsIG9sZENoaWxkLCBuZXdDaGlsZCApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0Zm9yIChpID0gX18ucGFyZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG5cdFx0XHRcdC8vIElmIHRoZXJlIGlzIG1vcmUgdGhhbiBvbmUgcGFyZW50LCBtYXJrIGV2ZXJ5b25lIGFzIGRpcnR5XHJcblx0XHRcdFx0Ly8gYnV0IHRoZSBsYXN0IGluIHRoZSBpdGVyYXRpb24sIGFuZCB3aGVuIHRoZSBsYXN0IGlzIHJlZnJlc2hlZFxyXG5cdFx0XHRcdC8vIGl0IHdpbGwgdXBkYXRlIHRoZSBkaXJ0eSBub2Rlcy5cclxuXHRcdFx0XHRpZiggaSA9PSAwIClcclxuXHRcdFx0XHRcdHRoaXMucmVmcmVzaCggX18ucGFyZW50c1tpXSwgb2xkQ2hpbGQsIG5ld0NoaWxkLCBmYWxzZSApO1xyXG5cdFx0XHRcdGVsc2V7XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5tYXJrRGlydHkoIF9fLnBhcmVudHNbaV0sIFtvbGRDaGlsZCwgbmV3Q2hpbGRdICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0bWFya0RpcnR5OiBmdW5jdGlvbiggbm9kZSwgZGlydCApe1xyXG5cdFx0dmFyIF9fID0gbm9kZS5fXyxcclxuXHRcdFx0aVxyXG5cdFx0O1xyXG5cdFx0X18uZGlydHkgPSBkaXJ0O1xyXG5cclxuXHRcdC8vIElmIHRoZXJlIGlzIGEgdHJhbnNhY3Rpb24gaGFwcGVuaW5nIGluIHRoZSBub2RlXHJcblx0XHQvLyB1cGRhdGUgdGhlIHRyYW5zYWN0aW9uIGRhdGEgaW1tZWRpYXRlbHlcclxuXHRcdGlmKCBfXy50cmFucyApXHJcblx0XHRcdHRoaXMucmVmcmVzaCggbm9kZSwgZGlydFswXSwgZGlydFsxXSApO1xyXG5cclxuXHRcdGZvciAoIGkgPSBfXy5wYXJlbnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tICkge1xyXG5cclxuXHRcdFx0dGhpcy5tYXJrRGlydHkoIF9fLnBhcmVudHNbaV0sIGRpcnQgKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRyZW1vdmVQYXJlbnQ6IGZ1bmN0aW9uKCBub2RlLCBwYXJlbnQgKXtcclxuXHRcdHZhciBwYXJlbnRzID0gbm9kZS5fXy5wYXJlbnRzLFxyXG5cdFx0XHRpbmRleCA9IHBhcmVudHMuaW5kZXhPZiggcGFyZW50IClcclxuXHRcdDtcclxuXHJcblx0XHRpZiggaW5kZXggIT0gLTEgKXtcclxuXHJcblx0XHRcdHBhcmVudHMuc3BsaWNlKCBpbmRleCwgMSApO1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdGFkZFBhcmVudDogZnVuY3Rpb24oIG5vZGUsIHBhcmVudCApe1xyXG5cdFx0dmFyIHBhcmVudHMgPSBub2RlLl9fLnBhcmVudHMsXHJcblx0XHRcdGluZGV4ID0gcGFyZW50cy5pbmRleE9mKCBwYXJlbnQgKVxyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCBpbmRleCA9PSAtMSApe1xyXG5cdFx0XHRwYXJlbnRzWyBwYXJlbnRzLmxlbmd0aCBdID0gcGFyZW50O1xyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdHRyaWdnZXI6IGZ1bmN0aW9uKCBub2RlLCBldmVudE5hbWUsIHBhcmFtICl7XHJcblx0XHR2YXIgbGlzdGVuZXIgPSBub2RlLl9fLmxpc3RlbmVyLFxyXG5cdFx0XHR0aWNraW5nID0gbGlzdGVuZXIudGlja2luZ1xyXG5cdFx0O1xyXG5cclxuXHRcdGxpc3RlbmVyLnRpY2tpbmcgPSBwYXJhbTtcclxuXHRcdGlmKCAhdGlja2luZyApe1xyXG5cdFx0XHRVdGlscy5uZXh0VGljayggZnVuY3Rpb24oKXtcclxuXHRcdFx0XHR2YXIgdXBkYXRlZCA9IGxpc3RlbmVyLnRpY2tpbmc7XHJcblx0XHRcdFx0bGlzdGVuZXIudGlja2luZyA9IGZhbHNlO1xyXG5cdFx0XHRcdGxpc3RlbmVyLnRyaWdnZXIoIGV2ZW50TmFtZSwgdXBkYXRlZCApO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRjcmVhdGVMaXN0ZW5lcjogZnVuY3Rpb24oIGZyb3plbiApe1xyXG5cdFx0dmFyIGwgPSBmcm96ZW4uX18ubGlzdGVuZXI7XHJcblxyXG5cdFx0aWYoICFsICkge1xyXG5cdFx0XHRsID0gT2JqZWN0LmNyZWF0ZShFbWl0dGVyLCB7XHJcblx0XHRcdFx0X2V2ZW50czoge1xyXG5cdFx0XHRcdFx0dmFsdWU6IHt9LFxyXG5cdFx0XHRcdFx0d3JpdGFibGU6IHRydWVcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0ZnJvemVuLl9fLmxpc3RlbmVyID0gbDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gbDtcclxuXHR9LFxyXG5cclxuXHRjcmVhdGVBcnJheTogKGZ1bmN0aW9uKCl7XHJcblx0XHQvLyBTZXQgY3JlYXRlQXJyYXkgbWV0aG9kXHJcblx0XHRpZiggW10uX19wcm90b19fIClcclxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCBsZW5ndGggKXtcclxuXHRcdFx0XHR2YXIgYXJyID0gbmV3IEFycmF5KCBsZW5ndGggKTtcclxuXHRcdFx0XHRhcnIuX19wcm90b19fID0gTWl4aW5zLkxpc3Q7XHJcblx0XHRcdFx0cmV0dXJuIGFycjtcclxuXHRcdFx0fVxyXG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCBsZW5ndGggKXtcclxuXHRcdFx0dmFyIGFyciA9IG5ldyBBcnJheSggbGVuZ3RoICksXHJcblx0XHRcdFx0bWV0aG9kcyA9IE1peGlucy5hcnJheU1ldGhvZHNcclxuXHRcdFx0O1xyXG5cdFx0XHRmb3IoIHZhciBtIGluIG1ldGhvZHMgKXtcclxuXHRcdFx0XHRhcnJbIG0gXSA9IG1ldGhvZHNbIG0gXTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gYXJyO1xyXG5cdFx0fVxyXG5cdH0pKClcclxufTtcclxuLy8jYnVpbGRcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRnJvemVuO1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgVXRpbHMgPSByZXF1aXJlKCAnLi91dGlscy5qcycgKTtcclxuXHJcbi8vI2J1aWxkXHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBub24tZW51bWVyYWJsZSBwcm9wZXJ0eSBkZXNjcmlwdG9ycywgdG8gYmUgdXNlZCBieSBPYmplY3QuY3JlYXRlLlxyXG4gKiBAcGFyYW0gIHtPYmplY3R9IGF0dHJzIFByb3BlcnRpZXMgdG8gY3JlYXRlIGRlc2NyaXB0b3JzXHJcbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgQSBoYXNoIHdpdGggdGhlIGRlc2NyaXB0b3JzLlxyXG4gKi9cclxudmFyIGNyZWF0ZU5FID0gZnVuY3Rpb24oIGF0dHJzICl7XHJcblx0dmFyIG5lID0ge307XHJcblxyXG5cdGZvciggdmFyIGtleSBpbiBhdHRycyApe1xyXG5cdFx0bmVbIGtleSBdID0ge1xyXG5cdFx0XHR3cml0YWJsZTogdHJ1ZSxcclxuXHRcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxyXG5cdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHRcdFx0dmFsdWU6IGF0dHJzWyBrZXldXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gbmU7XHJcbn1cclxuXHJcbnZhciBjb21tb25NZXRob2RzID0ge1xyXG5cdHNldDogZnVuY3Rpb24oIGF0dHIsIHZhbHVlICl7XHJcblx0XHR2YXIgYXR0cnMgPSBhdHRyLFxyXG5cdFx0XHR1cGRhdGUgPSB0aGlzLl9fLnRyYW5zXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIHR5cGVvZiB2YWx1ZSAhPSAndW5kZWZpbmVkJyApe1xyXG5cdFx0XHRhdHRycyA9IHt9O1xyXG5cdFx0XHRhdHRyc1sgYXR0ciBdID0gdmFsdWU7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoICF1cGRhdGUgKXtcclxuXHRcdFx0Zm9yKCB2YXIga2V5IGluIGF0dHJzICl7XHJcblx0XHRcdFx0dXBkYXRlID0gdXBkYXRlIHx8IHRoaXNbIGtleSBdICE9IGF0dHJzWyBrZXkgXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTm8gY2hhbmdlcywganVzdCByZXR1cm4gdGhlIG5vZGVcclxuXHRcdFx0aWYoICF1cGRhdGUgKVxyXG5cdFx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ21lcmdlJywgdGhpcywgYXR0cnMgKTtcclxuXHR9LFxyXG5cclxuXHRyZXNldDogZnVuY3Rpb24oIGF0dHJzICkge1xyXG5cdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAncmVwbGFjZScsIHRoaXMsIGF0dHJzICk7XHJcblx0fSxcclxuXHJcblx0Z2V0TGlzdGVuZXI6IGZ1bmN0aW9uKCl7XHJcblx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdsaXN0ZW5lcicsIHRoaXMgKTtcclxuXHR9LFxyXG5cclxuXHR0b0pTOiBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIGpzO1xyXG5cdFx0aWYoIHRoaXMuY29uc3RydWN0b3IgPT0gQXJyYXkgKXtcclxuXHRcdFx0anMgPSBuZXcgQXJyYXkoIHRoaXMubGVuZ3RoICk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0anMgPSB7fTtcclxuXHRcdH1cclxuXHJcblx0XHRVdGlscy5lYWNoKCB0aGlzLCBmdW5jdGlvbiggY2hpbGQsIGkgKXtcclxuXHRcdFx0aWYoIGNoaWxkICYmIGNoaWxkLl9fIClcclxuXHRcdFx0XHRqc1sgaSBdID0gY2hpbGQudG9KUygpO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0anNbIGkgXSA9IGNoaWxkO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGpzO1xyXG5cdH0sXHJcblxyXG5cdHRyYW5zYWN0OiBmdW5jdGlvbigpe1xyXG5cdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAndHJhbnNhY3QnLCB0aGlzICk7XHJcblx0fSxcclxuXHRydW46IGZ1bmN0aW9uKCl7XHJcblx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdydW4nLCB0aGlzICk7XHJcblx0fVxyXG59O1xyXG5cclxudmFyIGFycmF5TWV0aG9kcyA9IFV0aWxzLmV4dGVuZCh7XHJcblx0cHVzaDogZnVuY3Rpb24oIGVsICl7XHJcblx0XHRyZXR1cm4gdGhpcy5hcHBlbmQoIFtlbF0gKTtcclxuXHR9LFxyXG5cclxuXHRhcHBlbmQ6IGZ1bmN0aW9uKCBlbHMgKXtcclxuXHRcdGlmKCBlbHMgJiYgZWxzLmxlbmd0aCApXHJcblx0XHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3NwbGljZScsIHRoaXMsIFt0aGlzLmxlbmd0aCwgMF0uY29uY2F0KCBlbHMgKSApO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0cG9wOiBmdW5jdGlvbigpe1xyXG5cdFx0aWYoICF0aGlzLmxlbmd0aCApXHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3NwbGljZScsIHRoaXMsIFt0aGlzLmxlbmd0aCAtMSwgMV0gKTtcclxuXHR9LFxyXG5cclxuXHR1bnNoaWZ0OiBmdW5jdGlvbiggZWwgKXtcclxuXHRcdHJldHVybiB0aGlzLnByZXBlbmQoIFtlbF0gKTtcclxuXHR9LFxyXG5cclxuXHRwcmVwZW5kOiBmdW5jdGlvbiggZWxzICl7XHJcblx0XHRpZiggZWxzICYmIGVscy5sZW5ndGggKVxyXG5cdFx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdzcGxpY2UnLCB0aGlzLCBbMCwgMF0uY29uY2F0KCBlbHMgKSApO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblx0fSxcclxuXHJcblx0c2hpZnQ6IGZ1bmN0aW9uKCl7XHJcblx0XHRpZiggIXRoaXMubGVuZ3RoIClcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAnc3BsaWNlJywgdGhpcywgWzAsIDFdICk7XHJcblx0fSxcclxuXHJcblx0c3BsaWNlOiBmdW5jdGlvbiggaW5kZXgsIHRvUmVtb3ZlLCB0b0FkZCApe1xyXG5cdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAnc3BsaWNlJywgdGhpcywgYXJndW1lbnRzICk7XHJcblx0fVxyXG59LCBjb21tb25NZXRob2RzICk7XHJcblxyXG52YXIgRnJvemVuQXJyYXkgPSBPYmplY3QuY3JlYXRlKCBBcnJheS5wcm90b3R5cGUsIGNyZWF0ZU5FKCBhcnJheU1ldGhvZHMgKSApO1xyXG5cclxudmFyIE1peGlucyA9IHtcclxuXHJcbkhhc2g6IE9iamVjdC5jcmVhdGUoIE9iamVjdC5wcm90b3R5cGUsIGNyZWF0ZU5FKCBVdGlscy5leHRlbmQoe1xyXG5cdHJlbW92ZTogZnVuY3Rpb24oIGtleXMgKXtcclxuXHRcdHZhciBmaWx0ZXJlZCA9IFtdLFxyXG5cdFx0XHRrID0ga2V5c1xyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCBrZXlzLmNvbnN0cnVjdG9yICE9IEFycmF5IClcclxuXHRcdFx0ayA9IFsga2V5cyBdO1xyXG5cclxuXHRcdGZvciggdmFyIGkgPSAwLCBsID0gay5sZW5ndGg7IGk8bDsgaSsrICl7XHJcblx0XHRcdGlmKCB0aGlzLmhhc093blByb3BlcnR5KCBrW2ldICkgKVxyXG5cdFx0XHRcdGZpbHRlcmVkLnB1c2goIGtbaV0gKTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiggZmlsdGVyZWQubGVuZ3RoIClcclxuXHRcdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAncmVtb3ZlJywgdGhpcywgZmlsdGVyZWQgKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH1cclxufSwgY29tbW9uTWV0aG9kcykpKSxcclxuXHJcbkxpc3Q6IEZyb3plbkFycmF5LFxyXG5hcnJheU1ldGhvZHM6IGFycmF5TWV0aG9kc1xyXG59O1xyXG4vLyNidWlsZFxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNaXhpbnM7IiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyNidWlsZFxudmFyIGdsb2JhbCA9IChuZXcgRnVuY3Rpb24oXCJyZXR1cm4gdGhpc1wiKSgpKTtcblxudmFyIFV0aWxzID0ge1xuXHRleHRlbmQ6IGZ1bmN0aW9uKCBvYiwgcHJvcHMgKXtcblx0XHRmb3IoIHZhciBwIGluIHByb3BzICl7XG5cdFx0XHRvYltwXSA9IHByb3BzW3BdO1xuXHRcdH1cblx0XHRyZXR1cm4gb2I7XG5cdH0sXG5cblx0Y3JlYXRlTm9uRW51bWVyYWJsZTogZnVuY3Rpb24oIG9iaiwgcHJvdG8gKXtcblx0XHR2YXIgbmUgPSB7fTtcblx0XHRmb3IoIHZhciBrZXkgaW4gb2JqIClcblx0XHRcdG5lW2tleV0gPSB7dmFsdWU6IG9ialtrZXldIH07XG5cdFx0cmV0dXJuIE9iamVjdC5jcmVhdGUoIHByb3RvIHx8IHt9LCBuZSApO1xuXHR9LFxuXG5cdGVycm9yOiBmdW5jdGlvbiggbWVzc2FnZSApe1xuXHRcdHZhciBlcnIgPSBuZXcgRXJyb3IoIG1lc3NhZ2UgKTtcblx0XHRpZiggY29uc29sZSApXG5cdFx0XHRyZXR1cm4gY29uc29sZS5lcnJvciggZXJyICk7XG5cdFx0ZWxzZVxuXHRcdFx0dGhyb3cgZXJyO1xuXHR9LFxuXG5cdGVhY2g6IGZ1bmN0aW9uKCBvLCBjbGJrICl7XG5cdFx0dmFyIGksbCxrZXlzO1xuXHRcdGlmKCBvICYmIG8uY29uc3RydWN0b3IgPT0gQXJyYXkgKXtcblx0XHRcdGZvciAoaSA9IDAsIGwgPSBvLmxlbmd0aDsgaSA8IGw7IGkrKylcblx0XHRcdFx0Y2xiayggb1tpXSwgaSApO1xuXHRcdH1cblx0XHRlbHNlIHtcblx0XHRcdGtleXMgPSBPYmplY3Qua2V5cyggbyApO1xuXHRcdFx0Zm9yKCBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgaSsrIClcblx0XHRcdFx0Y2xiayggb1sga2V5c1tpXSBdLCBrZXlzW2ldICk7XG5cdFx0fVxuXHR9LFxuXG5cdGFkZE5FOiBmdW5jdGlvbiggbm9kZSwgYXR0cnMgKXtcblx0XHRmb3IoIHZhciBrZXkgaW4gYXR0cnMgKXtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eSggbm9kZSwga2V5LCB7XG5cdFx0XHRcdGVudW1lcmFibGU6IGZhbHNlLFxuXHRcdFx0XHRjb25maWd1cmFibGU6IHRydWUsXG5cdFx0XHRcdHdyaXRhYmxlOiB0cnVlLFxuXHRcdFx0XHR2YWx1ZTogYXR0cnNbIGtleSBdXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cblx0Ly8gbmV4dFRpY2sgLSBieSBzdGFnYXMgLyBwdWJsaWMgZG9tYWluXG4gIFx0bmV4dFRpY2s6IChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgcXVldWUgPSBbXSxcblx0XHRcdGRpcnR5ID0gZmFsc2UsXG5cdFx0XHRmbixcblx0XHRcdGhhc1Bvc3RNZXNzYWdlID0gISFnbG9iYWwucG9zdE1lc3NhZ2UsXG5cdFx0XHRtZXNzYWdlTmFtZSA9ICduZXh0dGljaycsXG5cdFx0XHR0cmlnZ2VyID0gKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGhhc1Bvc3RNZXNzYWdlXG5cdFx0XHRcdFx0PyBmdW5jdGlvbiB0cmlnZ2VyICgpIHtcblx0XHRcdFx0XHRnbG9iYWwucG9zdE1lc3NhZ2UobWVzc2FnZU5hbWUsICcqJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0OiBmdW5jdGlvbiB0cmlnZ2VyICgpIHtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgcHJvY2Vzc1F1ZXVlKCkgfSwgMCk7XG5cdFx0XHRcdH07XG5cdFx0XHR9KCkpLFxuXHRcdFx0cHJvY2Vzc1F1ZXVlID0gKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0cmV0dXJuIGhhc1Bvc3RNZXNzYWdlXG5cdFx0XHRcdFx0PyBmdW5jdGlvbiBwcm9jZXNzUXVldWUgKGV2ZW50KSB7XG5cdFx0XHRcdFx0XHRpZiAoZXZlbnQuc291cmNlID09PSBnbG9iYWwgJiYgZXZlbnQuZGF0YSA9PT0gbWVzc2FnZU5hbWUpIHtcblx0XHRcdFx0XHRcdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdFx0XHRcdGZsdXNoUXVldWUoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0OiBmbHVzaFF1ZXVlO1xuICAgICAgXHR9KSgpXG4gICAgICA7XG5cbiAgICAgIGZ1bmN0aW9uIGZsdXNoUXVldWUgKCkge1xuICAgICAgICAgIHdoaWxlIChmbiA9IHF1ZXVlLnNoaWZ0KCkpIHtcbiAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGlydHkgPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gbmV4dFRpY2sgKGZuKSB7XG4gICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgaWYgKGRpcnR5KSByZXR1cm47XG4gICAgICAgICAgZGlydHkgPSB0cnVlO1xuICAgICAgICAgIHRyaWdnZXIoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGhhc1Bvc3RNZXNzYWdlKSBnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHByb2Nlc3NRdWV1ZSwgdHJ1ZSk7XG5cbiAgICAgIG5leHRUaWNrLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGdsb2JhbC5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgcHJvY2Vzc1F1ZXVlLCB0cnVlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5leHRUaWNrO1xuICB9KSgpXG59O1xuLy8jYnVpbGRcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFV0aWxzOyIsImV4cG9ydCBjbGFzcyBBY3Rpb24ge1xyXG4gIGNvbnN0cnVjdG9yKGFyZ3MpIHtcclxuICAgIGNvbnN0IFtzdG9yZSwgc3RvcmVzLCBhbGxTdG9yZXNdID0gW2FyZ3Muc3RvcmUsIGFyZ3Muc3RvcmVzLCBbXV07XHJcbiAgICB0aGlzLm5hbWUgPSBhcmdzLm5hbWU7XHJcblxyXG4gICAgaWYgKHN0b3JlKSBhbGxTdG9yZXMucHVzaChzdG9yZSk7XHJcbiAgICBpZiAoc3RvcmVzKSBhbGxTdG9yZXMucHVzaC5hcHBseShhbGxTdG9yZXMsIHN0b3Jlcyk7XHJcblxyXG4gICAgdGhpcy5zdG9yZXMgPSBhbGxTdG9yZXM7XHJcbiAgfVxyXG5cclxuICBydW4oLi4uYXJncykge1xyXG4gICAgY29uc3Qgc3RvcmVzQ3ljbGVzID0gdGhpcy5zdG9yZXMubWFwKHN0b3JlID0+XHJcbiAgICAgIHN0b3JlLnJ1bkN5Y2xlLmFwcGx5KHN0b3JlLCBbdGhpcy5uYW1lXS5jb25jYXQoYXJncykpXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHN0b3Jlc0N5Y2xlcyk7XHJcbiAgfVxyXG5cclxuICBhZGRTdG9yZShzdG9yZSkge1xyXG4gICAgdGhpcy5zdG9yZXMucHVzaChzdG9yZSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQWN0aW9ucyB7XHJcbiAgY29uc3RydWN0b3IoYWN0aW9ucykge1xyXG4gICAgdGhpcy5hbGwgPSBbXTtcclxuICAgIGlmIChBcnJheS5pc0FycmF5KGFjdGlvbnMpKSB7XHJcbiAgICAgIGFjdGlvbnMuZm9yRWFjaCgoYWN0aW9uID0+IHRoaXMuYWRkQWN0aW9uKGFjdGlvbikpLCB0aGlzKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFkZEFjdGlvbihpdGVtLCBub092ZXJyaWRlKSB7XHJcbiAgICBjb25zdCBhY3Rpb24gPSBub092ZXJyaWRlID8gZmFsc2UgOiB0aGlzLmRldGVjdEFjdGlvbihpdGVtKTtcclxuICAgIGlmICghbm9PdmVycmlkZSkge1xyXG4gICAgICBsZXQgb2xkID0gdGhpc1thY3Rpb24ubmFtZV07XHJcbiAgICAgIGlmIChvbGQpIHRoaXMucmVtb3ZlQWN0aW9uKG9sZCk7XHJcbiAgICAgIHRoaXMuYWxsLnB1c2goYWN0aW9uKTtcclxuICAgICAgdGhpc1thY3Rpb24ubmFtZV0gPSBhY3Rpb24ucnVuLmJpbmQoYWN0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYWN0aW9uO1xyXG4gIH1cclxuXHJcbiAgcmVtb3ZlQWN0aW9uKGl0ZW0pIHtcclxuICAgIGNvbnN0IGFjdGlvbiA9IHRoaXMuZGV0ZWN0QWN0aW9uKGl0ZW0sIHRydWUpO1xyXG4gICAgY29uc3QgaW5kZXggPSB0aGlzLmFsbC5pbmRleE9mKGFjdGlvbik7XHJcbiAgICBpZiAoaW5kZXggIT09IC0xKSB0aGlzLmFsbC5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgZGVsZXRlIHRoaXNbYWN0aW9uLm5hbWVdO1xyXG4gIH1cclxuXHJcbiAgYWRkU3RvcmUoc3RvcmUpIHtcclxuICAgIHRoaXMuYWxsLmZvckVhY2goYWN0aW9uID0+IGFjdGlvbi5hZGRTdG9yZShzdG9yZSkpO1xyXG4gIH1cclxuXHJcbiAgZGV0ZWN0QWN0aW9uKGFjdGlvbiwgaXNPbGQpIHtcclxuICAgIGlmIChhY3Rpb24uY29uc3RydWN0b3IgPT09IEFjdGlvbikge1xyXG4gICAgICByZXR1cm4gYWN0aW9uO1xyXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYWN0aW9uID09PSAnc3RyaW5nJykge1xyXG4gICAgICByZXR1cm4gKGlzT2xkKSA/IHRoaXNbYWN0aW9uXSA6IG5ldyBBY3Rpb24oe25hbWU6IGFjdGlvbn0pO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF9pbnRlcm9wUmVxdWlyZSA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9ialtcImRlZmF1bHRcIl0gOiBvYmo7IH07XG5cbmV4cG9ydHMuY3JlYXRlVmlldyA9IGNyZWF0ZVZpZXc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgUmVhY3QgPSBfaW50ZXJvcFJlcXVpcmUoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdCddIDogbnVsbCkpO1xuXG52YXIgUmVhY3RSb3V0ZXIgPSBfaW50ZXJvcFJlcXVpcmUoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0Um91dGVyJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdFJvdXRlciddIDogbnVsbCkpO1xuXG5mdW5jdGlvbiBnZXRSb3V0ZXIoKSB7XG4gIHZhciBSb3V0ZXIgPSB7fTtcbiAgaWYgKHR5cGVvZiBSZWFjdFJvdXRlciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciByb3V0ZXJFbGVtZW50cyA9IFtcIlJvdXRlXCIsIFwiRGVmYXVsdFJvdXRlXCIsIFwiUm91dGVIYW5kbGVyXCIsIFwiQWN0aXZlSGFuZGxlclwiLCBcIk5vdEZvdW5kUm91dGVcIiwgXCJMaW5rXCIsIFwiUmVkaXJlY3RcIl0sXG4gICAgICAgIHJvdXRlck1peGlucyA9IFtcIk5hdmlnYXRpb25cIiwgXCJTdGF0ZVwiXSxcbiAgICAgICAgcm91dGVyRnVuY3Rpb25zID0gW1wiY3JlYXRlXCIsIFwiY3JlYXRlRGVmYXVsdFJvdXRlXCIsIFwiY3JlYXRlTm90Rm91bmRSb3V0ZVwiLCBcImNyZWF0ZVJlZGlyZWN0XCIsIFwiY3JlYXRlUm91dGVcIiwgXCJjcmVhdGVSb3V0ZXNGcm9tUmVhY3RDaGlsZHJlblwiLCBcInJ1blwiXSxcbiAgICAgICAgcm91dGVyT2JqZWN0cyA9IFtcIkhhc2hMb2NhdGlvblwiLCBcIkhpc3RvcnlcIiwgXCJIaXN0b3J5TG9jYXRpb25cIiwgXCJSZWZyZXNoTG9jYXRpb25cIiwgXCJTdGF0aWNMb2NhdGlvblwiLCBcIlRlc3RMb2NhdGlvblwiLCBcIkltaXRhdGVCcm93c2VyQmVoYXZpb3JcIiwgXCJTY3JvbGxUb1RvcEJlaGF2aW9yXCJdLFxuICAgICAgICBjb3BpZWRJdGVtcyA9IHJvdXRlck1peGlucy5jb25jYXQocm91dGVyRnVuY3Rpb25zKS5jb25jYXQocm91dGVyT2JqZWN0cyk7XG5cbiAgICByb3V0ZXJFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICBSb3V0ZXJbbmFtZV0gPSBSZWFjdC5jcmVhdGVFbGVtZW50LmJpbmQoUmVhY3QsIFJlYWN0Um91dGVyW25hbWVdKTtcbiAgICB9KTtcblxuICAgIGNvcGllZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgIFJvdXRlcltuYW1lXSA9IFJlYWN0Um91dGVyW25hbWVdO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBSb3V0ZXI7XG59XG5cbmZ1bmN0aW9uIGdldERPTSgpIHtcbiAgdmFyIERPTUhlbHBlcnMgPSB7fTtcblxuICBpZiAodHlwZW9mIFJlYWN0ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdmFyIHRhZyA9IGZ1bmN0aW9uIHRhZyhuYW1lKSB7XG4gICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgYXJnc1tfa2V5IC0gMV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgICB9XG5cbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gdW5kZWZpbmVkO1xuICAgICAgdmFyIGZpcnN0ID0gYXJnc1swXSAmJiBhcmdzWzBdLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKGZpcnN0ID09PSBPYmplY3QpIHtcbiAgICAgICAgYXR0cmlidXRlcyA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF0dHJpYnV0ZXMgPSB7fTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBSZWFjdC5ET01bbmFtZV0uYXBwbHkoUmVhY3QuRE9NLCBbYXR0cmlidXRlc10uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgdGFnTmFtZSBpbiBSZWFjdC5ET00pIHtcbiAgICAgIERPTUhlbHBlcnNbdGFnTmFtZV0gPSB0YWcuYmluZCh0aGlzLCB0YWdOYW1lKTtcbiAgICB9XG5cbiAgICBET01IZWxwZXJzLnNwYWNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFJlYWN0LkRPTS5zcGFuKHtcbiAgICAgICAgZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw6IHtcbiAgICAgICAgICBfX2h0bWw6IFwiJm5ic3A7XCJcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gRE9NSGVscGVycztcbn1cblxudmFyIFJvdXRlciA9IGdldFJvdXRlcigpO1xuZXhwb3J0cy5Sb3V0ZXIgPSBSb3V0ZXI7XG52YXIgRE9NID0gZ2V0RE9NKCk7XG5cbmV4cG9ydHMuRE9NID0gRE9NO1xuXG5mdW5jdGlvbiBjcmVhdGVWaWV3KGNsYXNzQXJncykge1xuICB2YXIgUmVhY3RDbGFzcyA9IFJlYWN0LmNyZWF0ZUNsYXNzKGNsYXNzQXJncyk7XG4gIHZhciBSZWFjdEVsZW1lbnQgPSBSZWFjdC5jcmVhdGVFbGVtZW50LmJpbmQoUmVhY3QuY3JlYXRlRWxlbWVudCwgUmVhY3RDbGFzcyk7XG4gIHJldHVybiBSZWFjdEVsZW1lbnQ7XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW1VNkwyTnZaR1V2Wld4cGVHVnlMM0psYzNSeWRXTjBkWEpsTDNkbFlpOXdZV05yWVdkbGN5OWxlR2x0TDNOeVl5OUVUMDFJWld4d1pYSnpMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUk3T3pzN08xRkJkMFJuUWl4VlFVRlZMRWRCUVZZc1ZVRkJWVHM3T3pzN1NVRjRSRzVDTEV0QlFVc3NNa0pCUVUwc1QwRkJUenM3U1VGRGJFSXNWMEZCVnl3eVFrRkJUU3hqUVVGak96dEJRVVYwUXl4VFFVRlRMRk5CUVZNc1IwRkJTVHRCUVVOd1FpeE5RVUZOTEUxQlFVMHNSMEZCUnl4RlFVRkZMRU5CUVVNN1FVRkRiRUlzVFVGQlNTeFBRVUZQTEZkQlFWY3NTMEZCU3l4WFFVRlhMRVZCUVVVN1FVRkRkRU1zVVVGQlNTeGpRVUZqTEVkQlFVY3NRMEZCUXl4UFFVRlBMRVZCUVVVc1kwRkJZeXhGUVVGRkxHTkJRV01zUlVGQlJTeGxRVUZsTEVWQlFVVXNaVUZCWlN4RlFVRkZMRTFCUVUwc1JVRkJSU3hWUVVGVkxFTkJRVU03VVVGRGNFZ3NXVUZCV1N4SFFVRkhMRU5CUVVNc1dVRkJXU3hGUVVGRkxFOUJRVThzUTBGQlF6dFJRVU4wUXl4bFFVRmxMRWRCUVVjc1EwRkJReXhSUVVGUkxFVkJRVVVzYjBKQlFXOUNMRVZCUVVVc2NVSkJRWEZDTEVWQlFVVXNaMEpCUVdkQ0xFVkJRVVVzWVVGQllTeEZRVUZGTEN0Q1FVRXJRaXhGUVVGRkxFdEJRVXNzUTBGQlF6dFJRVU5zU2l4aFFVRmhMRWRCUVVjc1EwRkJReXhqUVVGakxFVkJRVVVzVTBGQlV5eEZRVUZGTEdsQ1FVRnBRaXhGUVVGRkxHbENRVUZwUWl4RlFVRkZMR2RDUVVGblFpeEZRVUZGTEdOQlFXTXNSVUZCUlN4M1FrRkJkMElzUlVGQlJTeHhRa0ZCY1VJc1EwRkJRenRSUVVOd1N5eFhRVUZYTEVkQlFVY3NXVUZCV1N4RFFVRkRMRTFCUVUwc1EwRkJReXhsUVVGbExFTkJRVU1zUTBGQlF5eE5RVUZOTEVOQlFVTXNZVUZCWVN4RFFVRkRMRU5CUVVNN08wRkJSWHBGTEd0Q1FVRmpMRU5CUVVNc1QwRkJUeXhEUVVGRExGVkJRVk1zU1VGQlNTeEZRVUZGTzBGQlEzQkRMRmxCUVUwc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eExRVUZMTEVOQlFVTXNZVUZCWVN4RFFVRkRMRWxCUVVrc1EwRkJReXhMUVVGTExFVkJRVVVzVjBGQlZ5eERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRMRU5CUVVNN1MwRkRia1VzUTBGQlF5eERRVUZET3p0QlFVVklMR1ZCUVZjc1EwRkJReXhQUVVGUExFTkJRVU1zVlVGQlV5eEpRVUZKTEVWQlFVVTdRVUZEYWtNc1dVRkJUU3hEUVVGRExFbEJRVWtzUTBGQlF5eEhRVUZITEZkQlFWY3NRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJRenRMUVVOc1F5eERRVUZETEVOQlFVTTdSMEZEU2p0QlFVTkVMRk5CUVU4c1RVRkJUU3hEUVVGRE8wTkJRMlk3TzBGQlJVUXNVMEZCVXl4TlFVRk5MRWRCUVVrN1FVRkRha0lzVFVGQlRTeFZRVUZWTEVkQlFVY3NSVUZCUlN4RFFVRkRPenRCUVVWMFFpeE5RVUZKTEU5QlFVOHNTMEZCU3l4TFFVRkxMRmRCUVZjc1JVRkJSVHRCUVVOb1F5eFJRVUZKTEVkQlFVY3NSMEZCUnl4aFFVRlZMRWxCUVVrc1JVRkJWenQzUTBGQlRpeEpRVUZKTzBGQlFVb3NXVUZCU1RzN08wRkJReTlDTEZWQlFVa3NWVUZCVlN4WlFVRkJMRU5CUVVNN1FVRkRaaXhWUVVGSkxFdEJRVXNzUjBGQlJ5eEpRVUZKTEVOQlFVTXNRMEZCUXl4RFFVRkRMRWxCUVVrc1NVRkJTU3hEUVVGRExFTkJRVU1zUTBGQlF5eERRVUZETEZkQlFWY3NRMEZCUXp0QlFVTXpReXhWUVVGSkxFdEJRVXNzUzBGQlN5eE5RVUZOTEVWQlFVVTdRVUZEY0VJc2EwSkJRVlVzUjBGQlJ5eEpRVUZKTEVOQlFVTXNTMEZCU3l4RlFVRkZMRU5CUVVNN1QwRkRNMElzVFVGQlRUdEJRVU5NTEd0Q1FVRlZMRWRCUVVjc1JVRkJSU3hEUVVGRE8wOUJRMnBDTzBGQlEwUXNZVUZCVHl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETEV0QlFVc3NRMEZCUXl4TFFVRkxMRU5CUVVNc1IwRkJSeXhGUVVGRkxFTkJRVU1zVlVGQlZTeERRVUZETEVOQlFVTXNUVUZCVFN4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU03UzBGRGNFVXNRMEZCUXpzN1FVRkZSaXhUUVVGTExFbEJRVWtzVDBGQlR5eEpRVUZKTEV0QlFVc3NRMEZCUXl4SFFVRkhMRVZCUVVVN1FVRkROMElzWjBKQlFWVXNRMEZCUXl4UFFVRlBMRU5CUVVNc1IwRkJSeXhIUVVGSExFTkJRVU1zU1VGQlNTeERRVUZETEVsQlFVa3NSVUZCUlN4UFFVRlBMRU5CUVVNc1EwRkJRenRMUVVNdlF6czdRVUZGUkN4alFVRlZMRU5CUVVNc1MwRkJTeXhIUVVGSExGbEJRVmM3UVVGRE5VSXNZVUZCVHl4TFFVRkxMRU5CUVVNc1IwRkJSeXhEUVVGRExFbEJRVWtzUTBGQlF6dEJRVU53UWl3clFrRkJkVUlzUlVGQlJUdEJRVU4yUWl4blFrRkJUU3hGUVVGRkxGRkJRVkU3VTBGRGFrSTdUMEZEUml4RFFVRkRMRU5CUVVNN1MwRkRTaXhEUVVGRE8wZEJRMGc3UVVGRFJDeFRRVUZQTEZWQlFWVXNRMEZCUXp0RFFVTnVRanM3UVVGRlRTeEpRVUZOTEUxQlFVMHNSMEZCUnl4VFFVRlRMRVZCUVVVc1EwRkJRenRSUVVGeVFpeE5RVUZOTEVkQlFVNHNUVUZCVFR0QlFVTmFMRWxCUVUwc1IwRkJSeXhIUVVGSExFMUJRVTBzUlVGQlJTeERRVUZET3p0UlFVRm1MRWRCUVVjc1IwRkJTQ3hIUVVGSE96dEJRVVZVTEZOQlFWTXNWVUZCVlN4RFFVRkZMRk5CUVZNc1JVRkJSVHRCUVVOeVF5eE5RVUZKTEZWQlFWVXNSMEZCUnl4TFFVRkxMRU5CUVVNc1YwRkJWeXhEUVVGRExGTkJRVk1zUTBGQlF5eERRVUZETzBGQlF6bERMRTFCUVVrc1dVRkJXU3hIUVVGSExFdEJRVXNzUTBGQlF5eGhRVUZoTEVOQlFVTXNTVUZCU1N4RFFVRkRMRXRCUVVzc1EwRkJReXhoUVVGaExFVkJRVVVzVlVGQlZTeERRVUZETEVOQlFVTTdRVUZETjBVc1UwRkJUeXhaUVVGWkxFTkJRVU03UTBGRGNrSWlMQ0ptYVd4bElqb2laMlZ1WlhKaGRHVmtMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiSW1sdGNHOXlkQ0JTWldGamRDQm1jbTl0SUNkeVpXRmpkQ2M3WEhKY2JtbHRjRzl5ZENCU1pXRmpkRkp2ZFhSbGNpQm1jbTl0SUNkeVpXRmpkQzF5YjNWMFpYSW5PMXh5WEc1Y2NseHVablZ1WTNScGIyNGdaMlYwVW05MWRHVnlJQ2dwSUh0Y2NseHVJQ0JqYjI1emRDQlNiM1YwWlhJZ1BTQjdmVHRjY2x4dUlDQnBaaUFvZEhsd1pXOW1JRkpsWVdOMFVtOTFkR1Z5SUNFOVBTQW5kVzVrWldacGJtVmtKeWtnZTF4eVhHNGdJQ0FnYkdWMElISnZkWFJsY2tWc1pXMWxiblJ6SUQwZ1d5ZFNiM1YwWlNjc0lDZEVaV1poZFd4MFVtOTFkR1VuTENBblVtOTFkR1ZJWVc1a2JHVnlKeXdnSjBGamRHbDJaVWhoYm1Sc1pYSW5MQ0FuVG05MFJtOTFibVJTYjNWMFpTY3NJQ2RNYVc1ckp5d2dKMUpsWkdseVpXTjBKMTBzWEhKY2JpQWdJQ0J5YjNWMFpYSk5hWGhwYm5NZ1BTQmJKMDVoZG1sbllYUnBiMjRuTENBblUzUmhkR1VuWFN4Y2NseHVJQ0FnSUhKdmRYUmxja1oxYm1OMGFXOXVjeUE5SUZzblkzSmxZWFJsSnl3Z0oyTnlaV0YwWlVSbFptRjFiSFJTYjNWMFpTY3NJQ2RqY21WaGRHVk9iM1JHYjNWdVpGSnZkWFJsSnl3Z0oyTnlaV0YwWlZKbFpHbHlaV04wSnl3Z0oyTnlaV0YwWlZKdmRYUmxKeXdnSjJOeVpXRjBaVkp2ZFhSbGMwWnliMjFTWldGamRFTm9hV3hrY21WdUp5d2dKM0oxYmlkZExGeHlYRzRnSUNBZ2NtOTFkR1Z5VDJKcVpXTjBjeUE5SUZzblNHRnphRXh2WTJGMGFXOXVKeXdnSjBocGMzUnZjbmtuTENBblNHbHpkRzl5ZVV4dlkyRjBhVzl1Snl3Z0oxSmxabkpsYzJoTWIyTmhkR2x2Ymljc0lDZFRkR0YwYVdOTWIyTmhkR2x2Ymljc0lDZFVaWE4wVEc5allYUnBiMjRuTENBblNXMXBkR0YwWlVKeWIzZHpaWEpDWldoaGRtbHZjaWNzSUNkVFkzSnZiR3hVYjFSdmNFSmxhR0YyYVc5eUoxMHNYSEpjYmlBZ0lDQmpiM0JwWldSSmRHVnRjeUE5SUhKdmRYUmxjazFwZUdsdWN5NWpiMjVqWVhRb2NtOTFkR1Z5Um5WdVkzUnBiMjV6S1M1amIyNWpZWFFvY205MWRHVnlUMkpxWldOMGN5azdYSEpjYmx4eVhHNGdJQ0FnY205MWRHVnlSV3hsYldWdWRITXVabTl5UldGamFDaG1kVzVqZEdsdmJpaHVZVzFsS1NCN1hISmNiaUFnSUNBZ0lGSnZkWFJsY2x0dVlXMWxYU0E5SUZKbFlXTjBMbU55WldGMFpVVnNaVzFsYm5RdVltbHVaQ2hTWldGamRDd2dVbVZoWTNSU2IzVjBaWEpiYm1GdFpWMHBPMXh5WEc0Z0lDQWdmU2s3WEhKY2JseHlYRzRnSUNBZ1kyOXdhV1ZrU1hSbGJYTXVabTl5UldGamFDaG1kVzVqZEdsdmJpaHVZVzFsS1NCN1hISmNiaUFnSUNBZ0lGSnZkWFJsY2x0dVlXMWxYU0E5SUZKbFlXTjBVbTkxZEdWeVcyNWhiV1ZkTzF4eVhHNGdJQ0FnZlNrN1hISmNiaUFnZlZ4eVhHNGdJSEpsZEhWeWJpQlNiM1YwWlhJN1hISmNibjFjY2x4dVhISmNibVoxYm1OMGFXOXVJR2RsZEVSUFRTQW9LU0I3WEhKY2JpQWdZMjl1YzNRZ1JFOU5TR1ZzY0dWeWN5QTlJSHQ5TzF4eVhHNWNjbHh1SUNCcFppQW9kSGx3Wlc5bUlGSmxZV04wSUNFOVBTQW5kVzVrWldacGJtVmtKeWtnZTF4eVhHNGdJQ0FnYkdWMElIUmhaeUE5SUdaMWJtTjBhVzl1SUNodVlXMWxMQ0F1TGk1aGNtZHpLU0I3WEhKY2JpQWdJQ0FnSUd4bGRDQmhkSFJ5YVdKMWRHVnpPMXh5WEc0Z0lDQWdJQ0JzWlhRZ1ptbHljM1FnUFNCaGNtZHpXekJkSUNZbUlHRnlaM05iTUYwdVkyOXVjM1J5ZFdOMGIzSTdYSEpjYmlBZ0lDQWdJR2xtSUNobWFYSnpkQ0E5UFQwZ1QySnFaV04wS1NCN1hISmNiaUFnSUNBZ0lDQWdZWFIwY21saWRYUmxjeUE5SUdGeVozTXVjMmhwWm5Rb0tUdGNjbHh1SUNBZ0lDQWdmU0JsYkhObElIdGNjbHh1SUNBZ0lDQWdJQ0JoZEhSeWFXSjFkR1Z6SUQwZ2UzMDdYSEpjYmlBZ0lDQWdJSDFjY2x4dUlDQWdJQ0FnY21WMGRYSnVJRkpsWVdOMExrUlBUVnR1WVcxbFhTNWhjSEJzZVNoU1pXRmpkQzVFVDAwc0lGdGhkSFJ5YVdKMWRHVnpYUzVqYjI1allYUW9ZWEpuY3lrcE8xeHlYRzRnSUNBZ2ZUdGNjbHh1WEhKY2JpQWdJQ0JtYjNJZ0tHeGxkQ0IwWVdkT1lXMWxJR2x1SUZKbFlXTjBMa1JQVFNrZ2UxeHlYRzRnSUNBZ0lDQkVUMDFJWld4d1pYSnpXM1JoWjA1aGJXVmRJRDBnZEdGbkxtSnBibVFvZEdocGN5d2dkR0ZuVG1GdFpTazdYSEpjYmlBZ0lDQjlYSEpjYmx4eVhHNGdJQ0FnUkU5TlNHVnNjR1Z5Y3k1emNHRmpaU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHlYRzRnSUNBZ0lDQnlaWFIxY200Z1VtVmhZM1F1UkU5TkxuTndZVzRvZTF4eVhHNGdJQ0FnSUNBZ0lHUmhibWRsY205MWMyeDVVMlYwU1c1dVpYSklWRTFNT2lCN1hISmNiaUFnSUNBZ0lDQWdJQ0JmWDJoMGJXdzZJQ2NtYm1KemNEc25YSEpjYmlBZ0lDQWdJQ0FnZlZ4eVhHNGdJQ0FnSUNCOUtUdGNjbHh1SUNBZ0lIMDdYSEpjYmlBZ2ZWeHlYRzRnSUhKbGRIVnliaUJFVDAxSVpXeHdaWEp6TzF4eVhHNTlYSEpjYmx4eVhHNWxlSEJ2Y25RZ1kyOXVjM1FnVW05MWRHVnlJRDBnWjJWMFVtOTFkR1Z5S0NrN1hISmNibVY0Y0c5eWRDQmpiMjV6ZENCRVQwMGdQU0JuWlhSRVQwMG9LVHRjY2x4dVhISmNibVY0Y0c5eWRDQm1kVzVqZEdsdmJpQmpjbVZoZEdWV2FXVjNJQ2hqYkdGemMwRnlaM01wSUh0Y2NseHVJQ0JzWlhRZ1VtVmhZM1JEYkdGemN5QTlJRkpsWVdOMExtTnlaV0YwWlVOc1lYTnpLR05zWVhOelFYSm5jeWs3WEhKY2JpQWdiR1YwSUZKbFlXTjBSV3hsYldWdWRDQTlJRkpsWVdOMExtTnlaV0YwWlVWc1pXMWxiblF1WW1sdVpDaFNaV0ZqZEM1amNtVmhkR1ZGYkdWdFpXNTBMQ0JTWldGamRFTnNZWE56S1R0Y2NseHVJQ0J5WlhSMWNtNGdVbVZoWTNSRmJHVnRaVzUwTzF4eVhHNTlYSEpjYmlKZGZRPT0iLCJpbXBvcnQge0FjdGlvbnN9IGZyb20gJy4vQWN0aW9ucyc7XHJcbmltcG9ydCB1dGlscyBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IEZyZWV6ZXIgZnJvbSAnZnJlZXplci1qcyc7XHJcbmltcG9ydCBnZXRDb25uZWN0TWl4aW4gZnJvbSAnLi9taXhpbnMvY29ubmVjdCc7XHJcblxyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3RvcmUge1xyXG4gIGNvbnN0cnVjdG9yKGFyZ3M9e30pIHtcclxuICAgIGxldCB7YWN0aW9ucywgaW5pdGlhbH0gPSBhcmdzO1xyXG4gICAgbGV0IGluaXQgPSB0eXBlb2YgaW5pdGlhbCA9PT0gJ2Z1bmN0aW9uJyA/IGluaXRpYWwoKSA6IGluaXRpYWw7XHJcbiAgICBsZXQgc3RvcmUgPSBuZXcgRnJlZXplcihpbml0IHx8IHt9KTtcclxuXHJcbiAgICB0aGlzLmNvbm5lY3QgPSBmdW5jdGlvbiAoLi4uYXJncykge1xyXG4gICAgICByZXR1cm4gZ2V0Q29ubmVjdE1peGluKHRoaXMsIGFyZ3MuY29uY2F0KGFyZ3MpKTtcclxuICAgIH07XHJcblxyXG4gICAgdGhpcy5oYW5kbGVycyA9IGFyZ3MuaGFuZGxlcnMgfHwgdXRpbHMuZ2V0V2l0aG91dEZpZWxkcyhbJ2FjdGlvbnMnXSwgYXJncykgfHwge307XHJcblxyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoYWN0aW9ucykpIHtcclxuICAgICAgdGhpcy5hY3Rpb25zID0gYWN0aW9ucyA9IG5ldyBBY3Rpb25zKGFjdGlvbnMpO1xyXG4gICAgICB0aGlzLmFjdGlvbnMuYWRkU3RvcmUodGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc2V0ID0gZnVuY3Rpb24gKGl0ZW0sIHZhbHVlKSB7XHJcbiAgICAgIHN0b3JlLmdldCgpLnNldChpdGVtLCB2YWx1ZSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGdldCA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgIGlmIChpdGVtKVxyXG4gICAgICAgIHJldHVybiBzdG9yZS5nZXQoKS50b0pTKClbaXRlbV07XHJcbiAgICAgIHJldHVybiBzdG9yZS5nZXQoKTtcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcmVzZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHRoaXMuc2V0KGluaXQpO1xyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnNldCA9IHNldDtcclxuICAgIHRoaXMuZ2V0ID0gZ2V0O1xyXG4gICAgdGhpcy5yZXNldCA9IHJlc2V0O1xyXG4gICAgdGhpcy5zdG9yZSA9IHN0b3JlO1xyXG5cclxuICAgIHRoaXMuc3RhdGVQcm90byA9IHtzZXQsIGdldCwgcmVzZXQsIGFjdGlvbnN9O1xyXG4gICAgLy90aGlzLmdldHRlciA9IG5ldyBHZXR0ZXIodGhpcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGFkZEFjdGlvbihpdGVtKSB7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShpdGVtKSkge1xyXG4gICAgICB0aGlzLmFjdGlvbnMgPSB0aGlzLmFjdGlvbnMuY29uY2F0KHRoaXMuYWN0aW9ucyk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xyXG4gICAgICB0aGlzLmFjdGlvbnMucHVzaChpdGVtKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJlbW92ZUFjdGlvbihpdGVtKSB7XHJcbiAgICB2YXIgYWN0aW9uO1xyXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xyXG4gICAgICBhY3Rpb24gPSB0aGlzLmZpbmRCeU5hbWUoJ2FjdGlvbnMnLCAnbmFtZScsIGl0ZW0pO1xyXG4gICAgICBpZiAoYWN0aW9uKSBhY3Rpb24ucmVtb3ZlU3RvcmUodGhpcyk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xyXG4gICAgICBhY3Rpb24gPSBpdGVtO1xyXG4gICAgICBsZXQgaW5kZXggPSB0aGlzLmFjdGlvbnMuaW5kZXhPZihhY3Rpb24pO1xyXG4gICAgICBpZiAoaW5kZXggIT09IC0xKSB7XHJcbiAgICAgICAgYWN0aW9uLnJlbW92ZVN0b3JlKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuYWN0aW9ucyA9IHRoaXMuYWN0aW9ucy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXRBY3Rpb25DeWNsZShhY3Rpb25OYW1lLCBwcmVmaXg9J29uJykge1xyXG4gICAgY29uc3QgY2FwaXRhbGl6ZWQgPSB1dGlscy5jYXBpdGFsaXplKGFjdGlvbk5hbWUpO1xyXG4gICAgY29uc3QgZnVsbEFjdGlvbk5hbWUgPSBgJHtwcmVmaXh9JHtjYXBpdGFsaXplZH1gO1xyXG4gICAgY29uc3QgaGFuZGxlciA9IHRoaXMuaGFuZGxlcnNbZnVsbEFjdGlvbk5hbWVdIHx8IHRoaXMuaGFuZGxlcnNbYWN0aW9uTmFtZV07XHJcbiAgICBpZiAoIWhhbmRsZXIpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBObyBoYW5kbGVycyBmb3IgJHthY3Rpb25OYW1lfSBhY3Rpb24gZGVmaW5lZCBpbiBjdXJyZW50IHN0b3JlYCk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGFjdGlvbnM7XHJcbiAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgIGFjdGlvbnMgPSBoYW5kbGVyO1xyXG4gICAgfSBlbHNlIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICBhY3Rpb25zID0ge29uOiBoYW5kbGVyfTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHtoYW5kbGVyfSBtdXN0IGJlIGFuIG9iamVjdCBvciBmdW5jdGlvbmApO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFjdGlvbnM7XHJcbiAgfVxyXG5cclxuICAvLyAxLiB3aWxsKGluaXRpYWwpID0+IHdpbGxSZXN1bHRcclxuICAvLyAyLiB3aGlsZSh0cnVlKVxyXG4gIC8vIDMuIG9uKHdpbGxSZXN1bHQgfHwgaW5pdGlhbCkgPT4gb25SZXN1bHRcclxuICAvLyA0LiB3aGlsZShmYWxzZSlcclxuICAvLyA1LiBkaWQob25SZXN1bHQpXHJcbiAgcnVuQ3ljbGUoYWN0aW9uTmFtZSwgLi4uYXJncykge1xyXG4gICAgLy8gbmV3IFByb21pc2UocmVzb2x2ZSA9PiByZXNvbHZlKHRydWUpKVxyXG4gICAgY29uc3QgY3ljbGUgPSB0aGlzLmdldEFjdGlvbkN5Y2xlKGFjdGlvbk5hbWUpO1xyXG4gICAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgIGxldCB3aWxsID0gY3ljbGUud2lsbCwgd2hpbGVfID0gY3ljbGUud2hpbGUsIG9uXyA9IGN5Y2xlLm9uO1xyXG4gICAgbGV0IGRpZCA9IGN5Y2xlLmRpZCwgZGlkTm90ID0gY3ljbGUuZGlkTm90O1xyXG5cclxuICAgIC8vIExvY2FsIHN0YXRlIGZvciB0aGlzIGN5Y2xlLlxyXG4gICAgbGV0IHN0YXRlID0gT2JqZWN0LmNyZWF0ZSh0aGlzLnN0YXRlUHJvdG8pO1xyXG5cclxuICAgIC8vIFByZS1jaGVjayAmIHByZXBhcmF0aW9ucy5cclxuICAgIGlmICh3aWxsKSBwcm9taXNlID0gcHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgcmV0dXJuIHdpbGwuYXBwbHkoc3RhdGUsIGFyZ3MpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RhcnQgd2hpbGUoKS5cclxuICAgIGlmICh3aGlsZV8pIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKHdpbGxSZXN1bHQpID0+IHtcclxuICAgICAgd2hpbGVfLmNhbGwoc3RhdGUsIHRydWUpO1xyXG4gICAgICByZXR1cm4gd2lsbFJlc3VsdDtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFjdHVhbCBleGVjdXRpb24uXHJcbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKCh3aWxsUmVzdWx0KSA9PiB7XHJcbiAgICAgIGlmICh3aWxsUmVzdWx0ID09IG51bGwpIHtcclxuICAgICAgICByZXR1cm4gb25fLmFwcGx5KHN0YXRlLCBhcmdzKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gb25fLmNhbGwoc3RhdGUsIHdpbGxSZXN1bHQpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdG9wIHdoaWxlKCkuXHJcbiAgICBpZiAod2hpbGVfKSBwcm9taXNlID0gcHJvbWlzZS50aGVuKChvblJlc3VsdCkgPT4ge1xyXG4gICAgICB3aGlsZV8uY2FsbChzdGF0ZSwgZmFsc2UpO1xyXG4gICAgICByZXR1cm4gb25SZXN1bHQ7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGb3IgZGlkIGFuZCBkaWROb3Qgc3RhdGUgaXMgZnJlZXplZC5cclxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKG9uUmVzdWx0KSA9PiB7XHJcbiAgICAgIE9iamVjdC5mcmVlemUoc3RhdGUpO1xyXG4gICAgICByZXR1cm4gb25SZXN1bHQ7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBIYW5kbGUgdGhlIHJlc3VsdC5cclxuICAgIGlmIChkaWQpIHByb21pc2UgPSBwcm9taXNlLnRoZW4ob25SZXN1bHQgPT4ge1xyXG4gICAgICByZXR1cm4gZGlkLmNhbGwoc3RhdGUsIG9uUmVzdWx0KTtcclxuICAgIH0pO1xyXG5cclxuICAgIHByb21pc2UuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICBpZiAod2hpbGVfKSB3aGlsZV8uY2FsbCh0aGlzLCBzdGF0ZSwgZmFsc2UpO1xyXG4gICAgICBpZiAoZGlkTm90KSB7XHJcbiAgICAgICAgZGlkTm90LmNhbGwoc3RhdGUsIGVycm9yKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHByb21pc2U7XHJcbiAgfVxyXG59XHJcbiIsImV4cG9ydCBkZWZhdWx0IHtcclxuICBjeDogZnVuY3Rpb24gKGNsYXNzTmFtZXMpIHtcclxuICAgIGlmICh0eXBlb2YgY2xhc3NOYW1lcyA9PSAnb2JqZWN0Jykge1xyXG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoY2xhc3NOYW1lcykuZmlsdGVyKGZ1bmN0aW9uKGNsYXNzTmFtZSkge1xyXG4gICAgICAgIHJldHVybiBjbGFzc05hbWVzW2NsYXNzTmFtZV07XHJcbiAgICAgIH0pLmpvaW4oJyAnKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuam9pbi5jYWxsKGFyZ3VtZW50cywgJyAnKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldENvbm5lY3RNaXhpbiAoc3RvcmUpIHtcclxuICBsZXQgY2hhbmdlQ2FsbGJhY2sgPSBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgIHRoaXMuc2V0U3RhdGUoc3RhdGUudG9KUygpKTtcclxuICB9O1xyXG5cclxuICBsZXQgbGlzdGVuZXI7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgY29uc3QgZnJvemVuID0gc3RvcmUuc3RvcmUuZ2V0KGFyZ3VtZW50cyk7XHJcbiAgICAgIGNvbnN0IHN0YXRlID0gZnJvemVuLnRvSlMoKTtcclxuXHJcbiAgICAgIGlmICghdGhpcy5ib3VuZEV4aW1DaGFuZ2VDYWxsYmFja3MpXHJcbiAgICAgICAgdGhpcy5ib3VuZEV4aW1DaGFuZ2VDYWxsYmFja3MgPSB7fTtcclxuXHJcbiAgICAgIHRoaXMuYm91bmRFeGltQ2hhbmdlQ2FsbGJhY2tzW3N0b3JlXSA9IGNoYW5nZUNhbGxiYWNrLmJpbmQodGhpcyk7XHJcblxyXG4gICAgICBsaXN0ZW5lciA9IGZyb3plbi5nZXRMaXN0ZW5lcigpO1xyXG4gICAgICByZXR1cm4gc3RhdGU7XHJcbiAgICB9LFxyXG5cclxuICAgIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGxpc3RlbmVyLm9uKCd1cGRhdGUnLCB0aGlzLmJvdW5kRXhpbUNoYW5nZUNhbGxiYWNrc1tzdG9yZV0pO1xyXG4gICAgfSxcclxuXHJcbiAgICBjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24gKCkge1xyXG4gICAgICBpZiAobGlzdGVuZXIpXHJcbiAgICAgICAgbGlzdGVuZXIub2ZmKCd1cGRhdGUnLCB0aGlzLmJvdW5kRXhpbUNoYW5nZUNhbGxiYWNrc1tzdG9yZV0pO1xyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuIiwiY29uc3QgdXRpbHMgPSB7fTtcclxuXHJcbnV0aWxzLmdldFdpdGhvdXRGaWVsZHMgPSBmdW5jdGlvbiAob3V0Y2FzdCwgdGFyZ2V0KSB7XHJcbiAgaWYgKCF0YXJnZXQpIHRocm93IG5ldyBFcnJvcignVHlwZUVycm9yOiB0YXJnZXQgaXMgbm90IGFuIG9iamVjdC4nKTtcclxuICB2YXIgcmVzdWx0ID0ge307XHJcbiAgaWYgKHR5cGVvZiBvdXRjYXN0ID09PSAnc3RyaW5nJykgb3V0Y2FzdCA9IFtvdXRjYXN0XTtcclxuICB2YXIgdEtleXMgPSBPYmplY3Qua2V5cyh0YXJnZXQpO1xyXG4gIG91dGNhc3QuZm9yRWFjaChmdW5jdGlvbihmaWVsZE5hbWUpIHtcclxuICAgIHRLZXlzXHJcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgcmV0dXJuIGtleSAhPT0gZmllbGROYW1lO1xyXG4gICAgICB9KVxyXG4gICAgICAuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcclxuICAgICAgICByZXN1bHRba2V5XSA9IHRhcmdldFtrZXldO1xyXG4gICAgICB9KTtcclxuICB9KTtcclxuICByZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5cclxudXRpbHMub2JqZWN0VG9BcnJheSA9IGZ1bmN0aW9uIChvYmplY3QpIHtcclxuICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0KS5tYXAoa2V5ID0+IG9iamVjdFtrZXldKTtcclxufTtcclxuXHJcbnV0aWxzLmNsYXNzV2l0aEFyZ3MgPSBmdW5jdGlvbiAoSXRlbSwgYXJncykge1xyXG4gIHJldHVybiBJdGVtLmJpbmQuYXBwbHkoSXRlbSxbSXRlbV0uY29uY2F0KGFyZ3MpKTtcclxufTtcclxuXHJcbi8vIDEuIHdpbGxcclxuLy8gMi4gd2hpbGUodHJ1ZSlcclxuLy8gMy4gb25cclxuLy8gNC4gd2hpbGUoZmFsc2UpXHJcbi8vIDUuIGRpZCBvciBkaWROb3RcclxudXRpbHMubWFwQWN0aW9uTmFtZXMgPSBmdW5jdGlvbihvYmplY3QpIHtcclxuICBjb25zdCBsaXN0ID0gW107XHJcbiAgY29uc3QgcHJlZml4ZXMgPSBbJ3dpbGwnLCAnd2hpbGVTdGFydCcsICdvbicsICd3aGlsZUVuZCcsICdkaWQnLCAnZGlkTm90J107XHJcbiAgcHJlZml4ZXMuZm9yRWFjaChpdGVtID0+IHtcclxuICAgIGxldCBuYW1lID0gaXRlbTtcclxuICAgIGlmIChpdGVtID09PSAnd2hpbGVTdGFydCcgfHwgaXRlbSA9PT0gJ3doaWxlRW5kJykge1xyXG4gICAgICBuYW1lID0gJ3doaWxlJztcclxuICAgIH1cclxuICAgIGlmIChvYmplY3RbbmFtZV0pIHtcclxuICAgICAgbGlzdC5wdXNoKFtpdGVtLCBvYmplY3RbbmFtZV1dKTtcclxuICAgIH1cclxuICB9KTtcclxuICByZXR1cm4gbGlzdDtcclxufTtcclxuXHJcbnV0aWxzLmlzT2JqZWN0ID0gZnVuY3Rpb24gKHRhcmcpIHtcclxuICByZXR1cm4gdGFyZyA/IHRhcmcudG9TdHJpbmcoKS5zbGljZSg4LDE0KSA9PT0gJ09iamVjdCcgOiBmYWxzZTtcclxufTtcclxudXRpbHMuY2FwaXRhbGl6ZSA9IGZ1bmN0aW9uIChzdHIpIHtcclxuICBjb25zdCBmaXJzdCA9IHN0ci5jaGFyQXQoMCkudG9VcHBlckNhc2UoKTtcclxuICBjb25zdCByZXN0ID0gc3RyLnNsaWNlKDEpO1xyXG4gIHJldHVybiBgJHtmaXJzdH0ke3Jlc3R9YDtcclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHV0aWxzO1xyXG4iXX0=
