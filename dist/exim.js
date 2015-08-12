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
      store.set(init);
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
      listener = frozen.getListener();
      return state;
    },

    componentDidMount: function componentDidMount() {
      listener.on("update", changeCallback.bind(this));
    },

    componentWillUnmount: function componentWillUnmount() {
      listener.off("update");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiZTovY29kZS9lbGl4ZXIvcmVzdHJ1Y3R1cmUvd2ViL3BhY2thZ2VzL2V4aW0vc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvZnJlZXplci5qcyIsIm5vZGVfbW9kdWxlcy9mcmVlemVyLWpzL3NyYy9lbWl0dGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvc3JjL2ZyZWV6ZXIuanMiLCJub2RlX21vZHVsZXMvZnJlZXplci1qcy9zcmMvZnJvemVuLmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvc3JjL21peGlucy5qcyIsIm5vZGVfbW9kdWxlcy9mcmVlemVyLWpzL3NyYy91dGlscy5qcyIsImU6L2NvZGUvZWxpeGVyL3Jlc3RydWN0dXJlL3dlYi9wYWNrYWdlcy9leGltL3NyYy9BY3Rpb25zLmpzIiwic3JjL0RPTUhlbHBlcnMuanMiLCJlOi9jb2RlL2VsaXhlci9yZXN0cnVjdHVyZS93ZWIvcGFja2FnZXMvZXhpbS9zcmMvU3RvcmUuanMiLCJlOi9jb2RlL2VsaXhlci9yZXN0cnVjdHVyZS93ZWIvcGFja2FnZXMvZXhpbS9zcmMvaGVscGVycy5qcyIsImU6L2NvZGUvZWxpeGVyL3Jlc3RydWN0dXJlL3dlYi9wYWNrYWdlcy9leGltL3NyYy9taXhpbnMvY29ubmVjdC5qcyIsImU6L2NvZGUvZWxpeGVyL3Jlc3RydWN0dXJlL3dlYi9wYWNrYWdlcy9leGltL3NyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7dUJDQThCLFdBQVc7O0lBQWpDLE1BQU0sWUFBTixNQUFNO0lBQUUsT0FBTyxZQUFQLE9BQU87O0lBQ2hCLEtBQUssMkJBQU0sU0FBUzs7SUFDcEIsT0FBTywyQkFBTSxXQUFXOzswQkFDTyxjQUFjOztJQUE1QyxVQUFVLGVBQVYsVUFBVTtJQUFFLE1BQU0sZUFBTixNQUFNO0lBQUUsR0FBRyxlQUFILEdBQUc7O0FBRS9CLElBQU0sSUFBSSxHQUFHLEVBQUMsTUFBTSxFQUFOLE1BQU0sRUFBRSxPQUFPLEVBQVAsT0FBTyxFQUFFLEtBQUssRUFBTCxLQUFLLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRSxHQUFHLEVBQUgsR0FBRyxFQUFFLE9BQU8sRUFBUCxPQUFPLEVBQUUsVUFBVSxFQUFWLFVBQVUsRUFBQyxDQUFDOztBQUV4RSxJQUFJLENBQUMsWUFBWSxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQ2xDLFNBQU8sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDekIsQ0FBQzs7QUFFRixJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQ25DLFNBQU8sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDMUIsQ0FBQzs7QUFFRixJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQ2pDLFNBQU8sSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDeEIsQ0FBQzs7aUJBRWEsSUFBSTs7O0FDbkJuQjtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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TUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLE1BQU0sUUFBUSxHQUFHLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztBQUMzRSxVQUFRLENBQUMsT0FBTyxDQUFDLFVBQUEsSUFBSSxFQUFJO0FBQ3ZCLFFBQUksSUFBSSxHQUFHLElBQUksQ0FBQztBQUNoQixRQUFJLElBQUksS0FBSyxZQUFZLElBQUksSUFBSSxLQUFLLFVBQVUsRUFBRTtBQUNoRCxVQUFJLEdBQUcsT0FBTyxDQUFDO0tBQ2hCO0FBQ0QsUUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDaEIsVUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2pDO0dBQ0YsQ0FBQyxDQUFDO0FBQ0gsU0FBTyxJQUFJLENBQUM7Q0FDYixDQUFDOztBQUVGLEtBQUssQ0FBQyxRQUFRLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDL0IsU0FBTyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUMsRUFBRSxDQUFDLEtBQUssUUFBUSxHQUFHLEtBQUssQ0FBQztDQUNoRSxDQUFDO0FBQ0YsS0FBSyxDQUFDLFVBQVUsR0FBRyxVQUFVLEdBQUcsRUFBRTtBQUNoQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsY0FBVSxLQUFLLFFBQUcsSUFBSSxDQUFHO0NBQzFCLENBQUM7O2lCQUVhLEtBQUsiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IHtBY3Rpb24sIEFjdGlvbnN9IGZyb20gJy4vQWN0aW9ucyc7XHJcbmltcG9ydCBTdG9yZSBmcm9tICcuL1N0b3JlJztcclxuaW1wb3J0IGhlbHBlcnMgZnJvbSAnLi9oZWxwZXJzJztcclxuaW1wb3J0IHtjcmVhdGVWaWV3LCBSb3V0ZXIsIERPTX0gZnJvbSAnLi9ET01IZWxwZXJzJztcclxuXHJcbmNvbnN0IEV4aW0gPSB7QWN0aW9uLCBBY3Rpb25zLCBTdG9yZSwgUm91dGVyLCBET00sIGhlbHBlcnMsIGNyZWF0ZVZpZXd9O1xyXG5cclxuRXhpbS5jcmVhdGVBY3Rpb24gPSBmdW5jdGlvbiAoYXJncykge1xyXG4gIHJldHVybiBuZXcgQWN0aW9uKGFyZ3MpO1xyXG59O1xyXG5cclxuRXhpbS5jcmVhdGVBY3Rpb25zID0gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICByZXR1cm4gbmV3IEFjdGlvbnMoYXJncyk7XHJcbn07XHJcblxyXG5FeGltLmNyZWF0ZVN0b3JlID0gZnVuY3Rpb24gKGFyZ3MpIHtcclxuICByZXR1cm4gbmV3IFN0b3JlKGFyZ3MpO1xyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgRXhpbTtcclxuIiwidmFyIEZyZWV6ZXIgPSByZXF1aXJlKCcuL3NyYy9mcmVlemVyJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEZyZWV6ZXI7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVXRpbHMgPSByZXF1aXJlKCAnLi91dGlscycgKTtcblxuLy8jYnVpbGRcblxuLy8gVGhlIHByb3RvdHlwZSBtZXRob2RzIGFyZSBzdG9yZWQgaW4gYSBkaWZmZXJlbnQgb2JqZWN0XG4vLyBhbmQgYXBwbGllZCBhcyBub24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzIGxhdGVyXG52YXIgZW1pdHRlclByb3RvID0ge1xuXHRvbjogZnVuY3Rpb24oIGV2ZW50TmFtZSwgbGlzdGVuZXIsIG9uY2UgKXtcblx0XHR2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzWyBldmVudE5hbWUgXSB8fCBbXTtcblxuXHRcdGxpc3RlbmVycy5wdXNoKHsgY2FsbGJhY2s6IGxpc3RlbmVyLCBvbmNlOiBvbmNlfSk7XG5cdFx0dGhpcy5fZXZlbnRzWyBldmVudE5hbWUgXSA9ICBsaXN0ZW5lcnM7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRvbmNlOiBmdW5jdGlvbiggZXZlbnROYW1lLCBsaXN0ZW5lciApe1xuXHRcdHRoaXMub24oIGV2ZW50TmFtZSwgbGlzdGVuZXIsIHRydWUgKTtcblx0fSxcblxuXHRvZmY6IGZ1bmN0aW9uKCBldmVudE5hbWUsIGxpc3RlbmVyICl7XG5cdFx0aWYoIHR5cGVvZiBldmVudE5hbWUgPT0gJ3VuZGVmaW5lZCcgKXtcblx0XHRcdHRoaXMuX2V2ZW50cyA9IHt9O1xuXHRcdH1cblx0XHRlbHNlIGlmKCB0eXBlb2YgbGlzdGVuZXIgPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHR0aGlzLl9ldmVudHNbIGV2ZW50TmFtZSBdID0gW107XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1sgZXZlbnROYW1lIF0gfHwgW10sXG5cdFx0XHRcdGlcblx0XHRcdDtcblxuXHRcdFx0Zm9yIChpID0gbGlzdGVuZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRcdGlmKCBsaXN0ZW5lcnNbaV0gPT09IGxpc3RlbmVyIClcblx0XHRcdFx0XHRsaXN0ZW5lcnMuc3BsaWNlKCBpLCAxICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0dHJpZ2dlcjogZnVuY3Rpb24oIGV2ZW50TmFtZSApe1xuXHRcdHZhciBhcmdzID0gW10uc2xpY2UuY2FsbCggYXJndW1lbnRzLCAxICksXG5cdFx0XHRsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbIGV2ZW50TmFtZSBdIHx8IFtdLFxuXHRcdFx0b25jZUxpc3RlbmVycyA9IFtdLFxuXHRcdFx0aSwgbGlzdGVuZXJcblx0XHQ7XG5cblx0XHQvLyBDYWxsIGxpc3RlbmVyc1xuXHRcdGZvciAoaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGxpc3RlbmVyID0gbGlzdGVuZXJzW2ldO1xuXG5cdFx0XHRpZiggbGlzdGVuZXIuY2FsbGJhY2sgKVxuXHRcdFx0XHRsaXN0ZW5lci5jYWxsYmFjay5hcHBseSggbnVsbCwgYXJncyApO1xuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdC8vIElmIHRoZXJlIGlzIG5vdCBhIGNhbGxiYWNrLCByZW1vdmUhXG5cdFx0XHRcdGxpc3RlbmVyLm9uY2UgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiggbGlzdGVuZXIub25jZSApXG5cdFx0XHRcdG9uY2VMaXN0ZW5lcnMucHVzaCggaSApO1xuXHRcdH1cblxuXHRcdC8vIFJlbW92ZSBsaXN0ZW5lcnMgbWFya2VkIGFzIG9uY2Vcblx0XHRmb3IoIGkgPSBvbmNlTGlzdGVuZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tICl7XG5cdFx0XHRsaXN0ZW5lcnMuc3BsaWNlKCBvbmNlTGlzdGVuZXJzW2ldLCAxICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn07XG5cbi8vIE1ldGhvZHMgYXJlIG5vdCBlbnVtZXJhYmxlIHNvLCB3aGVuIHRoZSBzdG9yZXMgYXJlXG4vLyBleHRlbmRlZCB3aXRoIHRoZSBlbWl0dGVyLCB0aGV5IGNhbiBiZSBpdGVyYXRlZCBhc1xuLy8gaGFzaG1hcHNcbnZhciBFbWl0dGVyID0gVXRpbHMuY3JlYXRlTm9uRW51bWVyYWJsZSggZW1pdHRlclByb3RvICk7XG4vLyNidWlsZFxuXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFV0aWxzID0gcmVxdWlyZSggJy4vdXRpbHMuanMnICksXHJcblx0RW1pdHRlciA9IHJlcXVpcmUoICcuL2VtaXR0ZXInICksXHJcblx0TWl4aW5zID0gcmVxdWlyZSggJy4vbWl4aW5zJyApLFxyXG5cdEZyb3plbiA9IHJlcXVpcmUoICcuL2Zyb3plbicgKVxyXG47XHJcblxyXG4vLyNidWlsZFxyXG52YXIgRnJlZXplciA9IGZ1bmN0aW9uKCBpbml0aWFsVmFsdWUsIG9wdGlvbnMgKSB7XHJcblx0dmFyIG1lID0gdGhpcyxcclxuXHRcdG11dGFibGUgPSAoIG9wdGlvbnMgJiYgb3B0aW9ucy5tdXRhYmxlICkgfHwgZmFsc2UsXHJcblx0XHRsaXZlID0gKCBvcHRpb25zICYmIG9wdGlvbnMubGl2ZSApIHx8IGxpdmVcclxuXHQ7XHJcblxyXG5cdC8vIEltbXV0YWJsZSBkYXRhXHJcblx0dmFyIGZyb3plbjtcclxuXHJcblx0dmFyIG5vdGlmeSA9IGZ1bmN0aW9uIG5vdGlmeSggZXZlbnROYW1lLCBub2RlLCBvcHRpb25zICl7XHJcblx0XHRpZiggZXZlbnROYW1lID09ICdsaXN0ZW5lcicgKVxyXG5cdFx0XHRyZXR1cm4gRnJvemVuLmNyZWF0ZUxpc3RlbmVyKCBub2RlICk7XHJcblxyXG5cdFx0cmV0dXJuIEZyb3plbi51cGRhdGUoIGV2ZW50TmFtZSwgbm9kZSwgb3B0aW9ucyApO1xyXG5cdH07XHJcblxyXG5cdHZhciBmcmVlemUgPSBmdW5jdGlvbigpe307XHJcblx0aWYoICFtdXRhYmxlIClcclxuXHRcdGZyZWV6ZSA9IGZ1bmN0aW9uKCBvYmogKXsgT2JqZWN0LmZyZWV6ZSggb2JqICk7IH07XHJcblxyXG5cdC8vIENyZWF0ZSB0aGUgZnJvemVuIG9iamVjdFxyXG5cdGZyb3plbiA9IEZyb3plbi5mcmVlemUoIGluaXRpYWxWYWx1ZSwgbm90aWZ5LCBmcmVlemUsIGxpdmUgKTtcclxuXHJcblx0Ly8gTGlzdGVuIHRvIGl0cyBjaGFuZ2VzIGltbWVkaWF0ZWx5XHJcblx0dmFyIGxpc3RlbmVyID0gZnJvemVuLmdldExpc3RlbmVyKCk7XHJcblxyXG5cdC8vIFVwZGF0aW5nIGZsYWcgdG8gdHJpZ2dlciB0aGUgZXZlbnQgb24gbmV4dFRpY2tcclxuXHR2YXIgdXBkYXRpbmcgPSBmYWxzZTtcclxuXHJcblx0bGlzdGVuZXIub24oICdpbW1lZGlhdGUnLCBmdW5jdGlvbiggcHJldk5vZGUsIHVwZGF0ZWQgKXtcclxuXHRcdGlmKCBwcmV2Tm9kZSAhPSBmcm96ZW4gKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0ZnJvemVuID0gdXBkYXRlZDtcclxuXHJcblx0XHRpZiggbGl2ZSApXHJcblx0XHRcdHJldHVybiBtZS50cmlnZ2VyKCAndXBkYXRlJywgdXBkYXRlZCApO1xyXG5cclxuXHRcdC8vIFRyaWdnZXIgb24gbmV4dCB0aWNrXHJcblx0XHRpZiggIXVwZGF0aW5nICl7XHJcblx0XHRcdHVwZGF0aW5nID0gdHJ1ZTtcclxuXHRcdFx0VXRpbHMubmV4dFRpY2soIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dXBkYXRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRtZS50cmlnZ2VyKCAndXBkYXRlJywgZnJvemVuICk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRVdGlscy5hZGRORSggdGhpcywge1xyXG5cdFx0Z2V0OiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdFx0fSxcclxuXHRcdHNldDogZnVuY3Rpb24oIG5vZGUgKXtcclxuXHRcdFx0dmFyIG5ld05vZGUgPSBub3RpZnkoICdyZXNldCcsIGZyb3plbiwgbm9kZSApO1xyXG5cdFx0XHRuZXdOb2RlLl9fLmxpc3RlbmVyLnRyaWdnZXIoICdpbW1lZGlhdGUnLCBmcm96ZW4sIG5ld05vZGUgKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0VXRpbHMuYWRkTkUoIHRoaXMsIHsgZ2V0RGF0YTogdGhpcy5nZXQsIHNldERhdGE6IHRoaXMuc2V0IH0gKTtcclxuXHJcblx0Ly8gVGhlIGV2ZW50IHN0b3JlXHJcblx0dGhpcy5fZXZlbnRzID0gW107XHJcbn1cclxuXHJcbkZyZWV6ZXIucHJvdG90eXBlID0gVXRpbHMuY3JlYXRlTm9uRW51bWVyYWJsZSh7Y29uc3RydWN0b3I6IEZyZWV6ZXJ9LCBFbWl0dGVyKTtcclxuLy8jYnVpbGRcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRnJlZXplcjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFV0aWxzID0gcmVxdWlyZSggJy4vdXRpbHMnICksXHJcblx0TWl4aW5zID0gcmVxdWlyZSggJy4vbWl4aW5zJyksXHJcblx0RW1pdHRlciA9IHJlcXVpcmUoJy4vZW1pdHRlcicpXHJcbjtcclxuXHJcbi8vI2J1aWxkXHJcbnZhciBGcm96ZW4gPSB7XHJcblx0ZnJlZXplOiBmdW5jdGlvbiggbm9kZSwgbm90aWZ5LCBmcmVlemVGbiwgbGl2ZSApe1xyXG5cdFx0aWYoIG5vZGUgJiYgbm9kZS5fXyApe1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW4sIG1peGluLCBjb25zXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIG5vZGUuY29uc3RydWN0b3IgPT0gQXJyYXkgKXtcclxuXHRcdFx0ZnJvemVuID0gdGhpcy5jcmVhdGVBcnJheSggbm9kZS5sZW5ndGggKTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRmcm96ZW4gPSBPYmplY3QuY3JlYXRlKCBNaXhpbnMuSGFzaCApO1xyXG5cdFx0fVxyXG5cclxuXHRcdFV0aWxzLmFkZE5FKCBmcm96ZW4sIHsgX186IHtcclxuXHRcdFx0bGlzdGVuZXI6IGZhbHNlLFxyXG5cdFx0XHRwYXJlbnRzOiBbXSxcclxuXHRcdFx0bm90aWZ5OiBub3RpZnksXHJcblx0XHRcdGRpcnR5OiBmYWxzZSxcclxuXHRcdFx0ZnJlZXplRm46IGZyZWV6ZUZuLFxyXG5cdFx0XHRsaXZlOiBsaXZlIHx8IGZhbHNlXHJcblx0XHR9fSk7XHJcblxyXG5cdFx0Ly8gRnJlZXplIGNoaWxkcmVuXHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRjb25zID0gY2hpbGQgJiYgY2hpbGQuY29uc3RydWN0b3I7XHJcblx0XHRcdGlmKCBjb25zID09IEFycmF5IHx8IGNvbnMgPT0gT2JqZWN0ICl7XHJcblx0XHRcdFx0Y2hpbGQgPSBtZS5mcmVlemUoIGNoaWxkLCBub3RpZnksIGZyZWV6ZUZuLCBsaXZlICk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApe1xyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmcm96ZW5bIGtleSBdID0gY2hpbGQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRmcmVlemVGbiggZnJvemVuICk7XHJcblxyXG5cdFx0cmV0dXJuIGZyb3plbjtcclxuXHR9LFxyXG5cclxuXHR1cGRhdGU6IGZ1bmN0aW9uKCB0eXBlLCBub2RlLCBvcHRpb25zICl7XHJcblx0XHRpZiggIXRoaXNbIHR5cGUgXSlcclxuXHRcdFx0cmV0dXJuIFV0aWxzLmVycm9yKCAnVW5rbm93biB1cGRhdGUgdHlwZTogJyArIHR5cGUgKTtcclxuXHJcblx0XHRyZXR1cm4gdGhpc1sgdHlwZSBdKCBub2RlLCBvcHRpb25zICk7XHJcblx0fSxcclxuXHJcblx0cmVzZXQ6IGZ1bmN0aW9uKCBub2RlLCB2YWx1ZSApe1xyXG5cdFx0dmFyIG1lID0gdGhpcyxcclxuXHRcdFx0ZnJvemVuXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIHZhbHVlICYmIHZhbHVlLl9fICl7XHJcblx0XHRcdGZyb3plbiA9IHZhbHVlO1xyXG5cdFx0XHRmcm96ZW4uX18ubGlzdGVuZXIgPSB2YWx1ZS5fXy5saXN0ZW5lcjtcclxuXHRcdFx0ZnJvemVuLl9fLnBhcmVudHMgPSBbXTtcclxuXHJcblx0XHRcdC8vIFNldCBiYWNrIHRoZSBwYXJlbnQgb24gdGhlIGNoaWxkcmVuXHJcblx0XHRcdC8vIHRoYXQgaGF2ZSBiZWVuIHVwZGF0ZWRcclxuXHRcdFx0dGhpcy5maXhDaGlsZHJlbiggZnJvemVuLCBub2RlICk7XHJcblx0XHRcdFV0aWxzLmVhY2goIGZyb3plbiwgZnVuY3Rpb24oIGNoaWxkICl7XHJcblx0XHRcdFx0aWYoIGNoaWxkICYmIGNoaWxkLl9fICl7XHJcblx0XHRcdFx0XHRtZS5yZW1vdmVQYXJlbnQoIG5vZGUgKTtcclxuXHRcdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0ZnJvemVuID0gdGhpcy5mcmVlemUoIG5vZGUsIG5vZGUuX18ubm90aWZ5LCBub2RlLl9fLmZyZWV6ZUZuLCBub2RlLl9fLmxpdmUgKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdG1lcmdlOiBmdW5jdGlvbiggbm9kZSwgYXR0cnMgKXtcclxuXHRcdHZhciB0cmFucyA9IG5vZGUuX18udHJhbnMsXHJcblxyXG5cdFx0XHQvLyBDbG9uZSB0aGUgYXR0cnMgdG8gbm90IG1vZGlmeSB0aGUgYXJndW1lbnRcclxuXHRcdFx0YXR0cnMgPSBVdGlscy5leHRlbmQoIHt9LCBhdHRycylcclxuXHRcdDtcclxuXHJcblx0XHRpZiggdHJhbnMgKXtcclxuXHJcblx0XHRcdGZvciggdmFyIGF0dHIgaW4gYXR0cnMgKVxyXG5cdFx0XHRcdHRyYW5zWyBhdHRyIF0gPSBhdHRyc1sgYXR0ciBdO1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmNvcHlNZXRhKCBub2RlICksXHJcblx0XHRcdG5vdGlmeSA9IG5vZGUuX18ubm90aWZ5LFxyXG5cdFx0XHR2YWwsIGNvbnMsIGtleSwgaXNGcm96ZW5cclxuXHRcdDtcclxuXHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRpc0Zyb3plbiA9IGNoaWxkICYmIGNoaWxkLl9fO1xyXG5cclxuXHRcdFx0aWYoIGlzRnJvemVuICl7XHJcblx0XHRcdFx0bWUucmVtb3ZlUGFyZW50KCBjaGlsZCwgbm9kZSApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YWwgPSBhdHRyc1sga2V5IF07XHJcblx0XHRcdGlmKCAhdmFsICl7XHJcblx0XHRcdFx0aWYoIGlzRnJvemVuIClcclxuXHRcdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHRcdHJldHVybiBmcm96ZW5bIGtleSBdID0gY2hpbGQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnMgPSB2YWwgJiYgdmFsLmNvbnN0cnVjdG9yO1xyXG5cclxuXHRcdFx0aWYoIGNvbnMgPT0gQXJyYXkgfHwgY29ucyA9PSBPYmplY3QgKVxyXG5cdFx0XHRcdHZhbCA9IG1lLmZyZWV6ZSggdmFsLCBub3RpZnksIG5vZGUuX18uZnJlZXplRm4sIG5vZGUuX18ubGl2ZSApO1xyXG5cclxuXHRcdFx0aWYoIHZhbCAmJiB2YWwuX18gKVxyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggdmFsLCBmcm96ZW4gKTtcclxuXHJcblx0XHRcdGRlbGV0ZSBhdHRyc1sga2V5IF07XHJcblxyXG5cdFx0XHRmcm96ZW5bIGtleSBdID0gdmFsO1xyXG5cdFx0fSk7XHJcblxyXG5cclxuXHRcdGZvcigga2V5IGluIGF0dHJzICkge1xyXG5cdFx0XHR2YWwgPSBhdHRyc1sga2V5IF07XHJcblx0XHRcdGNvbnMgPSB2YWwgJiYgdmFsLmNvbnN0cnVjdG9yO1xyXG5cclxuXHRcdFx0aWYoIGNvbnMgPT0gQXJyYXkgfHwgY29ucyA9PSBPYmplY3QgKVxyXG5cdFx0XHRcdHZhbCA9IG1lLmZyZWV6ZSggdmFsLCBub3RpZnksIG5vZGUuX18uZnJlZXplRm4sIG5vZGUuX18ubGl2ZSApO1xyXG5cclxuXHRcdFx0aWYoIHZhbCAmJiB2YWwuX18gKVxyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggdmFsLCBmcm96ZW4gKTtcclxuXHJcblx0XHRcdGZyb3plblsga2V5IF0gPSB2YWw7XHJcblx0XHR9XHJcblxyXG5cdFx0bm9kZS5fXy5mcmVlemVGbiggZnJvemVuICk7XHJcblxyXG5cdFx0dGhpcy5yZWZyZXNoUGFyZW50cyggbm9kZSwgZnJvemVuICk7XHJcblxyXG5cdFx0cmV0dXJuIGZyb3plbjtcclxuXHR9LFxyXG5cclxuXHRyZXBsYWNlOiBmdW5jdGlvbiggbm9kZSwgcmVwbGFjZW1lbnQgKSB7XHJcblxyXG5cdFx0dmFyIG1lID0gdGhpcyxcclxuXHRcdFx0Y29ucyA9IHJlcGxhY2VtZW50ICYmIHJlcGxhY2VtZW50LmNvbnN0cnVjdG9yLFxyXG5cdFx0XHRfXyA9IG5vZGUuX18sXHJcblx0XHRcdGZyb3plbiA9IHJlcGxhY2VtZW50XHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIGNvbnMgPT0gQXJyYXkgfHwgY29ucyA9PSBPYmplY3QgKSB7XHJcblxyXG5cdFx0XHRmcm96ZW4gPSBtZS5mcmVlemUoIHJlcGxhY2VtZW50LCBfXy5ub3RpZnksIF9fLmZyZWV6ZUZuLCBfXy5saXZlICk7XHJcblxyXG5cdFx0XHRmcm96ZW4uX18ucGFyZW50cyA9IF9fLnBhcmVudHM7XHJcblxyXG5cdFx0XHQvLyBBZGQgdGhlIGN1cnJlbnQgbGlzdGVuZXIgaWYgZXhpc3RzLCByZXBsYWNpbmcgYVxyXG5cdFx0XHQvLyBwcmV2aW91cyBsaXN0ZW5lciBpbiB0aGUgZnJvemVuIGlmIGV4aXN0ZWRcclxuXHRcdFx0aWYoIF9fLmxpc3RlbmVyIClcclxuXHRcdFx0XHRmcm96ZW4uX18ubGlzdGVuZXIgPSBub2RlLl9fLmxpc3RlbmVyO1xyXG5cclxuXHRcdFx0Ly8gU2luY2UgdGhlIHBhcmVudHMgd2lsbCBiZSByZWZyZXNoZWQgZGlyZWN0bHksXHJcblx0XHRcdC8vIFRyaWdnZXIgdGhlIGxpc3RlbmVyIGhlcmVcclxuXHRcdFx0aWYoIGZyb3plbi5fXy5saXN0ZW5lciApXHJcblx0XHRcdFx0dGhpcy50cmlnZ2VyKCBmcm96ZW4sICd1cGRhdGUnLCBmcm96ZW4gKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWZyZXNoIHRoZSBwYXJlbnQgbm9kZXMgZGlyZWN0bHlcclxuXHRcdGlmKCAhX18ucGFyZW50cy5sZW5ndGggJiYgX18ubGlzdGVuZXIgKXtcclxuXHRcdFx0X18ubGlzdGVuZXIudHJpZ2dlciggJ2ltbWVkaWF0ZScsIG5vZGUsIGZyb3plbiApO1xyXG5cdFx0fVxyXG5cdFx0Zm9yICh2YXIgaSA9IF9fLnBhcmVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuXHRcdFx0aWYoIGkgPT0gMCApe1xyXG5cdFx0XHRcdHRoaXMucmVmcmVzaCggX18ucGFyZW50c1tpXSwgbm9kZSwgZnJvemVuLCBmYWxzZSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2V7XHJcblxyXG5cdFx0XHRcdHRoaXMubWFya0RpcnR5KCBfXy5wYXJlbnRzW2ldLCBbbm9kZSwgZnJvemVuXSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdHJlbW92ZTogZnVuY3Rpb24oIG5vZGUsIGF0dHJzICl7XHJcblx0XHR2YXIgdHJhbnMgPSBub2RlLl9fLnRyYW5zO1xyXG5cdFx0aWYoIHRyYW5zICl7XHJcblx0XHRcdGZvciggdmFyIGwgPSBhdHRycy5sZW5ndGggLSAxOyBsID49IDA7IGwtLSApXHJcblx0XHRcdFx0ZGVsZXRlIHRyYW5zWyBhdHRyc1tsXSBdO1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmNvcHlNZXRhKCBub2RlICksXHJcblx0XHRcdGlzRnJvemVuXHJcblx0XHQ7XHJcblxyXG5cdFx0VXRpbHMuZWFjaCggbm9kZSwgZnVuY3Rpb24oIGNoaWxkLCBrZXkgKXtcclxuXHRcdFx0aXNGcm96ZW4gPSBjaGlsZCAmJiBjaGlsZC5fXztcclxuXHJcblx0XHRcdGlmKCBpc0Zyb3plbiApe1xyXG5cdFx0XHRcdG1lLnJlbW92ZVBhcmVudCggY2hpbGQsIG5vZGUgKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYoIGF0dHJzLmluZGV4T2YoIGtleSApICE9IC0xICl7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiggaXNGcm96ZW4gKVxyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cclxuXHRcdFx0ZnJvemVuWyBrZXkgXSA9IGNoaWxkO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bm9kZS5fXy5mcmVlemVGbiggZnJvemVuICk7XHJcblx0XHR0aGlzLnJlZnJlc2hQYXJlbnRzKCBub2RlLCBmcm96ZW4gKTtcclxuXHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdHNwbGljZTogZnVuY3Rpb24oIG5vZGUsIGFyZ3MgKXtcclxuXHRcdHZhciB0cmFucyA9IG5vZGUuX18udHJhbnM7XHJcblx0XHRpZiggdHJhbnMgKXtcclxuXHRcdFx0dHJhbnMuc3BsaWNlLmFwcGx5KCB0cmFucywgYXJncyApO1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmNvcHlNZXRhKCBub2RlICksXHJcblx0XHRcdGluZGV4ID0gYXJnc1swXSxcclxuXHRcdFx0ZGVsZXRlSW5kZXggPSBpbmRleCArIGFyZ3NbMV0sXHJcblx0XHRcdF9fID0gbm9kZS5fXyxcclxuXHRcdFx0Y29uLCBjaGlsZFxyXG5cdFx0O1xyXG5cclxuXHRcdC8vIENsb25lIHRoZSBhcnJheVxyXG5cdFx0VXRpbHMuZWFjaCggbm9kZSwgZnVuY3Rpb24oIGNoaWxkLCBpICl7XHJcblxyXG5cdFx0XHRpZiggY2hpbGQgJiYgY2hpbGQuX18gKXtcclxuXHRcdFx0XHRtZS5yZW1vdmVQYXJlbnQoIGNoaWxkLCBub2RlICk7XHJcblxyXG5cdFx0XHRcdC8vIFNraXAgdGhlIG5vZGVzIHRvIGRlbGV0ZVxyXG5cdFx0XHRcdGlmKCBpIDwgaW5kZXggfHwgaT49IGRlbGV0ZUluZGV4IClcclxuXHRcdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmcm96ZW5baV0gPSBjaGlsZDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFByZXBhcmUgdGhlIG5ldyBub2Rlc1xyXG5cdFx0aWYoIGFyZ3MubGVuZ3RoID4gMSApe1xyXG5cdFx0XHRmb3IgKHZhciBpID0gYXJncy5sZW5ndGggLSAxOyBpID49IDI7IGktLSkge1xyXG5cdFx0XHRcdGNoaWxkID0gYXJnc1tpXTtcclxuXHRcdFx0XHRjb24gPSBjaGlsZCAmJiBjaGlsZC5jb25zdHJ1Y3RvcjtcclxuXHJcblx0XHRcdFx0aWYoIGNvbiA9PSBBcnJheSB8fCBjb24gPT0gT2JqZWN0IClcclxuXHRcdFx0XHRcdGNoaWxkID0gdGhpcy5mcmVlemUoIGNoaWxkLCBfXy5ub3RpZnksIF9fLmZyZWV6ZUZuLCBfXy5saXZlICk7XHJcblxyXG5cdFx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApXHJcblx0XHRcdFx0XHR0aGlzLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cclxuXHRcdFx0XHRhcmdzW2ldID0gY2hpbGQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBzcGxpY2VcclxuXHRcdEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoIGZyb3plbiwgYXJncyApO1xyXG5cclxuXHRcdG5vZGUuX18uZnJlZXplRm4oIGZyb3plbiApO1xyXG5cdFx0dGhpcy5yZWZyZXNoUGFyZW50cyggbm9kZSwgZnJvemVuICk7XHJcblxyXG5cdFx0cmV0dXJuIGZyb3plbjtcclxuXHR9LFxyXG5cclxuXHR0cmFuc2FjdDogZnVuY3Rpb24oIG5vZGUgKSB7XHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHR0cmFuc2FjdGluZyA9IG5vZGUuX18udHJhbnMsXHJcblx0XHRcdHRyYW5zXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIHRyYW5zYWN0aW5nIClcclxuXHRcdFx0cmV0dXJuIHRyYW5zYWN0aW5nO1xyXG5cclxuXHRcdHRyYW5zID0gbm9kZS5jb25zdHJ1Y3RvciA9PSBBcnJheSA/IFtdIDoge307XHJcblxyXG5cdFx0VXRpbHMuZWFjaCggbm9kZSwgZnVuY3Rpb24oIGNoaWxkLCBrZXkgKXtcclxuXHRcdFx0dHJhbnNbIGtleSBdID0gY2hpbGQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRub2RlLl9fLnRyYW5zID0gdHJhbnM7XHJcblxyXG5cdFx0Ly8gQ2FsbCBydW4gYXV0b21hdGljYWxseSBpbiBjYXNlXHJcblx0XHQvLyB0aGUgdXNlciBmb3Jnb3QgYWJvdXQgaXRcclxuXHRcdFV0aWxzLm5leHRUaWNrKCBmdW5jdGlvbigpe1xyXG5cdFx0XHRpZiggbm9kZS5fXy50cmFucyApXHJcblx0XHRcdFx0bWUucnVuKCBub2RlICk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gdHJhbnM7XHJcblx0fSxcclxuXHJcblx0cnVuOiBmdW5jdGlvbiggbm9kZSApIHtcclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdHRyYW5zID0gbm9kZS5fXy50cmFuc1xyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCAhdHJhbnMgKVxyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHJcblx0XHQvLyBSZW1vdmUgdGhlIG5vZGUgYXMgYSBwYXJlbnRcclxuXHRcdFV0aWxzLmVhY2goIHRyYW5zLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRpZiggY2hpbGQgJiYgY2hpbGQuX18gKXtcclxuXHRcdFx0XHRtZS5yZW1vdmVQYXJlbnQoIGNoaWxkLCBub2RlICk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGRlbGV0ZSBub2RlLl9fLnRyYW5zO1xyXG5cclxuXHRcdHZhciByZXN1bHQgPSB0aGlzLnJlcGxhY2UoIG5vZGUsIHRyYW5zICk7XHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH0sXHJcblxyXG5cdHJlZnJlc2g6IGZ1bmN0aW9uKCBub2RlLCBvbGRDaGlsZCwgbmV3Q2hpbGQsIHJldHVyblVwZGF0ZWQgKXtcclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdHRyYW5zID0gbm9kZS5fXy50cmFucyxcclxuXHRcdFx0Zm91bmQgPSAwXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIHRyYW5zICl7XHJcblxyXG5cdFx0XHRVdGlscy5lYWNoKCB0cmFucywgZnVuY3Rpb24oIGNoaWxkLCBrZXkgKXtcclxuXHRcdFx0XHRpZiggZm91bmQgKSByZXR1cm47XHJcblxyXG5cdFx0XHRcdGlmKCBjaGlsZCA9PT0gb2xkQ2hpbGQgKXtcclxuXHJcblx0XHRcdFx0XHR0cmFuc1sga2V5IF0gPSBuZXdDaGlsZDtcclxuXHRcdFx0XHRcdGZvdW5kID0gMTtcclxuXHJcblx0XHRcdFx0XHRpZiggbmV3Q2hpbGQgJiYgbmV3Q2hpbGQuX18gKVxyXG5cdFx0XHRcdFx0XHRtZS5hZGRQYXJlbnQoIG5ld0NoaWxkLCBub2RlICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBmcm96ZW4gPSB0aGlzLmNvcHlNZXRhKCBub2RlICksXHJcblx0XHRcdGRpcnR5ID0gbm9kZS5fXy5kaXJ0eSxcclxuXHRcdFx0ZGlydCwgcmVwbGFjZW1lbnQsIF9fXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIGRpcnR5ICl7XHJcblx0XHRcdGRpcnQgPSBkaXJ0eVswXSxcclxuXHRcdFx0cmVwbGFjZW1lbnQgPSBkaXJ0eVsxXVxyXG5cdFx0fVxyXG5cclxuXHRcdFV0aWxzLmVhY2goIG5vZGUsIGZ1bmN0aW9uKCBjaGlsZCwga2V5ICl7XHJcblx0XHRcdGlmKCBjaGlsZCA9PT0gb2xkQ2hpbGQgKXtcclxuXHRcdFx0XHRjaGlsZCA9IG5ld0NoaWxkO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYoIGNoaWxkID09PSBkaXJ0ICl7XHJcblx0XHRcdFx0Y2hpbGQgPSByZXBsYWNlbWVudDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYoIGNoaWxkICYmIChfXyA9IGNoaWxkLl9fKSApe1xyXG5cclxuXHRcdFx0XHQvLyBJZiB0aGVyZSBpcyBhIHRyYW5zIGhhcHBlbmluZyB3ZVxyXG5cdFx0XHRcdC8vIGRvbid0IHVwZGF0ZSBhIGRpcnR5IG5vZGUgbm93LiBUaGUgdXBkYXRlXHJcblx0XHRcdFx0Ly8gd2lsbCBvY2N1ciBvbiBydW4uXHJcblx0XHRcdFx0aWYoICFfXy50cmFucyAmJiBfXy5kaXJ0eSApe1xyXG5cdFx0XHRcdFx0Y2hpbGQgPSBtZS5yZWZyZXNoKCBjaGlsZCwgX18uZGlydHlbMF0sIF9fLmRpcnR5WzFdLCB0cnVlICk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHJcblx0XHRcdFx0bWUucmVtb3ZlUGFyZW50KCBjaGlsZCwgbm9kZSApO1xyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmcm96ZW5bIGtleSBdID0gY2hpbGQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRub2RlLl9fLmZyZWV6ZUZuKCBmcm96ZW4gKTtcclxuXHJcblx0XHQvLyBJZiB0aGUgbm9kZSB3YXMgZGlydHksIGNsZWFuIGl0XHJcblx0XHRub2RlLl9fLmRpcnR5ID0gZmFsc2U7XHJcblxyXG5cdFx0aWYoIHJldHVyblVwZGF0ZWQgKVxyXG5cdFx0XHRyZXR1cm4gZnJvemVuO1xyXG5cclxuXHRcdHRoaXMucmVmcmVzaFBhcmVudHMoIG5vZGUsIGZyb3plbiApO1xyXG5cdH0sXHJcblxyXG5cdGZpeENoaWxkcmVuOiBmdW5jdGlvbiggbm9kZSwgb2xkTm9kZSApe1xyXG5cdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFV0aWxzLmVhY2goIG5vZGUsIGZ1bmN0aW9uKCBjaGlsZCApe1xyXG5cdFx0XHRpZiggIWNoaWxkIHx8ICFjaGlsZC5fXyApXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIGNoaWxkIGlzIGxpbmtlZCB0byB0aGUgbm9kZSxcclxuXHRcdFx0Ly8gbWF5YmUgaXRzIGNoaWxkcmVuIGFyZSBub3QgbGlua2VkXHJcblx0XHRcdGlmKCBjaGlsZC5fXy5wYXJlbnRzLmluZGV4T2YoIG5vZGUgKSAhPSAtMSApXHJcblx0XHRcdFx0cmV0dXJuIG1lLmZpeENoaWxkcmVuKCBjaGlsZCApO1xyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIGNoaWxkIHdhc24ndCBsaW5rZWQgaXQgaXMgc3VyZVxyXG5cdFx0XHQvLyB0aGF0IGl0IHdhc24ndCBtb2RpZmllZC4gSnVzdCBsaW5rIGl0XHJcblx0XHRcdC8vIHRvIHRoZSBuZXcgcGFyZW50XHJcblx0XHRcdGlmKCBjaGlsZC5fXy5wYXJlbnRzLmxlbmd0aCA9PSAxIClcclxuXHRcdFx0XHRyZXR1cm4gY2hpbGQuX18ucGFyZW50cyA9IFsgbm9kZSBdO1xyXG5cclxuXHRcdFx0aWYoIG9sZE5vZGUgKVxyXG5cdFx0XHRcdG1lLnJlbW92ZVBhcmVudCggY2hpbGQsIG9sZE5vZGUgKTtcclxuXHJcblx0XHRcdG1lLmFkZFBhcmVudCggbm9kZSApO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHJcblx0Y29weU1ldGE6IGZ1bmN0aW9uKCBub2RlICl7XHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW5cclxuXHRcdDtcclxuXHJcblx0XHRpZiggbm9kZS5jb25zdHJ1Y3RvciA9PSBBcnJheSApe1xyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmNyZWF0ZUFycmF5KCBub2RlLmxlbmd0aCApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGZyb3plbiA9IE9iamVjdC5jcmVhdGUoIE1peGlucy5IYXNoICk7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIF9fID0gbm9kZS5fXztcclxuXHJcblx0XHRVdGlscy5hZGRORSggZnJvemVuLCB7X186IHtcclxuXHRcdFx0bm90aWZ5OiBfXy5ub3RpZnksXHJcblx0XHRcdGxpc3RlbmVyOiBfXy5saXN0ZW5lcixcclxuXHRcdFx0cGFyZW50czogX18ucGFyZW50cy5zbGljZSggMCApLFxyXG5cdFx0XHR0cmFuczogX18udHJhbnMsXHJcblx0XHRcdGRpcnR5OiBmYWxzZSxcclxuXHRcdFx0ZnJlZXplRm46IF9fLmZyZWV6ZUZuXHJcblx0XHR9fSk7XHJcblxyXG5cdFx0cmV0dXJuIGZyb3plbjtcclxuXHR9LFxyXG5cclxuXHRyZWZyZXNoUGFyZW50czogZnVuY3Rpb24oIG9sZENoaWxkLCBuZXdDaGlsZCApe1xyXG5cdFx0dmFyIF9fID0gb2xkQ2hpbGQuX18sXHJcblx0XHRcdGlcclxuXHRcdDtcclxuXHJcblx0XHRpZiggX18ubGlzdGVuZXIgKVxyXG5cdFx0XHR0aGlzLnRyaWdnZXIoIG5ld0NoaWxkLCAndXBkYXRlJywgbmV3Q2hpbGQgKTtcclxuXHJcblx0XHRpZiggIV9fLnBhcmVudHMubGVuZ3RoICl7XHJcblx0XHRcdGlmKCBfXy5saXN0ZW5lciApe1xyXG5cdFx0XHRcdF9fLmxpc3RlbmVyLnRyaWdnZXIoICdpbW1lZGlhdGUnLCBvbGRDaGlsZCwgbmV3Q2hpbGQgKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGZvciAoaSA9IF9fLnBhcmVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuXHRcdFx0XHQvLyBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHBhcmVudCwgbWFyayBldmVyeW9uZSBhcyBkaXJ0eVxyXG5cdFx0XHRcdC8vIGJ1dCB0aGUgbGFzdCBpbiB0aGUgaXRlcmF0aW9uLCBhbmQgd2hlbiB0aGUgbGFzdCBpcyByZWZyZXNoZWRcclxuXHRcdFx0XHQvLyBpdCB3aWxsIHVwZGF0ZSB0aGUgZGlydHkgbm9kZXMuXHJcblx0XHRcdFx0aWYoIGkgPT0gMCApXHJcblx0XHRcdFx0XHR0aGlzLnJlZnJlc2goIF9fLnBhcmVudHNbaV0sIG9sZENoaWxkLCBuZXdDaGlsZCwgZmFsc2UgKTtcclxuXHRcdFx0XHRlbHNle1xyXG5cclxuXHRcdFx0XHRcdHRoaXMubWFya0RpcnR5KCBfXy5wYXJlbnRzW2ldLCBbb2xkQ2hpbGQsIG5ld0NoaWxkXSApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdG1hcmtEaXJ0eTogZnVuY3Rpb24oIG5vZGUsIGRpcnQgKXtcclxuXHRcdHZhciBfXyA9IG5vZGUuX18sXHJcblx0XHRcdGlcclxuXHRcdDtcclxuXHRcdF9fLmRpcnR5ID0gZGlydDtcclxuXHJcblx0XHQvLyBJZiB0aGVyZSBpcyBhIHRyYW5zYWN0aW9uIGhhcHBlbmluZyBpbiB0aGUgbm9kZVxyXG5cdFx0Ly8gdXBkYXRlIHRoZSB0cmFuc2FjdGlvbiBkYXRhIGltbWVkaWF0ZWx5XHJcblx0XHRpZiggX18udHJhbnMgKVxyXG5cdFx0XHR0aGlzLnJlZnJlc2goIG5vZGUsIGRpcnRbMF0sIGRpcnRbMV0gKTtcclxuXHJcblx0XHRmb3IgKCBpID0gX18ucGFyZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSApIHtcclxuXHJcblx0XHRcdHRoaXMubWFya0RpcnR5KCBfXy5wYXJlbnRzW2ldLCBkaXJ0ICk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0cmVtb3ZlUGFyZW50OiBmdW5jdGlvbiggbm9kZSwgcGFyZW50ICl7XHJcblx0XHR2YXIgcGFyZW50cyA9IG5vZGUuX18ucGFyZW50cyxcclxuXHRcdFx0aW5kZXggPSBwYXJlbnRzLmluZGV4T2YoIHBhcmVudCApXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIGluZGV4ICE9IC0xICl7XHJcblxyXG5cdFx0XHRwYXJlbnRzLnNwbGljZSggaW5kZXgsIDEgKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRhZGRQYXJlbnQ6IGZ1bmN0aW9uKCBub2RlLCBwYXJlbnQgKXtcclxuXHRcdHZhciBwYXJlbnRzID0gbm9kZS5fXy5wYXJlbnRzLFxyXG5cdFx0XHRpbmRleCA9IHBhcmVudHMuaW5kZXhPZiggcGFyZW50IClcclxuXHRcdDtcclxuXHJcblx0XHRpZiggaW5kZXggPT0gLTEgKXtcclxuXHRcdFx0cGFyZW50c1sgcGFyZW50cy5sZW5ndGggXSA9IHBhcmVudDtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHR0cmlnZ2VyOiBmdW5jdGlvbiggbm9kZSwgZXZlbnROYW1lLCBwYXJhbSApe1xyXG5cdFx0dmFyIGxpc3RlbmVyID0gbm9kZS5fXy5saXN0ZW5lcixcclxuXHRcdFx0dGlja2luZyA9IGxpc3RlbmVyLnRpY2tpbmdcclxuXHRcdDtcclxuXHJcblx0XHRsaXN0ZW5lci50aWNraW5nID0gcGFyYW07XHJcblx0XHRpZiggIXRpY2tpbmcgKXtcclxuXHRcdFx0VXRpbHMubmV4dFRpY2soIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dmFyIHVwZGF0ZWQgPSBsaXN0ZW5lci50aWNraW5nO1xyXG5cdFx0XHRcdGxpc3RlbmVyLnRpY2tpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRsaXN0ZW5lci50cmlnZ2VyKCBldmVudE5hbWUsIHVwZGF0ZWQgKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0Y3JlYXRlTGlzdGVuZXI6IGZ1bmN0aW9uKCBmcm96ZW4gKXtcclxuXHRcdHZhciBsID0gZnJvemVuLl9fLmxpc3RlbmVyO1xyXG5cclxuXHRcdGlmKCAhbCApIHtcclxuXHRcdFx0bCA9IE9iamVjdC5jcmVhdGUoRW1pdHRlciwge1xyXG5cdFx0XHRcdF9ldmVudHM6IHtcclxuXHRcdFx0XHRcdHZhbHVlOiB7fSxcclxuXHRcdFx0XHRcdHdyaXRhYmxlOiB0cnVlXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGZyb3plbi5fXy5saXN0ZW5lciA9IGw7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGw7XHJcblx0fSxcclxuXHJcblx0Y3JlYXRlQXJyYXk6IChmdW5jdGlvbigpe1xyXG5cdFx0Ly8gU2V0IGNyZWF0ZUFycmF5IG1ldGhvZFxyXG5cdFx0aWYoIFtdLl9fcHJvdG9fXyApXHJcblx0XHRcdHJldHVybiBmdW5jdGlvbiggbGVuZ3RoICl7XHJcblx0XHRcdFx0dmFyIGFyciA9IG5ldyBBcnJheSggbGVuZ3RoICk7XHJcblx0XHRcdFx0YXJyLl9fcHJvdG9fXyA9IE1peGlucy5MaXN0O1xyXG5cdFx0XHRcdHJldHVybiBhcnI7XHJcblx0XHRcdH1cclxuXHRcdHJldHVybiBmdW5jdGlvbiggbGVuZ3RoICl7XHJcblx0XHRcdHZhciBhcnIgPSBuZXcgQXJyYXkoIGxlbmd0aCApLFxyXG5cdFx0XHRcdG1ldGhvZHMgPSBNaXhpbnMuYXJyYXlNZXRob2RzXHJcblx0XHRcdDtcclxuXHRcdFx0Zm9yKCB2YXIgbSBpbiBtZXRob2RzICl7XHJcblx0XHRcdFx0YXJyWyBtIF0gPSBtZXRob2RzWyBtIF07XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGFycjtcclxuXHRcdH1cclxuXHR9KSgpXHJcbn07XHJcbi8vI2J1aWxkXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZyb3plbjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFV0aWxzID0gcmVxdWlyZSggJy4vdXRpbHMuanMnICk7XHJcblxyXG4vLyNidWlsZFxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgZGVzY3JpcHRvcnMsIHRvIGJlIHVzZWQgYnkgT2JqZWN0LmNyZWF0ZS5cclxuICogQHBhcmFtICB7T2JqZWN0fSBhdHRycyBQcm9wZXJ0aWVzIHRvIGNyZWF0ZSBkZXNjcmlwdG9yc1xyXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgIEEgaGFzaCB3aXRoIHRoZSBkZXNjcmlwdG9ycy5cclxuICovXHJcbnZhciBjcmVhdGVORSA9IGZ1bmN0aW9uKCBhdHRycyApe1xyXG5cdHZhciBuZSA9IHt9O1xyXG5cclxuXHRmb3IoIHZhciBrZXkgaW4gYXR0cnMgKXtcclxuXHRcdG5lWyBrZXkgXSA9IHtcclxuXHRcdFx0d3JpdGFibGU6IHRydWUsXHJcblx0XHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRcdHZhbHVlOiBhdHRyc1sga2V5XVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG5lO1xyXG59XHJcblxyXG52YXIgY29tbW9uTWV0aG9kcyA9IHtcclxuXHRzZXQ6IGZ1bmN0aW9uKCBhdHRyLCB2YWx1ZSApe1xyXG5cdFx0dmFyIGF0dHJzID0gYXR0cixcclxuXHRcdFx0dXBkYXRlID0gdGhpcy5fXy50cmFuc1xyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCB0eXBlb2YgdmFsdWUgIT0gJ3VuZGVmaW5lZCcgKXtcclxuXHRcdFx0YXR0cnMgPSB7fTtcclxuXHRcdFx0YXR0cnNbIGF0dHIgXSA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKCAhdXBkYXRlICl7XHJcblx0XHRcdGZvciggdmFyIGtleSBpbiBhdHRycyApe1xyXG5cdFx0XHRcdHVwZGF0ZSA9IHVwZGF0ZSB8fCB0aGlzWyBrZXkgXSAhPSBhdHRyc1sga2V5IF07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE5vIGNoYW5nZXMsIGp1c3QgcmV0dXJuIHRoZSBub2RlXHJcblx0XHRcdGlmKCAhdXBkYXRlIClcclxuXHRcdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdtZXJnZScsIHRoaXMsIGF0dHJzICk7XHJcblx0fSxcclxuXHJcblx0cmVzZXQ6IGZ1bmN0aW9uKCBhdHRycyApIHtcclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3JlcGxhY2UnLCB0aGlzLCBhdHRycyApO1xyXG5cdH0sXHJcblxyXG5cdGdldExpc3RlbmVyOiBmdW5jdGlvbigpe1xyXG5cdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAnbGlzdGVuZXInLCB0aGlzICk7XHJcblx0fSxcclxuXHJcblx0dG9KUzogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBqcztcclxuXHRcdGlmKCB0aGlzLmNvbnN0cnVjdG9yID09IEFycmF5ICl7XHJcblx0XHRcdGpzID0gbmV3IEFycmF5KCB0aGlzLmxlbmd0aCApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGpzID0ge307XHJcblx0XHR9XHJcblxyXG5cdFx0VXRpbHMuZWFjaCggdGhpcywgZnVuY3Rpb24oIGNoaWxkLCBpICl7XHJcblx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApXHJcblx0XHRcdFx0anNbIGkgXSA9IGNoaWxkLnRvSlMoKTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdGpzWyBpIF0gPSBjaGlsZDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBqcztcclxuXHR9LFxyXG5cclxuXHR0cmFuc2FjdDogZnVuY3Rpb24oKXtcclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3RyYW5zYWN0JywgdGhpcyApO1xyXG5cdH0sXHJcblx0cnVuOiBmdW5jdGlvbigpe1xyXG5cdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAncnVuJywgdGhpcyApO1xyXG5cdH1cclxufTtcclxuXHJcbnZhciBhcnJheU1ldGhvZHMgPSBVdGlscy5leHRlbmQoe1xyXG5cdHB1c2g6IGZ1bmN0aW9uKCBlbCApe1xyXG5cdFx0cmV0dXJuIHRoaXMuYXBwZW5kKCBbZWxdICk7XHJcblx0fSxcclxuXHJcblx0YXBwZW5kOiBmdW5jdGlvbiggZWxzICl7XHJcblx0XHRpZiggZWxzICYmIGVscy5sZW5ndGggKVxyXG5cdFx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdzcGxpY2UnLCB0aGlzLCBbdGhpcy5sZW5ndGgsIDBdLmNvbmNhdCggZWxzICkgKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHBvcDogZnVuY3Rpb24oKXtcclxuXHRcdGlmKCAhdGhpcy5sZW5ndGggKVxyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdzcGxpY2UnLCB0aGlzLCBbdGhpcy5sZW5ndGggLTEsIDFdICk7XHJcblx0fSxcclxuXHJcblx0dW5zaGlmdDogZnVuY3Rpb24oIGVsICl7XHJcblx0XHRyZXR1cm4gdGhpcy5wcmVwZW5kKCBbZWxdICk7XHJcblx0fSxcclxuXHJcblx0cHJlcGVuZDogZnVuY3Rpb24oIGVscyApe1xyXG5cdFx0aWYoIGVscyAmJiBlbHMubGVuZ3RoIClcclxuXHRcdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAnc3BsaWNlJywgdGhpcywgWzAsIDBdLmNvbmNhdCggZWxzICkgKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHNoaWZ0OiBmdW5jdGlvbigpe1xyXG5cdFx0aWYoICF0aGlzLmxlbmd0aCApXHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3NwbGljZScsIHRoaXMsIFswLCAxXSApO1xyXG5cdH0sXHJcblxyXG5cdHNwbGljZTogZnVuY3Rpb24oIGluZGV4LCB0b1JlbW92ZSwgdG9BZGQgKXtcclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3NwbGljZScsIHRoaXMsIGFyZ3VtZW50cyApO1xyXG5cdH1cclxufSwgY29tbW9uTWV0aG9kcyApO1xyXG5cclxudmFyIEZyb3plbkFycmF5ID0gT2JqZWN0LmNyZWF0ZSggQXJyYXkucHJvdG90eXBlLCBjcmVhdGVORSggYXJyYXlNZXRob2RzICkgKTtcclxuXHJcbnZhciBNaXhpbnMgPSB7XHJcblxyXG5IYXNoOiBPYmplY3QuY3JlYXRlKCBPYmplY3QucHJvdG90eXBlLCBjcmVhdGVORSggVXRpbHMuZXh0ZW5kKHtcclxuXHRyZW1vdmU6IGZ1bmN0aW9uKCBrZXlzICl7XHJcblx0XHR2YXIgZmlsdGVyZWQgPSBbXSxcclxuXHRcdFx0ayA9IGtleXNcclxuXHRcdDtcclxuXHJcblx0XHRpZigga2V5cy5jb25zdHJ1Y3RvciAhPSBBcnJheSApXHJcblx0XHRcdGsgPSBbIGtleXMgXTtcclxuXHJcblx0XHRmb3IoIHZhciBpID0gMCwgbCA9IGsubGVuZ3RoOyBpPGw7IGkrKyApe1xyXG5cdFx0XHRpZiggdGhpcy5oYXNPd25Qcm9wZXJ0eSgga1tpXSApIClcclxuXHRcdFx0XHRmaWx0ZXJlZC5wdXNoKCBrW2ldICk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoIGZpbHRlcmVkLmxlbmd0aCApXHJcblx0XHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3JlbW92ZScsIHRoaXMsIGZpbHRlcmVkICk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9XHJcbn0sIGNvbW1vbk1ldGhvZHMpKSksXHJcblxyXG5MaXN0OiBGcm96ZW5BcnJheSxcclxuYXJyYXlNZXRob2RzOiBhcnJheU1ldGhvZHNcclxufTtcclxuLy8jYnVpbGRcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWl4aW5zOyIsIid1c2Ugc3RyaWN0JztcblxuLy8jYnVpbGRcbnZhciBnbG9iYWwgPSAobmV3IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKSk7XG5cbnZhciBVdGlscyA9IHtcblx0ZXh0ZW5kOiBmdW5jdGlvbiggb2IsIHByb3BzICl7XG5cdFx0Zm9yKCB2YXIgcCBpbiBwcm9wcyApe1xuXHRcdFx0b2JbcF0gPSBwcm9wc1twXTtcblx0XHR9XG5cdFx0cmV0dXJuIG9iO1xuXHR9LFxuXG5cdGNyZWF0ZU5vbkVudW1lcmFibGU6IGZ1bmN0aW9uKCBvYmosIHByb3RvICl7XG5cdFx0dmFyIG5lID0ge307XG5cdFx0Zm9yKCB2YXIga2V5IGluIG9iaiApXG5cdFx0XHRuZVtrZXldID0ge3ZhbHVlOiBvYmpba2V5XSB9O1xuXHRcdHJldHVybiBPYmplY3QuY3JlYXRlKCBwcm90byB8fCB7fSwgbmUgKTtcblx0fSxcblxuXHRlcnJvcjogZnVuY3Rpb24oIG1lc3NhZ2UgKXtcblx0XHR2YXIgZXJyID0gbmV3IEVycm9yKCBtZXNzYWdlICk7XG5cdFx0aWYoIGNvbnNvbGUgKVxuXHRcdFx0cmV0dXJuIGNvbnNvbGUuZXJyb3IoIGVyciApO1xuXHRcdGVsc2Vcblx0XHRcdHRocm93IGVycjtcblx0fSxcblxuXHRlYWNoOiBmdW5jdGlvbiggbywgY2xiayApe1xuXHRcdHZhciBpLGwsa2V5cztcblx0XHRpZiggbyAmJiBvLmNvbnN0cnVjdG9yID09IEFycmF5ICl7XG5cdFx0XHRmb3IgKGkgPSAwLCBsID0gby5sZW5ndGg7IGkgPCBsOyBpKyspXG5cdFx0XHRcdGNsYmsoIG9baV0sIGkgKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRrZXlzID0gT2JqZWN0LmtleXMoIG8gKTtcblx0XHRcdGZvciggaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKyApXG5cdFx0XHRcdGNsYmsoIG9bIGtleXNbaV0gXSwga2V5c1tpXSApO1xuXHRcdH1cblx0fSxcblxuXHRhZGRORTogZnVuY3Rpb24oIG5vZGUsIGF0dHJzICl7XG5cdFx0Zm9yKCB2YXIga2V5IGluIGF0dHJzICl7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoIG5vZGUsIGtleSwge1xuXHRcdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdFx0XHR3cml0YWJsZTogdHJ1ZSxcblx0XHRcdFx0dmFsdWU6IGF0dHJzWyBrZXkgXVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIG5leHRUaWNrIC0gYnkgc3RhZ2FzIC8gcHVibGljIGRvbWFpblxuICBcdG5leHRUaWNrOiAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHF1ZXVlID0gW10sXG5cdFx0XHRkaXJ0eSA9IGZhbHNlLFxuXHRcdFx0Zm4sXG5cdFx0XHRoYXNQb3N0TWVzc2FnZSA9ICEhZ2xvYmFsLnBvc3RNZXNzYWdlLFxuXHRcdFx0bWVzc2FnZU5hbWUgPSAnbmV4dHRpY2snLFxuXHRcdFx0dHJpZ2dlciA9IChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBoYXNQb3N0TWVzc2FnZVxuXHRcdFx0XHRcdD8gZnVuY3Rpb24gdHJpZ2dlciAoKSB7XG5cdFx0XHRcdFx0Z2xvYmFsLnBvc3RNZXNzYWdlKG1lc3NhZ2VOYW1lLCAnKicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdDogZnVuY3Rpb24gdHJpZ2dlciAoKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHByb2Nlc3NRdWV1ZSgpIH0sIDApO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSgpKSxcblx0XHRcdHByb2Nlc3NRdWV1ZSA9IChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBoYXNQb3N0TWVzc2FnZVxuXHRcdFx0XHRcdD8gZnVuY3Rpb24gcHJvY2Vzc1F1ZXVlIChldmVudCkge1xuXHRcdFx0XHRcdFx0aWYgKGV2ZW50LnNvdXJjZSA9PT0gZ2xvYmFsICYmIGV2ZW50LmRhdGEgPT09IG1lc3NhZ2VOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdFx0XHRmbHVzaFF1ZXVlKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdDogZmx1c2hRdWV1ZTtcbiAgICAgIFx0fSkoKVxuICAgICAgO1xuXG4gICAgICBmdW5jdGlvbiBmbHVzaFF1ZXVlICgpIHtcbiAgICAgICAgICB3aGlsZSAoZm4gPSBxdWV1ZS5zaGlmdCgpKSB7XG4gICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRpcnR5ID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG5leHRUaWNrIChmbikge1xuICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgIGlmIChkaXJ0eSkgcmV0dXJuO1xuICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICB0cmlnZ2VyKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChoYXNQb3N0TWVzc2FnZSkgZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBwcm9jZXNzUXVldWUsIHRydWUpO1xuXG4gICAgICBuZXh0VGljay5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBnbG9iYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHByb2Nlc3NRdWV1ZSwgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXh0VGljaztcbiAgfSkoKVxufTtcbi8vI2J1aWxkXG5cblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsczsiLCJleHBvcnQgY2xhc3MgQWN0aW9uIHtcclxuICBjb25zdHJ1Y3RvcihhcmdzKSB7XHJcbiAgICBjb25zdCBbc3RvcmUsIHN0b3JlcywgYWxsU3RvcmVzXSA9IFthcmdzLnN0b3JlLCBhcmdzLnN0b3JlcywgW11dO1xyXG4gICAgdGhpcy5uYW1lID0gYXJncy5uYW1lO1xyXG5cclxuICAgIGlmIChzdG9yZSkgYWxsU3RvcmVzLnB1c2goc3RvcmUpO1xyXG4gICAgaWYgKHN0b3JlcykgYWxsU3RvcmVzLnB1c2guYXBwbHkoYWxsU3RvcmVzLCBzdG9yZXMpO1xyXG5cclxuICAgIHRoaXMuc3RvcmVzID0gYWxsU3RvcmVzO1xyXG4gIH1cclxuXHJcbiAgcnVuKC4uLmFyZ3MpIHtcclxuICAgIGNvbnN0IHN0b3Jlc0N5Y2xlcyA9IHRoaXMuc3RvcmVzLm1hcChzdG9yZSA9PlxyXG4gICAgICBzdG9yZS5ydW5DeWNsZS5hcHBseShzdG9yZSwgW3RoaXMubmFtZV0uY29uY2F0KGFyZ3MpKVxyXG4gICAgKTtcclxuICAgIHJldHVybiBQcm9taXNlLmFsbChzdG9yZXNDeWNsZXMpO1xyXG4gIH1cclxuXHJcbiAgYWRkU3RvcmUoc3RvcmUpIHtcclxuICAgIHRoaXMuc3RvcmVzLnB1c2goc3RvcmUpO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFjdGlvbnMge1xyXG4gIGNvbnN0cnVjdG9yKGFjdGlvbnMpIHtcclxuICAgIHRoaXMuYWxsID0gW107XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShhY3Rpb25zKSkge1xyXG4gICAgICBhY3Rpb25zLmZvckVhY2goKGFjdGlvbiA9PiB0aGlzLmFkZEFjdGlvbihhY3Rpb24pKSwgdGhpcyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhZGRBY3Rpb24oaXRlbSwgbm9PdmVycmlkZSkge1xyXG4gICAgY29uc3QgYWN0aW9uID0gbm9PdmVycmlkZSA/IGZhbHNlIDogdGhpcy5kZXRlY3RBY3Rpb24oaXRlbSk7XHJcbiAgICBpZiAoIW5vT3ZlcnJpZGUpIHtcclxuICAgICAgbGV0IG9sZCA9IHRoaXNbYWN0aW9uLm5hbWVdO1xyXG4gICAgICBpZiAob2xkKSB0aGlzLnJlbW92ZUFjdGlvbihvbGQpO1xyXG4gICAgICB0aGlzLmFsbC5wdXNoKGFjdGlvbik7XHJcbiAgICAgIHRoaXNbYWN0aW9uLm5hbWVdID0gYWN0aW9uLnJ1bi5iaW5kKGFjdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGFjdGlvbjtcclxuICB9XHJcblxyXG4gIHJlbW92ZUFjdGlvbihpdGVtKSB7XHJcbiAgICBjb25zdCBhY3Rpb24gPSB0aGlzLmRldGVjdEFjdGlvbihpdGVtLCB0cnVlKTtcclxuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5hbGwuaW5kZXhPZihhY3Rpb24pO1xyXG4gICAgaWYgKGluZGV4ICE9PSAtMSkgdGhpcy5hbGwuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgIGRlbGV0ZSB0aGlzW2FjdGlvbi5uYW1lXTtcclxuICB9XHJcblxyXG4gIGFkZFN0b3JlKHN0b3JlKSB7XHJcbiAgICB0aGlzLmFsbC5mb3JFYWNoKGFjdGlvbiA9PiBhY3Rpb24uYWRkU3RvcmUoc3RvcmUpKTtcclxuICB9XHJcblxyXG4gIGRldGVjdEFjdGlvbihhY3Rpb24sIGlzT2xkKSB7XHJcbiAgICBpZiAoYWN0aW9uLmNvbnN0cnVjdG9yID09PSBBY3Rpb24pIHtcclxuICAgICAgcmV0dXJuIGFjdGlvbjtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgcmV0dXJuIChpc09sZCkgPyB0aGlzW2FjdGlvbl0gOiBuZXcgQWN0aW9uKHtuYW1lOiBhY3Rpb259KTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfaW50ZXJvcFJlcXVpcmUgPSBmdW5jdGlvbiAob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmpbXCJkZWZhdWx0XCJdIDogb2JqOyB9O1xuXG5leHBvcnRzLmNyZWF0ZVZpZXcgPSBjcmVhdGVWaWV3O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcblxudmFyIFJlYWN0ID0gX2ludGVyb3BSZXF1aXJlKCh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSZWFjdCddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUmVhY3QnXSA6IG51bGwpKTtcblxudmFyIFJlYWN0Um91dGVyID0gX2ludGVyb3BSZXF1aXJlKCh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydSZWFjdFJvdXRlciddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUmVhY3RSb3V0ZXInXSA6IG51bGwpKTtcblxuZnVuY3Rpb24gZ2V0Um91dGVyKCkge1xuICB2YXIgUm91dGVyID0ge307XG4gIGlmICh0eXBlb2YgUmVhY3RSb3V0ZXIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB2YXIgcm91dGVyRWxlbWVudHMgPSBbXCJSb3V0ZVwiLCBcIkRlZmF1bHRSb3V0ZVwiLCBcIlJvdXRlSGFuZGxlclwiLCBcIkFjdGl2ZUhhbmRsZXJcIiwgXCJOb3RGb3VuZFJvdXRlXCIsIFwiTGlua1wiLCBcIlJlZGlyZWN0XCJdLFxuICAgICAgICByb3V0ZXJNaXhpbnMgPSBbXCJOYXZpZ2F0aW9uXCIsIFwiU3RhdGVcIl0sXG4gICAgICAgIHJvdXRlckZ1bmN0aW9ucyA9IFtcImNyZWF0ZVwiLCBcImNyZWF0ZURlZmF1bHRSb3V0ZVwiLCBcImNyZWF0ZU5vdEZvdW5kUm91dGVcIiwgXCJjcmVhdGVSZWRpcmVjdFwiLCBcImNyZWF0ZVJvdXRlXCIsIFwiY3JlYXRlUm91dGVzRnJvbVJlYWN0Q2hpbGRyZW5cIiwgXCJydW5cIl0sXG4gICAgICAgIHJvdXRlck9iamVjdHMgPSBbXCJIYXNoTG9jYXRpb25cIiwgXCJIaXN0b3J5XCIsIFwiSGlzdG9yeUxvY2F0aW9uXCIsIFwiUmVmcmVzaExvY2F0aW9uXCIsIFwiU3RhdGljTG9jYXRpb25cIiwgXCJUZXN0TG9jYXRpb25cIiwgXCJJbWl0YXRlQnJvd3NlckJlaGF2aW9yXCIsIFwiU2Nyb2xsVG9Ub3BCZWhhdmlvclwiXSxcbiAgICAgICAgY29waWVkSXRlbXMgPSByb3V0ZXJNaXhpbnMuY29uY2F0KHJvdXRlckZ1bmN0aW9ucykuY29uY2F0KHJvdXRlck9iamVjdHMpO1xuXG4gICAgcm91dGVyRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgUm91dGVyW25hbWVdID0gUmVhY3QuY3JlYXRlRWxlbWVudC5iaW5kKFJlYWN0LCBSZWFjdFJvdXRlcltuYW1lXSk7XG4gICAgfSk7XG5cbiAgICBjb3BpZWRJdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICBSb3V0ZXJbbmFtZV0gPSBSZWFjdFJvdXRlcltuYW1lXTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gUm91dGVyO1xufVxuXG5mdW5jdGlvbiBnZXRET00oKSB7XG4gIHZhciBET01IZWxwZXJzID0ge307XG5cbiAgaWYgKHR5cGVvZiBSZWFjdCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciB0YWcgPSBmdW5jdGlvbiB0YWcobmFtZSkge1xuICAgICAgZm9yICh2YXIgX2xlbiA9IGFyZ3VtZW50cy5sZW5ndGgsIGFyZ3MgPSBBcnJheShfbGVuID4gMSA/IF9sZW4gLSAxIDogMCksIF9rZXkgPSAxOyBfa2V5IDwgX2xlbjsgX2tleSsrKSB7XG4gICAgICAgIGFyZ3NbX2tleSAtIDFdID0gYXJndW1lbnRzW19rZXldO1xuICAgICAgfVxuXG4gICAgICB2YXIgYXR0cmlidXRlcyA9IHVuZGVmaW5lZDtcbiAgICAgIHZhciBmaXJzdCA9IGFyZ3NbMF0gJiYgYXJnc1swXS5jb25zdHJ1Y3RvcjtcbiAgICAgIGlmIChmaXJzdCA9PT0gT2JqZWN0KSB7XG4gICAgICAgIGF0dHJpYnV0ZXMgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhdHRyaWJ1dGVzID0ge307XG4gICAgICB9XG4gICAgICByZXR1cm4gUmVhY3QuRE9NW25hbWVdLmFwcGx5KFJlYWN0LkRPTSwgW2F0dHJpYnV0ZXNdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcblxuICAgIGZvciAodmFyIHRhZ05hbWUgaW4gUmVhY3QuRE9NKSB7XG4gICAgICBET01IZWxwZXJzW3RhZ05hbWVdID0gdGFnLmJpbmQodGhpcywgdGFnTmFtZSk7XG4gICAgfVxuXG4gICAgRE9NSGVscGVycy5zcGFjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBSZWFjdC5ET00uc3Bhbih7XG4gICAgICAgIGRhbmdlcm91c2x5U2V0SW5uZXJIVE1MOiB7XG4gICAgICAgICAgX19odG1sOiBcIiZuYnNwO1wiXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG4gIH1cbiAgcmV0dXJuIERPTUhlbHBlcnM7XG59XG5cbnZhciBSb3V0ZXIgPSBnZXRSb3V0ZXIoKTtcbmV4cG9ydHMuUm91dGVyID0gUm91dGVyO1xudmFyIERPTSA9IGdldERPTSgpO1xuXG5leHBvcnRzLkRPTSA9IERPTTtcblxuZnVuY3Rpb24gY3JlYXRlVmlldyhjbGFzc0FyZ3MpIHtcbiAgdmFyIFJlYWN0Q2xhc3MgPSBSZWFjdC5jcmVhdGVDbGFzcyhjbGFzc0FyZ3MpO1xuICB2YXIgUmVhY3RFbGVtZW50ID0gUmVhY3QuY3JlYXRlRWxlbWVudC5iaW5kKFJlYWN0LmNyZWF0ZUVsZW1lbnQsIFJlYWN0Q2xhc3MpO1xuICByZXR1cm4gUmVhY3RFbGVtZW50O1xufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0OnV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltVTZMMk52WkdVdlpXeHBlR1Z5TDNKbGMzUnlkV04wZFhKbEwzZGxZaTl3WVdOcllXZGxjeTlsZUdsdEwzTnlZeTlFVDAxSVpXeHdaWEp6TG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lJN096czdPMUZCZDBSblFpeFZRVUZWTEVkQlFWWXNWVUZCVlRzN096czdTVUY0Ukc1Q0xFdEJRVXNzTWtKQlFVMHNUMEZCVHpzN1NVRkRiRUlzVjBGQlZ5d3lRa0ZCVFN4alFVRmpPenRCUVVWMFF5eFRRVUZUTEZOQlFWTXNSMEZCU1R0QlFVTndRaXhOUVVGTkxFMUJRVTBzUjBGQlJ5eEZRVUZGTEVOQlFVTTdRVUZEYkVJc1RVRkJTU3hQUVVGUExGZEJRVmNzUzBGQlN5eFhRVUZYTEVWQlFVVTdRVUZEZEVNc1VVRkJTU3hqUVVGakxFZEJRVWNzUTBGQlF5eFBRVUZQTEVWQlFVVXNZMEZCWXl4RlFVRkZMR05CUVdNc1JVRkJSU3hsUVVGbExFVkJRVVVzWlVGQlpTeEZRVUZGTEUxQlFVMHNSVUZCUlN4VlFVRlZMRU5CUVVNN1VVRkRjRWdzV1VGQldTeEhRVUZITEVOQlFVTXNXVUZCV1N4RlFVRkZMRTlCUVU4c1EwRkJRenRSUVVOMFF5eGxRVUZsTEVkQlFVY3NRMEZCUXl4UlFVRlJMRVZCUVVVc2IwSkJRVzlDTEVWQlFVVXNjVUpCUVhGQ0xFVkJRVVVzWjBKQlFXZENMRVZCUVVVc1lVRkJZU3hGUVVGRkxDdENRVUVyUWl4RlFVRkZMRXRCUVVzc1EwRkJRenRSUVVOc1NpeGhRVUZoTEVkQlFVY3NRMEZCUXl4alFVRmpMRVZCUVVVc1UwRkJVeXhGUVVGRkxHbENRVUZwUWl4RlFVRkZMR2xDUVVGcFFpeEZRVUZGTEdkQ1FVRm5RaXhGUVVGRkxHTkJRV01zUlVGQlJTeDNRa0ZCZDBJc1JVRkJSU3h4UWtGQmNVSXNRMEZCUXp0UlFVTndTeXhYUVVGWExFZEJRVWNzV1VGQldTeERRVUZETEUxQlFVMHNRMEZCUXl4bFFVRmxMRU5CUVVNc1EwRkJReXhOUVVGTkxFTkJRVU1zWVVGQllTeERRVUZETEVOQlFVTTdPMEZCUlhwRkxHdENRVUZqTEVOQlFVTXNUMEZCVHl4RFFVRkRMRlZCUVZNc1NVRkJTU3hGUVVGRk8wRkJRM0JETEZsQlFVMHNRMEZCUXl4SlFVRkpMRU5CUVVNc1IwRkJSeXhMUVVGTExFTkJRVU1zWVVGQllTeERRVUZETEVsQlFVa3NRMEZCUXl4TFFVRkxMRVZCUVVVc1YwRkJWeXhEUVVGRExFbEJRVWtzUTBGQlF5eERRVUZETEVOQlFVTTdTMEZEYmtVc1EwRkJReXhEUVVGRE96dEJRVVZJTEdWQlFWY3NRMEZCUXl4UFFVRlBMRU5CUVVNc1ZVRkJVeXhKUVVGSkxFVkJRVVU3UVVGRGFrTXNXVUZCVFN4RFFVRkRMRWxCUVVrc1EwRkJReXhIUVVGSExGZEJRVmNzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXp0TFFVTnNReXhEUVVGRExFTkJRVU03UjBGRFNqdEJRVU5FTEZOQlFVOHNUVUZCVFN4RFFVRkRPME5CUTJZN08wRkJSVVFzVTBGQlV5eE5RVUZOTEVkQlFVazdRVUZEYWtJc1RVRkJUU3hWUVVGVkxFZEJRVWNzUlVGQlJTeERRVUZET3p0QlFVVjBRaXhOUVVGSkxFOUJRVThzUzBGQlN5eExRVUZMTEZkQlFWY3NSVUZCUlR0QlFVTm9ReXhSUVVGSkxFZEJRVWNzUjBGQlJ5eGhRVUZWTEVsQlFVa3NSVUZCVnp0M1EwRkJUaXhKUVVGSk8wRkJRVW9zV1VGQlNUczdPMEZCUXk5Q0xGVkJRVWtzVlVGQlZTeFpRVUZCTEVOQlFVTTdRVUZEWml4VlFVRkpMRXRCUVVzc1IwRkJSeXhKUVVGSkxFTkJRVU1zUTBGQlF5eERRVUZETEVsQlFVa3NTVUZCU1N4RFFVRkRMRU5CUVVNc1EwRkJReXhEUVVGRExGZEJRVmNzUTBGQlF6dEJRVU16UXl4VlFVRkpMRXRCUVVzc1MwRkJTeXhOUVVGTkxFVkJRVVU3UVVGRGNFSXNhMEpCUVZVc1IwRkJSeXhKUVVGSkxFTkJRVU1zUzBGQlN5eEZRVUZGTEVOQlFVTTdUMEZETTBJc1RVRkJUVHRCUVVOTUxHdENRVUZWTEVkQlFVY3NSVUZCUlN4RFFVRkRPMDlCUTJwQ08wRkJRMFFzWVVGQlR5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJReXhEUVVGRExFdEJRVXNzUTBGQlF5eExRVUZMTEVOQlFVTXNSMEZCUnl4RlFVRkZMRU5CUVVNc1ZVRkJWU3hEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEVsQlFVa3NRMEZCUXl4RFFVRkRMRU5CUVVNN1MwRkRjRVVzUTBGQlF6czdRVUZGUml4VFFVRkxMRWxCUVVrc1QwRkJUeXhKUVVGSkxFdEJRVXNzUTBGQlF5eEhRVUZITEVWQlFVVTdRVUZETjBJc1owSkJRVlVzUTBGQlF5eFBRVUZQTEVOQlFVTXNSMEZCUnl4SFFVRkhMRU5CUVVNc1NVRkJTU3hEUVVGRExFbEJRVWtzUlVGQlJTeFBRVUZQTEVOQlFVTXNRMEZCUXp0TFFVTXZRenM3UVVGRlJDeGpRVUZWTEVOQlFVTXNTMEZCU3l4SFFVRkhMRmxCUVZjN1FVRkROVUlzWVVGQlR5eExRVUZMTEVOQlFVTXNSMEZCUnl4RFFVRkRMRWxCUVVrc1EwRkJRenRCUVVOd1Fpd3JRa0ZCZFVJc1JVRkJSVHRCUVVOMlFpeG5Ra0ZCVFN4RlFVRkZMRkZCUVZFN1UwRkRha0k3VDBGRFJpeERRVUZETEVOQlFVTTdTMEZEU2l4RFFVRkRPMGRCUTBnN1FVRkRSQ3hUUVVGUExGVkJRVlVzUTBGQlF6dERRVU51UWpzN1FVRkZUU3hKUVVGTkxFMUJRVTBzUjBGQlJ5eFRRVUZUTEVWQlFVVXNRMEZCUXp0UlFVRnlRaXhOUVVGTkxFZEJRVTRzVFVGQlRUdEJRVU5hTEVsQlFVMHNSMEZCUnl4SFFVRkhMRTFCUVUwc1JVRkJSU3hEUVVGRE96dFJRVUZtTEVkQlFVY3NSMEZCU0N4SFFVRkhPenRCUVVWVUxGTkJRVk1zVlVGQlZTeERRVUZGTEZOQlFWTXNSVUZCUlR0QlFVTnlReXhOUVVGSkxGVkJRVlVzUjBGQlJ5eExRVUZMTEVOQlFVTXNWMEZCVnl4RFFVRkRMRk5CUVZNc1EwRkJReXhEUVVGRE8wRkJRemxETEUxQlFVa3NXVUZCV1N4SFFVRkhMRXRCUVVzc1EwRkJReXhoUVVGaExFTkJRVU1zU1VGQlNTeERRVUZETEV0QlFVc3NRMEZCUXl4aFFVRmhMRVZCUVVVc1ZVRkJWU3hEUVVGRExFTkJRVU03UVVGRE4wVXNVMEZCVHl4WlFVRlpMRU5CUVVNN1EwRkRja0lpTENKbWFXeGxJam9pWjJWdVpYSmhkR1ZrTG1weklpd2ljMjkxY21ObFVtOXZkQ0k2SWlJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYkltbHRjRzl5ZENCU1pXRmpkQ0JtY205dElDZHlaV0ZqZENjN1hISmNibWx0Y0c5eWRDQlNaV0ZqZEZKdmRYUmxjaUJtY205dElDZHlaV0ZqZEMxeWIzVjBaWEluTzF4eVhHNWNjbHh1Wm5WdVkzUnBiMjRnWjJWMFVtOTFkR1Z5SUNncElIdGNjbHh1SUNCamIyNXpkQ0JTYjNWMFpYSWdQU0I3ZlR0Y2NseHVJQ0JwWmlBb2RIbHdaVzltSUZKbFlXTjBVbTkxZEdWeUlDRTlQU0FuZFc1a1pXWnBibVZrSnlrZ2UxeHlYRzRnSUNBZ2JHVjBJSEp2ZFhSbGNrVnNaVzFsYm5SeklEMGdXeWRTYjNWMFpTY3NJQ2RFWldaaGRXeDBVbTkxZEdVbkxDQW5VbTkxZEdWSVlXNWtiR1Z5Snl3Z0owRmpkR2wyWlVoaGJtUnNaWEluTENBblRtOTBSbTkxYm1SU2IzVjBaU2NzSUNkTWFXNXJKeXdnSjFKbFpHbHlaV04wSjEwc1hISmNiaUFnSUNCeWIzVjBaWEpOYVhocGJuTWdQU0JiSjA1aGRtbG5ZWFJwYjI0bkxDQW5VM1JoZEdVblhTeGNjbHh1SUNBZ0lISnZkWFJsY2taMWJtTjBhVzl1Y3lBOUlGc25ZM0psWVhSbEp5d2dKMk55WldGMFpVUmxabUYxYkhSU2IzVjBaU2NzSUNkamNtVmhkR1ZPYjNSR2IzVnVaRkp2ZFhSbEp5d2dKMk55WldGMFpWSmxaR2x5WldOMEp5d2dKMk55WldGMFpWSnZkWFJsSnl3Z0oyTnlaV0YwWlZKdmRYUmxjMFp5YjIxU1pXRmpkRU5vYVd4a2NtVnVKeXdnSjNKMWJpZGRMRnh5WEc0Z0lDQWdjbTkxZEdWeVQySnFaV04wY3lBOUlGc25TR0Z6YUV4dlkyRjBhVzl1Snl3Z0owaHBjM1J2Y25rbkxDQW5TR2x6ZEc5eWVVeHZZMkYwYVc5dUp5d2dKMUpsWm5KbGMyaE1iMk5oZEdsdmJpY3NJQ2RUZEdGMGFXTk1iMk5oZEdsdmJpY3NJQ2RVWlhOMFRHOWpZWFJwYjI0bkxDQW5TVzFwZEdGMFpVSnliM2R6WlhKQ1pXaGhkbWx2Y2ljc0lDZFRZM0p2Ykd4VWIxUnZjRUpsYUdGMmFXOXlKMTBzWEhKY2JpQWdJQ0JqYjNCcFpXUkpkR1Z0Y3lBOUlISnZkWFJsY2sxcGVHbHVjeTVqYjI1allYUW9jbTkxZEdWeVJuVnVZM1JwYjI1ektTNWpiMjVqWVhRb2NtOTFkR1Z5VDJKcVpXTjBjeWs3WEhKY2JseHlYRzRnSUNBZ2NtOTFkR1Z5Uld4bGJXVnVkSE11Wm05eVJXRmphQ2htZFc1amRHbHZiaWh1WVcxbEtTQjdYSEpjYmlBZ0lDQWdJRkp2ZFhSbGNsdHVZVzFsWFNBOUlGSmxZV04wTG1OeVpXRjBaVVZzWlcxbGJuUXVZbWx1WkNoU1pXRmpkQ3dnVW1WaFkzUlNiM1YwWlhKYmJtRnRaVjBwTzF4eVhHNGdJQ0FnZlNrN1hISmNibHh5WEc0Z0lDQWdZMjl3YVdWa1NYUmxiWE11Wm05eVJXRmphQ2htZFc1amRHbHZiaWh1WVcxbEtTQjdYSEpjYmlBZ0lDQWdJRkp2ZFhSbGNsdHVZVzFsWFNBOUlGSmxZV04wVW05MWRHVnlXMjVoYldWZE8xeHlYRzRnSUNBZ2ZTazdYSEpjYmlBZ2ZWeHlYRzRnSUhKbGRIVnliaUJTYjNWMFpYSTdYSEpjYm4xY2NseHVYSEpjYm1aMWJtTjBhVzl1SUdkbGRFUlBUU0FvS1NCN1hISmNiaUFnWTI5dWMzUWdSRTlOU0dWc2NHVnljeUE5SUh0OU8xeHlYRzVjY2x4dUlDQnBaaUFvZEhsd1pXOW1JRkpsWVdOMElDRTlQU0FuZFc1a1pXWnBibVZrSnlrZ2UxeHlYRzRnSUNBZ2JHVjBJSFJoWnlBOUlHWjFibU4wYVc5dUlDaHVZVzFsTENBdUxpNWhjbWR6S1NCN1hISmNiaUFnSUNBZ0lHeGxkQ0JoZEhSeWFXSjFkR1Z6TzF4eVhHNGdJQ0FnSUNCc1pYUWdabWx5YzNRZ1BTQmhjbWR6V3pCZElDWW1JR0Z5WjNOYk1GMHVZMjl1YzNSeWRXTjBiM0k3WEhKY2JpQWdJQ0FnSUdsbUlDaG1hWEp6ZENBOVBUMGdUMkpxWldOMEtTQjdYSEpjYmlBZ0lDQWdJQ0FnWVhSMGNtbGlkWFJsY3lBOUlHRnlaM011YzJocFpuUW9LVHRjY2x4dUlDQWdJQ0FnZlNCbGJITmxJSHRjY2x4dUlDQWdJQ0FnSUNCaGRIUnlhV0oxZEdWeklEMGdlMzA3WEhKY2JpQWdJQ0FnSUgxY2NseHVJQ0FnSUNBZ2NtVjBkWEp1SUZKbFlXTjBMa1JQVFZ0dVlXMWxYUzVoY0hCc2VTaFNaV0ZqZEM1RVQwMHNJRnRoZEhSeWFXSjFkR1Z6WFM1amIyNWpZWFFvWVhKbmN5a3BPMXh5WEc0Z0lDQWdmVHRjY2x4dVhISmNiaUFnSUNCbWIzSWdLR3hsZENCMFlXZE9ZVzFsSUdsdUlGSmxZV04wTGtSUFRTa2dlMXh5WEc0Z0lDQWdJQ0JFVDAxSVpXeHdaWEp6VzNSaFowNWhiV1ZkSUQwZ2RHRm5MbUpwYm1Rb2RHaHBjeXdnZEdGblRtRnRaU2s3WEhKY2JpQWdJQ0I5WEhKY2JseHlYRzRnSUNBZ1JFOU5TR1ZzY0dWeWN5NXpjR0ZqWlNBOUlHWjFibU4wYVc5dUtDa2dlMXh5WEc0Z0lDQWdJQ0J5WlhSMWNtNGdVbVZoWTNRdVJFOU5Mbk53WVc0b2UxeHlYRzRnSUNBZ0lDQWdJR1JoYm1kbGNtOTFjMng1VTJWMFNXNXVaWEpJVkUxTU9pQjdYSEpjYmlBZ0lDQWdJQ0FnSUNCZlgyaDBiV3c2SUNjbWJtSnpjRHNuWEhKY2JpQWdJQ0FnSUNBZ2ZWeHlYRzRnSUNBZ0lDQjlLVHRjY2x4dUlDQWdJSDA3WEhKY2JpQWdmVnh5WEc0Z0lISmxkSFZ5YmlCRVQwMUlaV3h3WlhKek8xeHlYRzU5WEhKY2JseHlYRzVsZUhCdmNuUWdZMjl1YzNRZ1VtOTFkR1Z5SUQwZ1oyVjBVbTkxZEdWeUtDazdYSEpjYm1WNGNHOXlkQ0JqYjI1emRDQkVUMDBnUFNCblpYUkVUMDBvS1R0Y2NseHVYSEpjYm1WNGNHOXlkQ0JtZFc1amRHbHZiaUJqY21WaGRHVldhV1YzSUNoamJHRnpjMEZ5WjNNcElIdGNjbHh1SUNCc1pYUWdVbVZoWTNSRGJHRnpjeUE5SUZKbFlXTjBMbU55WldGMFpVTnNZWE56S0dOc1lYTnpRWEpuY3lrN1hISmNiaUFnYkdWMElGSmxZV04wUld4bGJXVnVkQ0E5SUZKbFlXTjBMbU55WldGMFpVVnNaVzFsYm5RdVltbHVaQ2hTWldGamRDNWpjbVZoZEdWRmJHVnRaVzUwTENCU1pXRmpkRU5zWVhOektUdGNjbHh1SUNCeVpYUjFjbTRnVW1WaFkzUkZiR1Z0Wlc1ME8xeHlYRzU5WEhKY2JpSmRmUT09IiwiaW1wb3J0IHtBY3Rpb25zfSBmcm9tICcuL0FjdGlvbnMnO1xyXG5pbXBvcnQgdXRpbHMgZnJvbSAnLi91dGlscyc7XHJcbmltcG9ydCBGcmVlemVyIGZyb20gJ2ZyZWV6ZXItanMnO1xyXG5pbXBvcnQgZ2V0Q29ubmVjdE1peGluIGZyb20gJy4vbWl4aW5zL2Nvbm5lY3QnO1xyXG5cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN0b3JlIHtcclxuICBjb25zdHJ1Y3RvcihhcmdzPXt9KSB7XHJcbiAgICBsZXQge2FjdGlvbnMsIGluaXRpYWx9ID0gYXJncztcclxuICAgIGxldCBpbml0ID0gdHlwZW9mIGluaXRpYWwgPT09ICdmdW5jdGlvbicgPyBpbml0aWFsKCkgOiBpbml0aWFsO1xyXG4gICAgbGV0IHN0b3JlID0gbmV3IEZyZWV6ZXIoaW5pdCB8fCB7fSk7XHJcblxyXG4gICAgdGhpcy5jb25uZWN0ID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcclxuICAgICAgcmV0dXJuIGdldENvbm5lY3RNaXhpbih0aGlzLCBhcmdzLmNvbmNhdChhcmdzKSk7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuaGFuZGxlcnMgPSBhcmdzLmhhbmRsZXJzIHx8IHV0aWxzLmdldFdpdGhvdXRGaWVsZHMoWydhY3Rpb25zJ10sIGFyZ3MpIHx8IHt9O1xyXG5cclxuICAgIGlmIChBcnJheS5pc0FycmF5KGFjdGlvbnMpKSB7XHJcbiAgICAgIHRoaXMuYWN0aW9ucyA9IGFjdGlvbnMgPSBuZXcgQWN0aW9ucyhhY3Rpb25zKTtcclxuICAgICAgdGhpcy5hY3Rpb25zLmFkZFN0b3JlKHRoaXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNldCA9IGZ1bmN0aW9uIChpdGVtLCB2YWx1ZSkge1xyXG4gICAgICBzdG9yZS5nZXQoKS5zZXQoaXRlbSwgdmFsdWUpO1xyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBnZXQgPSBmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICBpZiAoaXRlbSlcclxuICAgICAgICByZXR1cm4gc3RvcmUuZ2V0KCkudG9KUygpW2l0ZW1dO1xyXG4gICAgICByZXR1cm4gc3RvcmUuZ2V0KCk7XHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHJlc2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICBzdG9yZS5zZXQoaW5pdCk7XHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuc2V0ID0gc2V0O1xyXG4gICAgdGhpcy5nZXQgPSBnZXQ7XHJcbiAgICB0aGlzLnJlc2V0ID0gcmVzZXQ7XHJcbiAgICB0aGlzLnN0b3JlID0gc3RvcmU7XHJcblxyXG4gICAgdGhpcy5zdGF0ZVByb3RvID0ge3NldCwgZ2V0LCByZXNldCwgYWN0aW9uc307XHJcbiAgICAvL3RoaXMuZ2V0dGVyID0gbmV3IEdldHRlcih0aGlzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgYWRkQWN0aW9uKGl0ZW0pIHtcclxuICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XHJcbiAgICAgIHRoaXMuYWN0aW9ucyA9IHRoaXMuYWN0aW9ucy5jb25jYXQodGhpcy5hY3Rpb25zKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XHJcbiAgICAgIHRoaXMuYWN0aW9ucy5wdXNoKGl0ZW0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmVtb3ZlQWN0aW9uKGl0ZW0pIHtcclxuICAgIHZhciBhY3Rpb247XHJcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIGFjdGlvbiA9IHRoaXMuZmluZEJ5TmFtZSgnYWN0aW9ucycsICduYW1lJywgaXRlbSk7XHJcbiAgICAgIGlmIChhY3Rpb24pIGFjdGlvbi5yZW1vdmVTdG9yZSh0aGlzKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XHJcbiAgICAgIGFjdGlvbiA9IGl0ZW07XHJcbiAgICAgIGxldCBpbmRleCA9IHRoaXMuYWN0aW9ucy5pbmRleE9mKGFjdGlvbik7XHJcbiAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcclxuICAgICAgICBhY3Rpb24ucmVtb3ZlU3RvcmUodGhpcyk7XHJcbiAgICAgICAgdGhpcy5hY3Rpb25zID0gdGhpcy5hY3Rpb25zLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldEFjdGlvbkN5Y2xlKGFjdGlvbk5hbWUsIHByZWZpeD0nb24nKSB7XHJcbiAgICBjb25zdCBjYXBpdGFsaXplZCA9IHV0aWxzLmNhcGl0YWxpemUoYWN0aW9uTmFtZSk7XHJcbiAgICBjb25zdCBmdWxsQWN0aW9uTmFtZSA9IGAke3ByZWZpeH0ke2NhcGl0YWxpemVkfWA7XHJcbiAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5oYW5kbGVyc1tmdWxsQWN0aW9uTmFtZV0gfHwgdGhpcy5oYW5kbGVyc1thY3Rpb25OYW1lXTtcclxuICAgIGlmICghaGFuZGxlcikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE5vIGhhbmRsZXJzIGZvciAke2FjdGlvbk5hbWV9IGFjdGlvbiBkZWZpbmVkIGluIGN1cnJlbnQgc3RvcmVgKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgYWN0aW9ucztcclxuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgYWN0aW9ucyA9IGhhbmRsZXI7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIGFjdGlvbnMgPSB7b246IGhhbmRsZXJ9O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2hhbmRsZXJ9IG11c3QgYmUgYW4gb2JqZWN0IG9yIGZ1bmN0aW9uYCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gYWN0aW9ucztcclxuICB9XHJcblxyXG4gIC8vIDEuIHdpbGwoaW5pdGlhbCkgPT4gd2lsbFJlc3VsdFxyXG4gIC8vIDIuIHdoaWxlKHRydWUpXHJcbiAgLy8gMy4gb24od2lsbFJlc3VsdCB8fCBpbml0aWFsKSA9PiBvblJlc3VsdFxyXG4gIC8vIDQuIHdoaWxlKGZhbHNlKVxyXG4gIC8vIDUuIGRpZChvblJlc3VsdClcclxuICBydW5DeWNsZShhY3Rpb25OYW1lLCAuLi5hcmdzKSB7XHJcbiAgICAvLyBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHJlc29sdmUodHJ1ZSkpXHJcbiAgICBjb25zdCBjeWNsZSA9IHRoaXMuZ2V0QWN0aW9uQ3ljbGUoYWN0aW9uTmFtZSk7XHJcbiAgICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgbGV0IHdpbGwgPSBjeWNsZS53aWxsLCB3aGlsZV8gPSBjeWNsZS53aGlsZSwgb25fID0gY3ljbGUub247XHJcbiAgICBsZXQgZGlkID0gY3ljbGUuZGlkLCBkaWROb3QgPSBjeWNsZS5kaWROb3Q7XHJcblxyXG4gICAgLy8gTG9jYWwgc3RhdGUgZm9yIHRoaXMgY3ljbGUuXHJcbiAgICBsZXQgc3RhdGUgPSBPYmplY3QuY3JlYXRlKHRoaXMuc3RhdGVQcm90byk7XHJcblxyXG4gICAgLy8gUHJlLWNoZWNrICYgcHJlcGFyYXRpb25zLlxyXG4gICAgaWYgKHdpbGwpIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICByZXR1cm4gd2lsbC5hcHBseShzdGF0ZSwgYXJncyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdGFydCB3aGlsZSgpLlxyXG4gICAgaWYgKHdoaWxlXykgcHJvbWlzZSA9IHByb21pc2UudGhlbigod2lsbFJlc3VsdCkgPT4ge1xyXG4gICAgICB3aGlsZV8uY2FsbChzdGF0ZSwgdHJ1ZSk7XHJcbiAgICAgIHJldHVybiB3aWxsUmVzdWx0O1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWN0dWFsIGV4ZWN1dGlvbi5cclxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKHdpbGxSZXN1bHQpID0+IHtcclxuICAgICAgaWYgKHdpbGxSZXN1bHQgPT0gbnVsbCkge1xyXG4gICAgICAgIHJldHVybiBvbl8uYXBwbHkoc3RhdGUsIGFyZ3MpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBvbl8uY2FsbChzdGF0ZSwgd2lsbFJlc3VsdCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0b3Agd2hpbGUoKS5cclxuICAgIGlmICh3aGlsZV8pIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKG9uUmVzdWx0KSA9PiB7XHJcbiAgICAgIHdoaWxlXy5jYWxsKHN0YXRlLCBmYWxzZSk7XHJcbiAgICAgIHJldHVybiBvblJlc3VsdDtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZvciBkaWQgYW5kIGRpZE5vdCBzdGF0ZSBpcyBmcmVlemVkLlxyXG4gICAgcHJvbWlzZSA9IHByb21pc2UudGhlbigob25SZXN1bHQpID0+IHtcclxuICAgICAgT2JqZWN0LmZyZWV6ZShzdGF0ZSk7XHJcbiAgICAgIHJldHVybiBvblJlc3VsdDtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEhhbmRsZSB0aGUgcmVzdWx0LlxyXG4gICAgaWYgKGRpZCkgcHJvbWlzZSA9IHByb21pc2UudGhlbihvblJlc3VsdCA9PiB7XHJcbiAgICAgIHJldHVybiBkaWQuY2FsbChzdGF0ZSwgb25SZXN1bHQpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcHJvbWlzZS5jYXRjaChlcnJvciA9PiB7XHJcbiAgICAgIGlmICh3aGlsZV8pIHdoaWxlXy5jYWxsKHRoaXMsIHN0YXRlLCBmYWxzZSk7XHJcbiAgICAgIGlmIChkaWROb3QpIHtcclxuICAgICAgICBkaWROb3QuY2FsbChzdGF0ZSwgZXJyb3IpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcHJvbWlzZTtcclxuICB9XHJcbn1cclxuIiwiZXhwb3J0IGRlZmF1bHQge1xyXG4gIGN4OiBmdW5jdGlvbiAoY2xhc3NOYW1lcykge1xyXG4gICAgaWYgKHR5cGVvZiBjbGFzc05hbWVzID09ICdvYmplY3QnKSB7XHJcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhjbGFzc05hbWVzKS5maWx0ZXIoZnVuY3Rpb24oY2xhc3NOYW1lKSB7XHJcbiAgICAgICAgcmV0dXJuIGNsYXNzTmFtZXNbY2xhc3NOYW1lXTtcclxuICAgICAgfSkuam9pbignICcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5qb2luLmNhbGwoYXJndW1lbnRzLCAnICcpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuIiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZ2V0Q29ubmVjdE1peGluIChzdG9yZSkge1xyXG4gIGxldCBjaGFuZ2VDYWxsYmFjayA9IGZ1bmN0aW9uIChzdGF0ZSkge1xyXG4gICAgdGhpcy5zZXRTdGF0ZShzdGF0ZS50b0pTKCkpO1xyXG4gIH07XHJcblxyXG4gIGxldCBsaXN0ZW5lcjtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICBjb25zdCBmcm96ZW4gPSBzdG9yZS5zdG9yZS5nZXQoYXJndW1lbnRzKTtcclxuICAgICAgY29uc3Qgc3RhdGUgPSBmcm96ZW4udG9KUygpO1xyXG4gICAgICBsaXN0ZW5lciA9IGZyb3plbi5nZXRMaXN0ZW5lcigpO1xyXG4gICAgICByZXR1cm4gc3RhdGU7XHJcbiAgICB9LFxyXG5cclxuICAgIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGxpc3RlbmVyLm9uKCd1cGRhdGUnLCBjaGFuZ2VDYWxsYmFjay5iaW5kKHRoaXMpKTtcclxuICAgIH0sXHJcblxyXG4gICAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgbGlzdGVuZXIub2ZmKCd1cGRhdGUnKTtcclxuICAgIH1cclxuICB9O1xyXG59XHJcbiIsImNvbnN0IHV0aWxzID0ge307XHJcblxyXG51dGlscy5nZXRXaXRob3V0RmllbGRzID0gZnVuY3Rpb24gKG91dGNhc3QsIHRhcmdldCkge1xyXG4gIGlmICghdGFyZ2V0KSB0aHJvdyBuZXcgRXJyb3IoJ1R5cGVFcnJvcjogdGFyZ2V0IGlzIG5vdCBhbiBvYmplY3QuJyk7XHJcbiAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gIGlmICh0eXBlb2Ygb3V0Y2FzdCA9PT0gJ3N0cmluZycpIG91dGNhc3QgPSBbb3V0Y2FzdF07XHJcbiAgdmFyIHRLZXlzID0gT2JqZWN0LmtleXModGFyZ2V0KTtcclxuICBvdXRjYXN0LmZvckVhY2goZnVuY3Rpb24oZmllbGROYW1lKSB7XHJcbiAgICB0S2V5c1xyXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xyXG4gICAgICAgIHJldHVybiBrZXkgIT09IGZpZWxkTmFtZTtcclxuICAgICAgfSlcclxuICAgICAgLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XHJcbiAgICAgICAgcmVzdWx0W2tleV0gPSB0YXJnZXRba2V5XTtcclxuICAgICAgfSk7XHJcbiAgfSk7XHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufTtcclxuXHJcbnV0aWxzLm9iamVjdFRvQXJyYXkgPSBmdW5jdGlvbiAob2JqZWN0KSB7XHJcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdCkubWFwKGtleSA9PiBvYmplY3Rba2V5XSk7XHJcbn07XHJcblxyXG51dGlscy5jbGFzc1dpdGhBcmdzID0gZnVuY3Rpb24gKEl0ZW0sIGFyZ3MpIHtcclxuICByZXR1cm4gSXRlbS5iaW5kLmFwcGx5KEl0ZW0sW0l0ZW1dLmNvbmNhdChhcmdzKSk7XHJcbn07XHJcblxyXG4vLyAxLiB3aWxsXHJcbi8vIDIuIHdoaWxlKHRydWUpXHJcbi8vIDMuIG9uXHJcbi8vIDQuIHdoaWxlKGZhbHNlKVxyXG4vLyA1LiBkaWQgb3IgZGlkTm90XHJcbnV0aWxzLm1hcEFjdGlvbk5hbWVzID0gZnVuY3Rpb24ob2JqZWN0KSB7XHJcbiAgY29uc3QgbGlzdCA9IFtdO1xyXG4gIGNvbnN0IHByZWZpeGVzID0gWyd3aWxsJywgJ3doaWxlU3RhcnQnLCAnb24nLCAnd2hpbGVFbmQnLCAnZGlkJywgJ2RpZE5vdCddO1xyXG4gIHByZWZpeGVzLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICBsZXQgbmFtZSA9IGl0ZW07XHJcbiAgICBpZiAoaXRlbSA9PT0gJ3doaWxlU3RhcnQnIHx8IGl0ZW0gPT09ICd3aGlsZUVuZCcpIHtcclxuICAgICAgbmFtZSA9ICd3aGlsZSc7XHJcbiAgICB9XHJcbiAgICBpZiAob2JqZWN0W25hbWVdKSB7XHJcbiAgICAgIGxpc3QucHVzaChbaXRlbSwgb2JqZWN0W25hbWVdXSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcbiAgcmV0dXJuIGxpc3Q7XHJcbn07XHJcblxyXG51dGlscy5pc09iamVjdCA9IGZ1bmN0aW9uICh0YXJnKSB7XHJcbiAgcmV0dXJuIHRhcmcgPyB0YXJnLnRvU3RyaW5nKCkuc2xpY2UoOCwxNCkgPT09ICdPYmplY3QnIDogZmFsc2U7XHJcbn07XHJcbnV0aWxzLmNhcGl0YWxpemUgPSBmdW5jdGlvbiAoc3RyKSB7XHJcbiAgY29uc3QgZmlyc3QgPSBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCk7XHJcbiAgY29uc3QgcmVzdCA9IHN0ci5zbGljZSgxKTtcclxuICByZXR1cm4gYCR7Zmlyc3R9JHtyZXN0fWA7XHJcbn07XHJcblxyXG5leHBvcnQgZGVmYXVsdCB1dGlscztcclxuIl19
