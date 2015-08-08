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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvRE9NSGVscGVycy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztRQXdEZ0IsVUFBVSxHQUFWLFVBQVU7Ozs7O0lBeERuQixLQUFLLDJCQUFNLE9BQU87O0lBQ2xCLFdBQVcsMkJBQU0sY0FBYzs7QUFFdEMsU0FBUyxTQUFTLEdBQUk7QUFDcEIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO0FBQ2xCLE1BQUksT0FBTyxXQUFXLEtBQUssV0FBVyxFQUFFO0FBQ3RDLFFBQUksY0FBYyxHQUFHLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDO1FBQ3BILFlBQVksR0FBRyxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUM7UUFDdEMsZUFBZSxHQUFHLENBQUMsUUFBUSxFQUFFLG9CQUFvQixFQUFFLHFCQUFxQixFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSwrQkFBK0IsRUFBRSxLQUFLLENBQUM7UUFDbEosYUFBYSxHQUFHLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUscUJBQXFCLENBQUM7UUFDcEssV0FBVyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDOztBQUV6RSxrQkFBYyxDQUFDLE9BQU8sQ0FBQyxVQUFTLElBQUksRUFBRTtBQUNwQyxZQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ25FLENBQUMsQ0FBQzs7QUFFSCxlQUFXLENBQUMsT0FBTyxDQUFDLFVBQVMsSUFBSSxFQUFFO0FBQ2pDLFlBQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDbEMsQ0FBQyxDQUFDO0dBQ0o7QUFDRCxTQUFPLE1BQU0sQ0FBQztDQUNmOztBQUVELFNBQVMsTUFBTSxHQUFJO0FBQ2pCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQzs7QUFFdEIsTUFBSSxPQUFPLEtBQUssS0FBSyxXQUFXLEVBQUU7QUFDaEMsUUFBSSxHQUFHLEdBQUcsYUFBVSxJQUFJLEVBQVc7d0NBQU4sSUFBSTtBQUFKLFlBQUk7OztBQUMvQixVQUFJLFVBQVUsWUFBQSxDQUFDO0FBQ2YsVUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDM0MsVUFBSSxLQUFLLEtBQUssTUFBTSxFQUFFO0FBQ3BCLGtCQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO09BQzNCLE1BQU07QUFDTCxrQkFBVSxHQUFHLEVBQUUsQ0FBQztPQUNqQjtBQUNELGFBQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ3BFLENBQUM7O0FBRUYsU0FBSyxJQUFJLE9BQU8sSUFBSSxLQUFLLENBQUMsR0FBRyxFQUFFO0FBQzdCLGdCQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDL0M7O0FBRUQsY0FBVSxDQUFDLEtBQUssR0FBRyxZQUFXO0FBQzVCLGFBQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7QUFDcEIsK0JBQXVCLEVBQUU7QUFDdkIsZ0JBQU0sRUFBRSxRQUFRO1NBQ2pCO09BQ0YsQ0FBQyxDQUFDO0tBQ0osQ0FBQztHQUNIO0FBQ0QsU0FBTyxVQUFVLENBQUM7Q0FDbkI7O0FBRU0sSUFBTSxNQUFNLEdBQUcsU0FBUyxFQUFFLENBQUM7UUFBckIsTUFBTSxHQUFOLE1BQU07QUFDWixJQUFNLEdBQUcsR0FBRyxNQUFNLEVBQUUsQ0FBQzs7UUFBZixHQUFHLEdBQUgsR0FBRzs7QUFFVCxTQUFTLFVBQVUsQ0FBRSxTQUFTLEVBQUU7QUFDckMsTUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM5QyxNQUFJLFlBQVksR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0FBQzdFLFNBQU8sWUFBWSxDQUFDO0NBQ3JCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IFJlYWN0Um91dGVyIGZyb20gJ3JlYWN0LXJvdXRlcic7XG5cbmZ1bmN0aW9uIGdldFJvdXRlciAoKSB7XG4gIGNvbnN0IFJvdXRlciA9IHt9O1xuICBpZiAodHlwZW9mIFJlYWN0Um91dGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxldCByb3V0ZXJFbGVtZW50cyA9IFsnUm91dGUnLCAnRGVmYXVsdFJvdXRlJywgJ1JvdXRlSGFuZGxlcicsICdBY3RpdmVIYW5kbGVyJywgJ05vdEZvdW5kUm91dGUnLCAnTGluaycsICdSZWRpcmVjdCddLFxuICAgIHJvdXRlck1peGlucyA9IFsnTmF2aWdhdGlvbicsICdTdGF0ZSddLFxuICAgIHJvdXRlckZ1bmN0aW9ucyA9IFsnY3JlYXRlJywgJ2NyZWF0ZURlZmF1bHRSb3V0ZScsICdjcmVhdGVOb3RGb3VuZFJvdXRlJywgJ2NyZWF0ZVJlZGlyZWN0JywgJ2NyZWF0ZVJvdXRlJywgJ2NyZWF0ZVJvdXRlc0Zyb21SZWFjdENoaWxkcmVuJywgJ3J1biddLFxuICAgIHJvdXRlck9iamVjdHMgPSBbJ0hhc2hMb2NhdGlvbicsICdIaXN0b3J5JywgJ0hpc3RvcnlMb2NhdGlvbicsICdSZWZyZXNoTG9jYXRpb24nLCAnU3RhdGljTG9jYXRpb24nLCAnVGVzdExvY2F0aW9uJywgJ0ltaXRhdGVCcm93c2VyQmVoYXZpb3InLCAnU2Nyb2xsVG9Ub3BCZWhhdmlvciddLFxuICAgIGNvcGllZEl0ZW1zID0gcm91dGVyTWl4aW5zLmNvbmNhdChyb3V0ZXJGdW5jdGlvbnMpLmNvbmNhdChyb3V0ZXJPYmplY3RzKTtcblxuICAgIHJvdXRlckVsZW1lbnRzLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgUm91dGVyW25hbWVdID0gUmVhY3QuY3JlYXRlRWxlbWVudC5iaW5kKFJlYWN0LCBSZWFjdFJvdXRlcltuYW1lXSk7XG4gICAgfSk7XG5cbiAgICBjb3BpZWRJdGVtcy5mb3JFYWNoKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIFJvdXRlcltuYW1lXSA9IFJlYWN0Um91dGVyW25hbWVdO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBSb3V0ZXI7XG59XG5cbmZ1bmN0aW9uIGdldERPTSAoKSB7XG4gIGNvbnN0IERPTUhlbHBlcnMgPSB7fTtcblxuICBpZiAodHlwZW9mIFJlYWN0ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGxldCB0YWcgPSBmdW5jdGlvbiAobmFtZSwgLi4uYXJncykge1xuICAgICAgbGV0IGF0dHJpYnV0ZXM7XG4gICAgICBsZXQgZmlyc3QgPSBhcmdzWzBdICYmIGFyZ3NbMF0uY29uc3RydWN0b3I7XG4gICAgICBpZiAoZmlyc3QgPT09IE9iamVjdCkge1xuICAgICAgICBhdHRyaWJ1dGVzID0gYXJncy5zaGlmdCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXR0cmlidXRlcyA9IHt9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIFJlYWN0LkRPTVtuYW1lXS5hcHBseShSZWFjdC5ET00sIFthdHRyaWJ1dGVzXS5jb25jYXQoYXJncykpO1xuICAgIH07XG5cbiAgICBmb3IgKGxldCB0YWdOYW1lIGluIFJlYWN0LkRPTSkge1xuICAgICAgRE9NSGVscGVyc1t0YWdOYW1lXSA9IHRhZy5iaW5kKHRoaXMsIHRhZ05hbWUpO1xuICAgIH1cblxuICAgIERPTUhlbHBlcnMuc3BhY2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBSZWFjdC5ET00uc3Bhbih7XG4gICAgICAgIGRhbmdlcm91c2x5U2V0SW5uZXJIVE1MOiB7XG4gICAgICAgICAgX19odG1sOiAnJm5ic3A7J1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG4gIHJldHVybiBET01IZWxwZXJzO1xufVxuXG5leHBvcnQgY29uc3QgUm91dGVyID0gZ2V0Um91dGVyKCk7XG5leHBvcnQgY29uc3QgRE9NID0gZ2V0RE9NKCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVWaWV3IChjbGFzc0FyZ3MpIHtcbiAgbGV0IFJlYWN0Q2xhc3MgPSBSZWFjdC5jcmVhdGVDbGFzcyhjbGFzc0FyZ3MpO1xuICBsZXQgUmVhY3RFbGVtZW50ID0gUmVhY3QuY3JlYXRlRWxlbWVudC5iaW5kKFJlYWN0LmNyZWF0ZUVsZW1lbnQsIFJlYWN0Q2xhc3MpO1xuICByZXR1cm4gUmVhY3RFbGVtZW50O1xufVxuIl19
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
    var store = new Freezer(init);

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
      return store.get(item);
    };

    var reset = function reset() {
      store.set(init);
    };

    this.set = set;
    this.get = get;
    this.reset = reset;

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
    this.setState(state);
  };

  var listener = undefined;

  return {
    getInitialState: function getInitialState() {
      var state = store.get(arguments);
      listener = state.getListener();
      changeCallback = changeCallback.bind(this);
      return state;
    },

    componentDidMount: function componentDidMount() {
      listener.on("update", changeCallback);
    },

    componentWillUnmount: function componentWillUnmount() {
      listener.off("update", changeCallback);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvZnJlZXplci5qcyIsIm5vZGVfbW9kdWxlcy9mcmVlemVyLWpzL3NyYy9lbWl0dGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvc3JjL2ZyZWV6ZXIuanMiLCJub2RlX21vZHVsZXMvZnJlZXplci1qcy9zcmMvZnJvemVuLmpzIiwibm9kZV9tb2R1bGVzL2ZyZWV6ZXItanMvc3JjL21peGlucy5qcyIsIm5vZGVfbW9kdWxlcy9mcmVlemVyLWpzL3NyYy91dGlscy5qcyIsIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvQWN0aW9ucy5qcyIsInNyYy9ET01IZWxwZXJzLmpzIiwiL2hvbWUvY2hyaXMvY29kZS9leGltL3NyYy9TdG9yZS5qcyIsIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvaGVscGVycy5qcyIsIi9ob21lL2NocmlzL2NvZGUvZXhpbS9zcmMvbWl4aW5zL2Nvbm5lY3QuanMiLCIvaG9tZS9jaHJpcy9jb2RlL2V4aW0vc3JjL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozt1QkNBOEIsV0FBVzs7SUFBakMsTUFBTSxZQUFOLE1BQU07SUFBRSxPQUFPLFlBQVAsT0FBTzs7SUFDaEIsS0FBSywyQkFBTSxTQUFTOztJQUNwQixPQUFPLDJCQUFNLFdBQVc7OzBCQUNPLGNBQWM7O0lBQTVDLFVBQVUsZUFBVixVQUFVO0lBQUUsTUFBTSxlQUFOLE1BQU07SUFBRSxHQUFHLGVBQUgsR0FBRzs7QUFFL0IsSUFBTSxJQUFJLEdBQUcsRUFBQyxNQUFNLEVBQU4sTUFBTSxFQUFFLE9BQU8sRUFBUCxPQUFPLEVBQUUsS0FBSyxFQUFMLEtBQUssRUFBRSxNQUFNLEVBQU4sTUFBTSxFQUFFLEdBQUcsRUFBSCxHQUFHLEVBQUUsT0FBTyxFQUFQLE9BQU8sRUFBRSxVQUFVLEVBQVYsVUFBVSxFQUFDLENBQUM7O0FBRXhFLElBQUksQ0FBQyxZQUFZLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDbEMsU0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUN6QixDQUFDOztBQUVGLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDbkMsU0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUMxQixDQUFDOztBQUVGLElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxJQUFJLEVBQUU7QUFDakMsU0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUN4QixDQUFDOztpQkFFYSxJQUFJOzs7QUNuQm5CO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7SUMxR2EsTUFBTSxXQUFOLE1BQU07QUFDTixXQURBLE1B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Q2hCLFVBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNqQztHQUNGLENBQUMsQ0FBQztBQUNILFNBQU8sSUFBSSxDQUFDO0NBQ2IsQ0FBQzs7QUFFRixLQUFLLENBQUMsUUFBUSxHQUFHLFVBQVUsSUFBSSxFQUFFO0FBQy9CLFNBQU8sSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDLEVBQUUsQ0FBQyxLQUFLLFFBQVEsR0FBRyxLQUFLLENBQUM7Q0FDaEUsQ0FBQztBQUNGLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxHQUFHLEVBQUU7QUFDaEMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMxQyxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFCLGNBQVUsS0FBSyxRQUFHLElBQUksQ0FBRztDQUMxQixDQUFDOztpQkFFYSxLQUFLIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImltcG9ydCB7QWN0aW9uLCBBY3Rpb25zfSBmcm9tICcuL0FjdGlvbnMnO1xuaW1wb3J0IFN0b3JlIGZyb20gJy4vU3RvcmUnO1xuaW1wb3J0IGhlbHBlcnMgZnJvbSAnLi9oZWxwZXJzJztcbmltcG9ydCB7Y3JlYXRlVmlldywgUm91dGVyLCBET019IGZyb20gJy4vRE9NSGVscGVycyc7XG5cbmNvbnN0IEV4aW0gPSB7QWN0aW9uLCBBY3Rpb25zLCBTdG9yZSwgUm91dGVyLCBET00sIGhlbHBlcnMsIGNyZWF0ZVZpZXd9O1xuXG5FeGltLmNyZWF0ZUFjdGlvbiA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gIHJldHVybiBuZXcgQWN0aW9uKGFyZ3MpO1xufTtcblxuRXhpbS5jcmVhdGVBY3Rpb25zID0gZnVuY3Rpb24gKGFyZ3MpIHtcbiAgcmV0dXJuIG5ldyBBY3Rpb25zKGFyZ3MpO1xufTtcblxuRXhpbS5jcmVhdGVTdG9yZSA9IGZ1bmN0aW9uIChhcmdzKSB7XG4gIHJldHVybiBuZXcgU3RvcmUoYXJncyk7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBFeGltO1xuIiwidmFyIEZyZWV6ZXIgPSByZXF1aXJlKCcuL3NyYy9mcmVlemVyJyk7XG5tb2R1bGUuZXhwb3J0cyA9IEZyZWV6ZXI7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVXRpbHMgPSByZXF1aXJlKCAnLi91dGlscycgKTtcblxuLy8jYnVpbGRcblxuLy8gVGhlIHByb3RvdHlwZSBtZXRob2RzIGFyZSBzdG9yZWQgaW4gYSBkaWZmZXJlbnQgb2JqZWN0XG4vLyBhbmQgYXBwbGllZCBhcyBub24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzIGxhdGVyXG52YXIgZW1pdHRlclByb3RvID0ge1xuXHRvbjogZnVuY3Rpb24oIGV2ZW50TmFtZSwgbGlzdGVuZXIsIG9uY2UgKXtcblx0XHR2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzWyBldmVudE5hbWUgXSB8fCBbXTtcblxuXHRcdGxpc3RlbmVycy5wdXNoKHsgY2FsbGJhY2s6IGxpc3RlbmVyLCBvbmNlOiBvbmNlfSk7XG5cdFx0dGhpcy5fZXZlbnRzWyBldmVudE5hbWUgXSA9ICBsaXN0ZW5lcnM7XG5cblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblxuXHRvbmNlOiBmdW5jdGlvbiggZXZlbnROYW1lLCBsaXN0ZW5lciApe1xuXHRcdHRoaXMub24oIGV2ZW50TmFtZSwgbGlzdGVuZXIsIHRydWUgKTtcblx0fSxcblxuXHRvZmY6IGZ1bmN0aW9uKCBldmVudE5hbWUsIGxpc3RlbmVyICl7XG5cdFx0aWYoIHR5cGVvZiBldmVudE5hbWUgPT0gJ3VuZGVmaW5lZCcgKXtcblx0XHRcdHRoaXMuX2V2ZW50cyA9IHt9O1xuXHRcdH1cblx0XHRlbHNlIGlmKCB0eXBlb2YgbGlzdGVuZXIgPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHR0aGlzLl9ldmVudHNbIGV2ZW50TmFtZSBdID0gW107XG5cdFx0fVxuXHRcdGVsc2Uge1xuXHRcdFx0dmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1sgZXZlbnROYW1lIF0gfHwgW10sXG5cdFx0XHRcdGlcblx0XHRcdDtcblxuXHRcdFx0Zm9yIChpID0gbGlzdGVuZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG5cdFx0XHRcdGlmKCBsaXN0ZW5lcnNbaV0gPT09IGxpc3RlbmVyIClcblx0XHRcdFx0XHRsaXN0ZW5lcnMuc3BsaWNlKCBpLCAxICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cblx0dHJpZ2dlcjogZnVuY3Rpb24oIGV2ZW50TmFtZSApe1xuXHRcdHZhciBhcmdzID0gW10uc2xpY2UuY2FsbCggYXJndW1lbnRzLCAxICksXG5cdFx0XHRsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbIGV2ZW50TmFtZSBdIHx8IFtdLFxuXHRcdFx0b25jZUxpc3RlbmVycyA9IFtdLFxuXHRcdFx0aSwgbGlzdGVuZXJcblx0XHQ7XG5cblx0XHQvLyBDYWxsIGxpc3RlbmVyc1xuXHRcdGZvciAoaSA9IDA7IGkgPCBsaXN0ZW5lcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGxpc3RlbmVyID0gbGlzdGVuZXJzW2ldO1xuXG5cdFx0XHRpZiggbGlzdGVuZXIuY2FsbGJhY2sgKVxuXHRcdFx0XHRsaXN0ZW5lci5jYWxsYmFjay5hcHBseSggbnVsbCwgYXJncyApO1xuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdC8vIElmIHRoZXJlIGlzIG5vdCBhIGNhbGxiYWNrLCByZW1vdmUhXG5cdFx0XHRcdGxpc3RlbmVyLm9uY2UgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiggbGlzdGVuZXIub25jZSApXG5cdFx0XHRcdG9uY2VMaXN0ZW5lcnMucHVzaCggaSApO1xuXHRcdH1cblxuXHRcdC8vIFJlbW92ZSBsaXN0ZW5lcnMgbWFya2VkIGFzIG9uY2Vcblx0XHRmb3IoIGkgPSBvbmNlTGlzdGVuZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tICl7XG5cdFx0XHRsaXN0ZW5lcnMuc3BsaWNlKCBvbmNlTGlzdGVuZXJzW2ldLCAxICk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cbn07XG5cbi8vIE1ldGhvZHMgYXJlIG5vdCBlbnVtZXJhYmxlIHNvLCB3aGVuIHRoZSBzdG9yZXMgYXJlXG4vLyBleHRlbmRlZCB3aXRoIHRoZSBlbWl0dGVyLCB0aGV5IGNhbiBiZSBpdGVyYXRlZCBhc1xuLy8gaGFzaG1hcHNcbnZhciBFbWl0dGVyID0gVXRpbHMuY3JlYXRlTm9uRW51bWVyYWJsZSggZW1pdHRlclByb3RvICk7XG4vLyNidWlsZFxuXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFV0aWxzID0gcmVxdWlyZSggJy4vdXRpbHMuanMnICksXHJcblx0RW1pdHRlciA9IHJlcXVpcmUoICcuL2VtaXR0ZXInICksXHJcblx0TWl4aW5zID0gcmVxdWlyZSggJy4vbWl4aW5zJyApLFxyXG5cdEZyb3plbiA9IHJlcXVpcmUoICcuL2Zyb3plbicgKVxyXG47XHJcblxyXG4vLyNidWlsZFxyXG52YXIgRnJlZXplciA9IGZ1bmN0aW9uKCBpbml0aWFsVmFsdWUsIG9wdGlvbnMgKSB7XHJcblx0dmFyIG1lID0gdGhpcyxcclxuXHRcdG11dGFibGUgPSAoIG9wdGlvbnMgJiYgb3B0aW9ucy5tdXRhYmxlICkgfHwgZmFsc2UsXHJcblx0XHRsaXZlID0gKCBvcHRpb25zICYmIG9wdGlvbnMubGl2ZSApIHx8IGxpdmVcclxuXHQ7XHJcblxyXG5cdC8vIEltbXV0YWJsZSBkYXRhXHJcblx0dmFyIGZyb3plbjtcclxuXHJcblx0dmFyIG5vdGlmeSA9IGZ1bmN0aW9uIG5vdGlmeSggZXZlbnROYW1lLCBub2RlLCBvcHRpb25zICl7XHJcblx0XHRpZiggZXZlbnROYW1lID09ICdsaXN0ZW5lcicgKVxyXG5cdFx0XHRyZXR1cm4gRnJvemVuLmNyZWF0ZUxpc3RlbmVyKCBub2RlICk7XHJcblxyXG5cdFx0cmV0dXJuIEZyb3plbi51cGRhdGUoIGV2ZW50TmFtZSwgbm9kZSwgb3B0aW9ucyApO1xyXG5cdH07XHJcblxyXG5cdHZhciBmcmVlemUgPSBmdW5jdGlvbigpe307XHJcblx0aWYoICFtdXRhYmxlIClcclxuXHRcdGZyZWV6ZSA9IGZ1bmN0aW9uKCBvYmogKXsgT2JqZWN0LmZyZWV6ZSggb2JqICk7IH07XHJcblxyXG5cdC8vIENyZWF0ZSB0aGUgZnJvemVuIG9iamVjdFxyXG5cdGZyb3plbiA9IEZyb3plbi5mcmVlemUoIGluaXRpYWxWYWx1ZSwgbm90aWZ5LCBmcmVlemUsIGxpdmUgKTtcclxuXHJcblx0Ly8gTGlzdGVuIHRvIGl0cyBjaGFuZ2VzIGltbWVkaWF0ZWx5XHJcblx0dmFyIGxpc3RlbmVyID0gZnJvemVuLmdldExpc3RlbmVyKCk7XHJcblxyXG5cdC8vIFVwZGF0aW5nIGZsYWcgdG8gdHJpZ2dlciB0aGUgZXZlbnQgb24gbmV4dFRpY2tcclxuXHR2YXIgdXBkYXRpbmcgPSBmYWxzZTtcclxuXHJcblx0bGlzdGVuZXIub24oICdpbW1lZGlhdGUnLCBmdW5jdGlvbiggcHJldk5vZGUsIHVwZGF0ZWQgKXtcclxuXHRcdGlmKCBwcmV2Tm9kZSAhPSBmcm96ZW4gKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0ZnJvemVuID0gdXBkYXRlZDtcclxuXHJcblx0XHRpZiggbGl2ZSApXHJcblx0XHRcdHJldHVybiBtZS50cmlnZ2VyKCAndXBkYXRlJywgdXBkYXRlZCApO1xyXG5cclxuXHRcdC8vIFRyaWdnZXIgb24gbmV4dCB0aWNrXHJcblx0XHRpZiggIXVwZGF0aW5nICl7XHJcblx0XHRcdHVwZGF0aW5nID0gdHJ1ZTtcclxuXHRcdFx0VXRpbHMubmV4dFRpY2soIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dXBkYXRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRtZS50cmlnZ2VyKCAndXBkYXRlJywgZnJvemVuICk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRVdGlscy5hZGRORSggdGhpcywge1xyXG5cdFx0Z2V0OiBmdW5jdGlvbigpe1xyXG5cdFx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdFx0fSxcclxuXHRcdHNldDogZnVuY3Rpb24oIG5vZGUgKXtcclxuXHRcdFx0dmFyIG5ld05vZGUgPSBub3RpZnkoICdyZXNldCcsIGZyb3plbiwgbm9kZSApO1xyXG5cdFx0XHRuZXdOb2RlLl9fLmxpc3RlbmVyLnRyaWdnZXIoICdpbW1lZGlhdGUnLCBmcm96ZW4sIG5ld05vZGUgKTtcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0VXRpbHMuYWRkTkUoIHRoaXMsIHsgZ2V0RGF0YTogdGhpcy5nZXQsIHNldERhdGE6IHRoaXMuc2V0IH0gKTtcclxuXHJcblx0Ly8gVGhlIGV2ZW50IHN0b3JlXHJcblx0dGhpcy5fZXZlbnRzID0gW107XHJcbn1cclxuXHJcbkZyZWV6ZXIucHJvdG90eXBlID0gVXRpbHMuY3JlYXRlTm9uRW51bWVyYWJsZSh7Y29uc3RydWN0b3I6IEZyZWV6ZXJ9LCBFbWl0dGVyKTtcclxuLy8jYnVpbGRcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRnJlZXplcjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFV0aWxzID0gcmVxdWlyZSggJy4vdXRpbHMnICksXHJcblx0TWl4aW5zID0gcmVxdWlyZSggJy4vbWl4aW5zJyksXHJcblx0RW1pdHRlciA9IHJlcXVpcmUoJy4vZW1pdHRlcicpXHJcbjtcclxuXHJcbi8vI2J1aWxkXHJcbnZhciBGcm96ZW4gPSB7XHJcblx0ZnJlZXplOiBmdW5jdGlvbiggbm9kZSwgbm90aWZ5LCBmcmVlemVGbiwgbGl2ZSApe1xyXG5cdFx0aWYoIG5vZGUgJiYgbm9kZS5fXyApe1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW4sIG1peGluLCBjb25zXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIG5vZGUuY29uc3RydWN0b3IgPT0gQXJyYXkgKXtcclxuXHRcdFx0ZnJvemVuID0gdGhpcy5jcmVhdGVBcnJheSggbm9kZS5sZW5ndGggKTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRmcm96ZW4gPSBPYmplY3QuY3JlYXRlKCBNaXhpbnMuSGFzaCApO1xyXG5cdFx0fVxyXG5cclxuXHRcdFV0aWxzLmFkZE5FKCBmcm96ZW4sIHsgX186IHtcclxuXHRcdFx0bGlzdGVuZXI6IGZhbHNlLFxyXG5cdFx0XHRwYXJlbnRzOiBbXSxcclxuXHRcdFx0bm90aWZ5OiBub3RpZnksXHJcblx0XHRcdGRpcnR5OiBmYWxzZSxcclxuXHRcdFx0ZnJlZXplRm46IGZyZWV6ZUZuLFxyXG5cdFx0XHRsaXZlOiBsaXZlIHx8IGZhbHNlXHJcblx0XHR9fSk7XHJcblxyXG5cdFx0Ly8gRnJlZXplIGNoaWxkcmVuXHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRjb25zID0gY2hpbGQgJiYgY2hpbGQuY29uc3RydWN0b3I7XHJcblx0XHRcdGlmKCBjb25zID09IEFycmF5IHx8IGNvbnMgPT0gT2JqZWN0ICl7XHJcblx0XHRcdFx0Y2hpbGQgPSBtZS5mcmVlemUoIGNoaWxkLCBub3RpZnksIGZyZWV6ZUZuLCBsaXZlICk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApe1xyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmcm96ZW5bIGtleSBdID0gY2hpbGQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRmcmVlemVGbiggZnJvemVuICk7XHJcblxyXG5cdFx0cmV0dXJuIGZyb3plbjtcclxuXHR9LFxyXG5cclxuXHR1cGRhdGU6IGZ1bmN0aW9uKCB0eXBlLCBub2RlLCBvcHRpb25zICl7XHJcblx0XHRpZiggIXRoaXNbIHR5cGUgXSlcclxuXHRcdFx0cmV0dXJuIFV0aWxzLmVycm9yKCAnVW5rbm93biB1cGRhdGUgdHlwZTogJyArIHR5cGUgKTtcclxuXHJcblx0XHRyZXR1cm4gdGhpc1sgdHlwZSBdKCBub2RlLCBvcHRpb25zICk7XHJcblx0fSxcclxuXHJcblx0cmVzZXQ6IGZ1bmN0aW9uKCBub2RlLCB2YWx1ZSApe1xyXG5cdFx0dmFyIG1lID0gdGhpcyxcclxuXHRcdFx0ZnJvemVuXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIHZhbHVlICYmIHZhbHVlLl9fICl7XHJcblx0XHRcdGZyb3plbiA9IHZhbHVlO1xyXG5cdFx0XHRmcm96ZW4uX18ubGlzdGVuZXIgPSB2YWx1ZS5fXy5saXN0ZW5lcjtcclxuXHRcdFx0ZnJvemVuLl9fLnBhcmVudHMgPSBbXTtcclxuXHJcblx0XHRcdC8vIFNldCBiYWNrIHRoZSBwYXJlbnQgb24gdGhlIGNoaWxkcmVuXHJcblx0XHRcdC8vIHRoYXQgaGF2ZSBiZWVuIHVwZGF0ZWRcclxuXHRcdFx0dGhpcy5maXhDaGlsZHJlbiggZnJvemVuLCBub2RlICk7XHJcblx0XHRcdFV0aWxzLmVhY2goIGZyb3plbiwgZnVuY3Rpb24oIGNoaWxkICl7XHJcblx0XHRcdFx0aWYoIGNoaWxkICYmIGNoaWxkLl9fICl7XHJcblx0XHRcdFx0XHRtZS5yZW1vdmVQYXJlbnQoIG5vZGUgKTtcclxuXHRcdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0ZnJvemVuID0gdGhpcy5mcmVlemUoIG5vZGUsIG5vZGUuX18ubm90aWZ5LCBub2RlLl9fLmZyZWV6ZUZuLCBub2RlLl9fLmxpdmUgKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdG1lcmdlOiBmdW5jdGlvbiggbm9kZSwgYXR0cnMgKXtcclxuXHRcdHZhciB0cmFucyA9IG5vZGUuX18udHJhbnMsXHJcblxyXG5cdFx0XHQvLyBDbG9uZSB0aGUgYXR0cnMgdG8gbm90IG1vZGlmeSB0aGUgYXJndW1lbnRcclxuXHRcdFx0YXR0cnMgPSBVdGlscy5leHRlbmQoIHt9LCBhdHRycylcclxuXHRcdDtcclxuXHJcblx0XHRpZiggdHJhbnMgKXtcclxuXHJcblx0XHRcdGZvciggdmFyIGF0dHIgaW4gYXR0cnMgKVxyXG5cdFx0XHRcdHRyYW5zWyBhdHRyIF0gPSBhdHRyc1sgYXR0ciBdO1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmNvcHlNZXRhKCBub2RlICksXHJcblx0XHRcdG5vdGlmeSA9IG5vZGUuX18ubm90aWZ5LFxyXG5cdFx0XHR2YWwsIGNvbnMsIGtleSwgaXNGcm96ZW5cclxuXHRcdDtcclxuXHJcblx0XHRVdGlscy5lYWNoKCBub2RlLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRpc0Zyb3plbiA9IGNoaWxkICYmIGNoaWxkLl9fO1xyXG5cclxuXHRcdFx0aWYoIGlzRnJvemVuICl7XHJcblx0XHRcdFx0bWUucmVtb3ZlUGFyZW50KCBjaGlsZCwgbm9kZSApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR2YWwgPSBhdHRyc1sga2V5IF07XHJcblx0XHRcdGlmKCAhdmFsICl7XHJcblx0XHRcdFx0aWYoIGlzRnJvemVuIClcclxuXHRcdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHRcdHJldHVybiBmcm96ZW5bIGtleSBdID0gY2hpbGQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnMgPSB2YWwgJiYgdmFsLmNvbnN0cnVjdG9yO1xyXG5cclxuXHRcdFx0aWYoIGNvbnMgPT0gQXJyYXkgfHwgY29ucyA9PSBPYmplY3QgKVxyXG5cdFx0XHRcdHZhbCA9IG1lLmZyZWV6ZSggdmFsLCBub3RpZnksIG5vZGUuX18uZnJlZXplRm4sIG5vZGUuX18ubGl2ZSApO1xyXG5cclxuXHRcdFx0aWYoIHZhbCAmJiB2YWwuX18gKVxyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggdmFsLCBmcm96ZW4gKTtcclxuXHJcblx0XHRcdGRlbGV0ZSBhdHRyc1sga2V5IF07XHJcblxyXG5cdFx0XHRmcm96ZW5bIGtleSBdID0gdmFsO1xyXG5cdFx0fSk7XHJcblxyXG5cclxuXHRcdGZvcigga2V5IGluIGF0dHJzICkge1xyXG5cdFx0XHR2YWwgPSBhdHRyc1sga2V5IF07XHJcblx0XHRcdGNvbnMgPSB2YWwgJiYgdmFsLmNvbnN0cnVjdG9yO1xyXG5cclxuXHRcdFx0aWYoIGNvbnMgPT0gQXJyYXkgfHwgY29ucyA9PSBPYmplY3QgKVxyXG5cdFx0XHRcdHZhbCA9IG1lLmZyZWV6ZSggdmFsLCBub3RpZnksIG5vZGUuX18uZnJlZXplRm4sIG5vZGUuX18ubGl2ZSApO1xyXG5cclxuXHRcdFx0aWYoIHZhbCAmJiB2YWwuX18gKVxyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggdmFsLCBmcm96ZW4gKTtcclxuXHJcblx0XHRcdGZyb3plblsga2V5IF0gPSB2YWw7XHJcblx0XHR9XHJcblxyXG5cdFx0bm9kZS5fXy5mcmVlemVGbiggZnJvemVuICk7XHJcblxyXG5cdFx0dGhpcy5yZWZyZXNoUGFyZW50cyggbm9kZSwgZnJvemVuICk7XHJcblxyXG5cdFx0cmV0dXJuIGZyb3plbjtcclxuXHR9LFxyXG5cclxuXHRyZXBsYWNlOiBmdW5jdGlvbiggbm9kZSwgcmVwbGFjZW1lbnQgKSB7XHJcblxyXG5cdFx0dmFyIG1lID0gdGhpcyxcclxuXHRcdFx0Y29ucyA9IHJlcGxhY2VtZW50ICYmIHJlcGxhY2VtZW50LmNvbnN0cnVjdG9yLFxyXG5cdFx0XHRfXyA9IG5vZGUuX18sXHJcblx0XHRcdGZyb3plbiA9IHJlcGxhY2VtZW50XHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIGNvbnMgPT0gQXJyYXkgfHwgY29ucyA9PSBPYmplY3QgKSB7XHJcblxyXG5cdFx0XHRmcm96ZW4gPSBtZS5mcmVlemUoIHJlcGxhY2VtZW50LCBfXy5ub3RpZnksIF9fLmZyZWV6ZUZuLCBfXy5saXZlICk7XHJcblxyXG5cdFx0XHRmcm96ZW4uX18ucGFyZW50cyA9IF9fLnBhcmVudHM7XHJcblxyXG5cdFx0XHQvLyBBZGQgdGhlIGN1cnJlbnQgbGlzdGVuZXIgaWYgZXhpc3RzLCByZXBsYWNpbmcgYVxyXG5cdFx0XHQvLyBwcmV2aW91cyBsaXN0ZW5lciBpbiB0aGUgZnJvemVuIGlmIGV4aXN0ZWRcclxuXHRcdFx0aWYoIF9fLmxpc3RlbmVyIClcclxuXHRcdFx0XHRmcm96ZW4uX18ubGlzdGVuZXIgPSBub2RlLl9fLmxpc3RlbmVyO1xyXG5cclxuXHRcdFx0Ly8gU2luY2UgdGhlIHBhcmVudHMgd2lsbCBiZSByZWZyZXNoZWQgZGlyZWN0bHksXHJcblx0XHRcdC8vIFRyaWdnZXIgdGhlIGxpc3RlbmVyIGhlcmVcclxuXHRcdFx0aWYoIGZyb3plbi5fXy5saXN0ZW5lciApXHJcblx0XHRcdFx0dGhpcy50cmlnZ2VyKCBmcm96ZW4sICd1cGRhdGUnLCBmcm96ZW4gKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWZyZXNoIHRoZSBwYXJlbnQgbm9kZXMgZGlyZWN0bHlcclxuXHRcdGlmKCAhX18ucGFyZW50cy5sZW5ndGggJiYgX18ubGlzdGVuZXIgKXtcclxuXHRcdFx0X18ubGlzdGVuZXIudHJpZ2dlciggJ2ltbWVkaWF0ZScsIG5vZGUsIGZyb3plbiApO1xyXG5cdFx0fVxyXG5cdFx0Zm9yICh2YXIgaSA9IF9fLnBhcmVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuXHRcdFx0aWYoIGkgPT0gMCApe1xyXG5cdFx0XHRcdHRoaXMucmVmcmVzaCggX18ucGFyZW50c1tpXSwgbm9kZSwgZnJvemVuLCBmYWxzZSApO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2V7XHJcblxyXG5cdFx0XHRcdHRoaXMubWFya0RpcnR5KCBfXy5wYXJlbnRzW2ldLCBbbm9kZSwgZnJvemVuXSApO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdHJlbW92ZTogZnVuY3Rpb24oIG5vZGUsIGF0dHJzICl7XHJcblx0XHR2YXIgdHJhbnMgPSBub2RlLl9fLnRyYW5zO1xyXG5cdFx0aWYoIHRyYW5zICl7XHJcblx0XHRcdGZvciggdmFyIGwgPSBhdHRycy5sZW5ndGggLSAxOyBsID49IDA7IGwtLSApXHJcblx0XHRcdFx0ZGVsZXRlIHRyYW5zWyBhdHRyc1tsXSBdO1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmNvcHlNZXRhKCBub2RlICksXHJcblx0XHRcdGlzRnJvemVuXHJcblx0XHQ7XHJcblxyXG5cdFx0VXRpbHMuZWFjaCggbm9kZSwgZnVuY3Rpb24oIGNoaWxkLCBrZXkgKXtcclxuXHRcdFx0aXNGcm96ZW4gPSBjaGlsZCAmJiBjaGlsZC5fXztcclxuXHJcblx0XHRcdGlmKCBpc0Zyb3plbiApe1xyXG5cdFx0XHRcdG1lLnJlbW92ZVBhcmVudCggY2hpbGQsIG5vZGUgKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYoIGF0dHJzLmluZGV4T2YoIGtleSApICE9IC0xICl7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiggaXNGcm96ZW4gKVxyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cclxuXHRcdFx0ZnJvemVuWyBrZXkgXSA9IGNoaWxkO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0bm9kZS5fXy5mcmVlemVGbiggZnJvemVuICk7XHJcblx0XHR0aGlzLnJlZnJlc2hQYXJlbnRzKCBub2RlLCBmcm96ZW4gKTtcclxuXHJcblx0XHRyZXR1cm4gZnJvemVuO1xyXG5cdH0sXHJcblxyXG5cdHNwbGljZTogZnVuY3Rpb24oIG5vZGUsIGFyZ3MgKXtcclxuXHRcdHZhciB0cmFucyA9IG5vZGUuX18udHJhbnM7XHJcblx0XHRpZiggdHJhbnMgKXtcclxuXHRcdFx0dHJhbnMuc3BsaWNlLmFwcGx5KCB0cmFucywgYXJncyApO1xyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHRcdH1cclxuXHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmNvcHlNZXRhKCBub2RlICksXHJcblx0XHRcdGluZGV4ID0gYXJnc1swXSxcclxuXHRcdFx0ZGVsZXRlSW5kZXggPSBpbmRleCArIGFyZ3NbMV0sXHJcblx0XHRcdF9fID0gbm9kZS5fXyxcclxuXHRcdFx0Y29uLCBjaGlsZFxyXG5cdFx0O1xyXG5cclxuXHRcdC8vIENsb25lIHRoZSBhcnJheVxyXG5cdFx0VXRpbHMuZWFjaCggbm9kZSwgZnVuY3Rpb24oIGNoaWxkLCBpICl7XHJcblxyXG5cdFx0XHRpZiggY2hpbGQgJiYgY2hpbGQuX18gKXtcclxuXHRcdFx0XHRtZS5yZW1vdmVQYXJlbnQoIGNoaWxkLCBub2RlICk7XHJcblxyXG5cdFx0XHRcdC8vIFNraXAgdGhlIG5vZGVzIHRvIGRlbGV0ZVxyXG5cdFx0XHRcdGlmKCBpIDwgaW5kZXggfHwgaT49IGRlbGV0ZUluZGV4IClcclxuXHRcdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmcm96ZW5baV0gPSBjaGlsZDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFByZXBhcmUgdGhlIG5ldyBub2Rlc1xyXG5cdFx0aWYoIGFyZ3MubGVuZ3RoID4gMSApe1xyXG5cdFx0XHRmb3IgKHZhciBpID0gYXJncy5sZW5ndGggLSAxOyBpID49IDI7IGktLSkge1xyXG5cdFx0XHRcdGNoaWxkID0gYXJnc1tpXTtcclxuXHRcdFx0XHRjb24gPSBjaGlsZCAmJiBjaGlsZC5jb25zdHJ1Y3RvcjtcclxuXHJcblx0XHRcdFx0aWYoIGNvbiA9PSBBcnJheSB8fCBjb24gPT0gT2JqZWN0IClcclxuXHRcdFx0XHRcdGNoaWxkID0gdGhpcy5mcmVlemUoIGNoaWxkLCBfXy5ub3RpZnksIF9fLmZyZWV6ZUZuLCBfXy5saXZlICk7XHJcblxyXG5cdFx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApXHJcblx0XHRcdFx0XHR0aGlzLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cclxuXHRcdFx0XHRhcmdzW2ldID0gY2hpbGQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBzcGxpY2VcclxuXHRcdEFycmF5LnByb3RvdHlwZS5zcGxpY2UuYXBwbHkoIGZyb3plbiwgYXJncyApO1xyXG5cclxuXHRcdG5vZGUuX18uZnJlZXplRm4oIGZyb3plbiApO1xyXG5cdFx0dGhpcy5yZWZyZXNoUGFyZW50cyggbm9kZSwgZnJvemVuICk7XHJcblxyXG5cdFx0cmV0dXJuIGZyb3plbjtcclxuXHR9LFxyXG5cclxuXHR0cmFuc2FjdDogZnVuY3Rpb24oIG5vZGUgKSB7XHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHR0cmFuc2FjdGluZyA9IG5vZGUuX18udHJhbnMsXHJcblx0XHRcdHRyYW5zXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIHRyYW5zYWN0aW5nIClcclxuXHRcdFx0cmV0dXJuIHRyYW5zYWN0aW5nO1xyXG5cclxuXHRcdHRyYW5zID0gbm9kZS5jb25zdHJ1Y3RvciA9PSBBcnJheSA/IFtdIDoge307XHJcblxyXG5cdFx0VXRpbHMuZWFjaCggbm9kZSwgZnVuY3Rpb24oIGNoaWxkLCBrZXkgKXtcclxuXHRcdFx0dHJhbnNbIGtleSBdID0gY2hpbGQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRub2RlLl9fLnRyYW5zID0gdHJhbnM7XHJcblxyXG5cdFx0Ly8gQ2FsbCBydW4gYXV0b21hdGljYWxseSBpbiBjYXNlXHJcblx0XHQvLyB0aGUgdXNlciBmb3Jnb3QgYWJvdXQgaXRcclxuXHRcdFV0aWxzLm5leHRUaWNrKCBmdW5jdGlvbigpe1xyXG5cdFx0XHRpZiggbm9kZS5fXy50cmFucyApXHJcblx0XHRcdFx0bWUucnVuKCBub2RlICk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gdHJhbnM7XHJcblx0fSxcclxuXHJcblx0cnVuOiBmdW5jdGlvbiggbm9kZSApIHtcclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdHRyYW5zID0gbm9kZS5fXy50cmFuc1xyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCAhdHJhbnMgKVxyXG5cdFx0XHRyZXR1cm4gbm9kZTtcclxuXHJcblx0XHQvLyBSZW1vdmUgdGhlIG5vZGUgYXMgYSBwYXJlbnRcclxuXHRcdFV0aWxzLmVhY2goIHRyYW5zLCBmdW5jdGlvbiggY2hpbGQsIGtleSApe1xyXG5cdFx0XHRpZiggY2hpbGQgJiYgY2hpbGQuX18gKXtcclxuXHRcdFx0XHRtZS5yZW1vdmVQYXJlbnQoIGNoaWxkLCBub2RlICk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGRlbGV0ZSBub2RlLl9fLnRyYW5zO1xyXG5cclxuXHRcdHZhciByZXN1bHQgPSB0aGlzLnJlcGxhY2UoIG5vZGUsIHRyYW5zICk7XHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH0sXHJcblxyXG5cdHJlZnJlc2g6IGZ1bmN0aW9uKCBub2RlLCBvbGRDaGlsZCwgbmV3Q2hpbGQsIHJldHVyblVwZGF0ZWQgKXtcclxuXHRcdHZhciBtZSA9IHRoaXMsXHJcblx0XHRcdHRyYW5zID0gbm9kZS5fXy50cmFucyxcclxuXHRcdFx0Zm91bmQgPSAwXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIHRyYW5zICl7XHJcblxyXG5cdFx0XHRVdGlscy5lYWNoKCB0cmFucywgZnVuY3Rpb24oIGNoaWxkLCBrZXkgKXtcclxuXHRcdFx0XHRpZiggZm91bmQgKSByZXR1cm47XHJcblxyXG5cdFx0XHRcdGlmKCBjaGlsZCA9PT0gb2xkQ2hpbGQgKXtcclxuXHJcblx0XHRcdFx0XHR0cmFuc1sga2V5IF0gPSBuZXdDaGlsZDtcclxuXHRcdFx0XHRcdGZvdW5kID0gMTtcclxuXHJcblx0XHRcdFx0XHRpZiggbmV3Q2hpbGQgJiYgbmV3Q2hpbGQuX18gKVxyXG5cdFx0XHRcdFx0XHRtZS5hZGRQYXJlbnQoIG5ld0NoaWxkLCBub2RlICk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdHJldHVybiBub2RlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHZhciBmcm96ZW4gPSB0aGlzLmNvcHlNZXRhKCBub2RlICksXHJcblx0XHRcdGRpcnR5ID0gbm9kZS5fXy5kaXJ0eSxcclxuXHRcdFx0ZGlydCwgcmVwbGFjZW1lbnQsIF9fXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIGRpcnR5ICl7XHJcblx0XHRcdGRpcnQgPSBkaXJ0eVswXSxcclxuXHRcdFx0cmVwbGFjZW1lbnQgPSBkaXJ0eVsxXVxyXG5cdFx0fVxyXG5cclxuXHRcdFV0aWxzLmVhY2goIG5vZGUsIGZ1bmN0aW9uKCBjaGlsZCwga2V5ICl7XHJcblx0XHRcdGlmKCBjaGlsZCA9PT0gb2xkQ2hpbGQgKXtcclxuXHRcdFx0XHRjaGlsZCA9IG5ld0NoaWxkO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgaWYoIGNoaWxkID09PSBkaXJ0ICl7XHJcblx0XHRcdFx0Y2hpbGQgPSByZXBsYWNlbWVudDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYoIGNoaWxkICYmIChfXyA9IGNoaWxkLl9fKSApe1xyXG5cclxuXHRcdFx0XHQvLyBJZiB0aGVyZSBpcyBhIHRyYW5zIGhhcHBlbmluZyB3ZVxyXG5cdFx0XHRcdC8vIGRvbid0IHVwZGF0ZSBhIGRpcnR5IG5vZGUgbm93LiBUaGUgdXBkYXRlXHJcblx0XHRcdFx0Ly8gd2lsbCBvY2N1ciBvbiBydW4uXHJcblx0XHRcdFx0aWYoICFfXy50cmFucyAmJiBfXy5kaXJ0eSApe1xyXG5cdFx0XHRcdFx0Y2hpbGQgPSBtZS5yZWZyZXNoKCBjaGlsZCwgX18uZGlydHlbMF0sIF9fLmRpcnR5WzFdLCB0cnVlICk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHJcblx0XHRcdFx0bWUucmVtb3ZlUGFyZW50KCBjaGlsZCwgbm9kZSApO1xyXG5cdFx0XHRcdG1lLmFkZFBhcmVudCggY2hpbGQsIGZyb3plbiApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRmcm96ZW5bIGtleSBdID0gY2hpbGQ7XHJcblx0XHR9KTtcclxuXHJcblx0XHRub2RlLl9fLmZyZWV6ZUZuKCBmcm96ZW4gKTtcclxuXHJcblx0XHQvLyBJZiB0aGUgbm9kZSB3YXMgZGlydHksIGNsZWFuIGl0XHJcblx0XHRub2RlLl9fLmRpcnR5ID0gZmFsc2U7XHJcblxyXG5cdFx0aWYoIHJldHVyblVwZGF0ZWQgKVxyXG5cdFx0XHRyZXR1cm4gZnJvemVuO1xyXG5cclxuXHRcdHRoaXMucmVmcmVzaFBhcmVudHMoIG5vZGUsIGZyb3plbiApO1xyXG5cdH0sXHJcblxyXG5cdGZpeENoaWxkcmVuOiBmdW5jdGlvbiggbm9kZSwgb2xkTm9kZSApe1xyXG5cdFx0dmFyIG1lID0gdGhpcztcclxuXHRcdFV0aWxzLmVhY2goIG5vZGUsIGZ1bmN0aW9uKCBjaGlsZCApe1xyXG5cdFx0XHRpZiggIWNoaWxkIHx8ICFjaGlsZC5fXyApXHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIGNoaWxkIGlzIGxpbmtlZCB0byB0aGUgbm9kZSxcclxuXHRcdFx0Ly8gbWF5YmUgaXRzIGNoaWxkcmVuIGFyZSBub3QgbGlua2VkXHJcblx0XHRcdGlmKCBjaGlsZC5fXy5wYXJlbnRzLmluZGV4T2YoIG5vZGUgKSAhPSAtMSApXHJcblx0XHRcdFx0cmV0dXJuIG1lLmZpeENoaWxkcmVuKCBjaGlsZCApO1xyXG5cclxuXHRcdFx0Ly8gSWYgdGhlIGNoaWxkIHdhc24ndCBsaW5rZWQgaXQgaXMgc3VyZVxyXG5cdFx0XHQvLyB0aGF0IGl0IHdhc24ndCBtb2RpZmllZC4gSnVzdCBsaW5rIGl0XHJcblx0XHRcdC8vIHRvIHRoZSBuZXcgcGFyZW50XHJcblx0XHRcdGlmKCBjaGlsZC5fXy5wYXJlbnRzLmxlbmd0aCA9PSAxIClcclxuXHRcdFx0XHRyZXR1cm4gY2hpbGQuX18ucGFyZW50cyA9IFsgbm9kZSBdO1xyXG5cclxuXHRcdFx0aWYoIG9sZE5vZGUgKVxyXG5cdFx0XHRcdG1lLnJlbW92ZVBhcmVudCggY2hpbGQsIG9sZE5vZGUgKTtcclxuXHJcblx0XHRcdG1lLmFkZFBhcmVudCggbm9kZSApO1xyXG5cdFx0fSk7XHJcblx0fSxcclxuXHJcblx0Y29weU1ldGE6IGZ1bmN0aW9uKCBub2RlICl7XHJcblx0XHR2YXIgbWUgPSB0aGlzLFxyXG5cdFx0XHRmcm96ZW5cclxuXHRcdDtcclxuXHJcblx0XHRpZiggbm9kZS5jb25zdHJ1Y3RvciA9PSBBcnJheSApe1xyXG5cdFx0XHRmcm96ZW4gPSB0aGlzLmNyZWF0ZUFycmF5KCBub2RlLmxlbmd0aCApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGZyb3plbiA9IE9iamVjdC5jcmVhdGUoIE1peGlucy5IYXNoICk7XHJcblx0XHR9XHJcblxyXG5cdFx0dmFyIF9fID0gbm9kZS5fXztcclxuXHJcblx0XHRVdGlscy5hZGRORSggZnJvemVuLCB7X186IHtcclxuXHRcdFx0bm90aWZ5OiBfXy5ub3RpZnksXHJcblx0XHRcdGxpc3RlbmVyOiBfXy5saXN0ZW5lcixcclxuXHRcdFx0cGFyZW50czogX18ucGFyZW50cy5zbGljZSggMCApLFxyXG5cdFx0XHR0cmFuczogX18udHJhbnMsXHJcblx0XHRcdGRpcnR5OiBmYWxzZSxcclxuXHRcdFx0ZnJlZXplRm46IF9fLmZyZWV6ZUZuXHJcblx0XHR9fSk7XHJcblxyXG5cdFx0cmV0dXJuIGZyb3plbjtcclxuXHR9LFxyXG5cclxuXHRyZWZyZXNoUGFyZW50czogZnVuY3Rpb24oIG9sZENoaWxkLCBuZXdDaGlsZCApe1xyXG5cdFx0dmFyIF9fID0gb2xkQ2hpbGQuX18sXHJcblx0XHRcdGlcclxuXHRcdDtcclxuXHJcblx0XHRpZiggX18ubGlzdGVuZXIgKVxyXG5cdFx0XHR0aGlzLnRyaWdnZXIoIG5ld0NoaWxkLCAndXBkYXRlJywgbmV3Q2hpbGQgKTtcclxuXHJcblx0XHRpZiggIV9fLnBhcmVudHMubGVuZ3RoICl7XHJcblx0XHRcdGlmKCBfXy5saXN0ZW5lciApe1xyXG5cdFx0XHRcdF9fLmxpc3RlbmVyLnRyaWdnZXIoICdpbW1lZGlhdGUnLCBvbGRDaGlsZCwgbmV3Q2hpbGQgKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGZvciAoaSA9IF9fLnBhcmVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuXHRcdFx0XHQvLyBJZiB0aGVyZSBpcyBtb3JlIHRoYW4gb25lIHBhcmVudCwgbWFyayBldmVyeW9uZSBhcyBkaXJ0eVxyXG5cdFx0XHRcdC8vIGJ1dCB0aGUgbGFzdCBpbiB0aGUgaXRlcmF0aW9uLCBhbmQgd2hlbiB0aGUgbGFzdCBpcyByZWZyZXNoZWRcclxuXHRcdFx0XHQvLyBpdCB3aWxsIHVwZGF0ZSB0aGUgZGlydHkgbm9kZXMuXHJcblx0XHRcdFx0aWYoIGkgPT0gMCApXHJcblx0XHRcdFx0XHR0aGlzLnJlZnJlc2goIF9fLnBhcmVudHNbaV0sIG9sZENoaWxkLCBuZXdDaGlsZCwgZmFsc2UgKTtcclxuXHRcdFx0XHRlbHNle1xyXG5cclxuXHRcdFx0XHRcdHRoaXMubWFya0RpcnR5KCBfXy5wYXJlbnRzW2ldLCBbb2xkQ2hpbGQsIG5ld0NoaWxkXSApO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0sXHJcblxyXG5cdG1hcmtEaXJ0eTogZnVuY3Rpb24oIG5vZGUsIGRpcnQgKXtcclxuXHRcdHZhciBfXyA9IG5vZGUuX18sXHJcblx0XHRcdGlcclxuXHRcdDtcclxuXHRcdF9fLmRpcnR5ID0gZGlydDtcclxuXHJcblx0XHQvLyBJZiB0aGVyZSBpcyBhIHRyYW5zYWN0aW9uIGhhcHBlbmluZyBpbiB0aGUgbm9kZVxyXG5cdFx0Ly8gdXBkYXRlIHRoZSB0cmFuc2FjdGlvbiBkYXRhIGltbWVkaWF0ZWx5XHJcblx0XHRpZiggX18udHJhbnMgKVxyXG5cdFx0XHR0aGlzLnJlZnJlc2goIG5vZGUsIGRpcnRbMF0sIGRpcnRbMV0gKTtcclxuXHJcblx0XHRmb3IgKCBpID0gX18ucGFyZW50cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSApIHtcclxuXHJcblx0XHRcdHRoaXMubWFya0RpcnR5KCBfXy5wYXJlbnRzW2ldLCBkaXJ0ICk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0cmVtb3ZlUGFyZW50OiBmdW5jdGlvbiggbm9kZSwgcGFyZW50ICl7XHJcblx0XHR2YXIgcGFyZW50cyA9IG5vZGUuX18ucGFyZW50cyxcclxuXHRcdFx0aW5kZXggPSBwYXJlbnRzLmluZGV4T2YoIHBhcmVudCApXHJcblx0XHQ7XHJcblxyXG5cdFx0aWYoIGluZGV4ICE9IC0xICl7XHJcblxyXG5cdFx0XHRwYXJlbnRzLnNwbGljZSggaW5kZXgsIDEgKTtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHRhZGRQYXJlbnQ6IGZ1bmN0aW9uKCBub2RlLCBwYXJlbnQgKXtcclxuXHRcdHZhciBwYXJlbnRzID0gbm9kZS5fXy5wYXJlbnRzLFxyXG5cdFx0XHRpbmRleCA9IHBhcmVudHMuaW5kZXhPZiggcGFyZW50IClcclxuXHRcdDtcclxuXHJcblx0XHRpZiggaW5kZXggPT0gLTEgKXtcclxuXHRcdFx0cGFyZW50c1sgcGFyZW50cy5sZW5ndGggXSA9IHBhcmVudDtcclxuXHRcdH1cclxuXHR9LFxyXG5cclxuXHR0cmlnZ2VyOiBmdW5jdGlvbiggbm9kZSwgZXZlbnROYW1lLCBwYXJhbSApe1xyXG5cdFx0dmFyIGxpc3RlbmVyID0gbm9kZS5fXy5saXN0ZW5lcixcclxuXHRcdFx0dGlja2luZyA9IGxpc3RlbmVyLnRpY2tpbmdcclxuXHRcdDtcclxuXHJcblx0XHRsaXN0ZW5lci50aWNraW5nID0gcGFyYW07XHJcblx0XHRpZiggIXRpY2tpbmcgKXtcclxuXHRcdFx0VXRpbHMubmV4dFRpY2soIGZ1bmN0aW9uKCl7XHJcblx0XHRcdFx0dmFyIHVwZGF0ZWQgPSBsaXN0ZW5lci50aWNraW5nO1xyXG5cdFx0XHRcdGxpc3RlbmVyLnRpY2tpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRsaXN0ZW5lci50cmlnZ2VyKCBldmVudE5hbWUsIHVwZGF0ZWQgKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSxcclxuXHJcblx0Y3JlYXRlTGlzdGVuZXI6IGZ1bmN0aW9uKCBmcm96ZW4gKXtcclxuXHRcdHZhciBsID0gZnJvemVuLl9fLmxpc3RlbmVyO1xyXG5cclxuXHRcdGlmKCAhbCApIHtcclxuXHRcdFx0bCA9IE9iamVjdC5jcmVhdGUoRW1pdHRlciwge1xyXG5cdFx0XHRcdF9ldmVudHM6IHtcclxuXHRcdFx0XHRcdHZhbHVlOiB7fSxcclxuXHRcdFx0XHRcdHdyaXRhYmxlOiB0cnVlXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGZyb3plbi5fXy5saXN0ZW5lciA9IGw7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGw7XHJcblx0fSxcclxuXHJcblx0Y3JlYXRlQXJyYXk6IChmdW5jdGlvbigpe1xyXG5cdFx0Ly8gU2V0IGNyZWF0ZUFycmF5IG1ldGhvZFxyXG5cdFx0aWYoIFtdLl9fcHJvdG9fXyApXHJcblx0XHRcdHJldHVybiBmdW5jdGlvbiggbGVuZ3RoICl7XHJcblx0XHRcdFx0dmFyIGFyciA9IG5ldyBBcnJheSggbGVuZ3RoICk7XHJcblx0XHRcdFx0YXJyLl9fcHJvdG9fXyA9IE1peGlucy5MaXN0O1xyXG5cdFx0XHRcdHJldHVybiBhcnI7XHJcblx0XHRcdH1cclxuXHRcdHJldHVybiBmdW5jdGlvbiggbGVuZ3RoICl7XHJcblx0XHRcdHZhciBhcnIgPSBuZXcgQXJyYXkoIGxlbmd0aCApLFxyXG5cdFx0XHRcdG1ldGhvZHMgPSBNaXhpbnMuYXJyYXlNZXRob2RzXHJcblx0XHRcdDtcclxuXHRcdFx0Zm9yKCB2YXIgbSBpbiBtZXRob2RzICl7XHJcblx0XHRcdFx0YXJyWyBtIF0gPSBtZXRob2RzWyBtIF07XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGFycjtcclxuXHRcdH1cclxuXHR9KSgpXHJcbn07XHJcbi8vI2J1aWxkXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZyb3plbjtcclxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFV0aWxzID0gcmVxdWlyZSggJy4vdXRpbHMuanMnICk7XHJcblxyXG4vLyNidWlsZFxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgZGVzY3JpcHRvcnMsIHRvIGJlIHVzZWQgYnkgT2JqZWN0LmNyZWF0ZS5cclxuICogQHBhcmFtICB7T2JqZWN0fSBhdHRycyBQcm9wZXJ0aWVzIHRvIGNyZWF0ZSBkZXNjcmlwdG9yc1xyXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgIEEgaGFzaCB3aXRoIHRoZSBkZXNjcmlwdG9ycy5cclxuICovXHJcbnZhciBjcmVhdGVORSA9IGZ1bmN0aW9uKCBhdHRycyApe1xyXG5cdHZhciBuZSA9IHt9O1xyXG5cclxuXHRmb3IoIHZhciBrZXkgaW4gYXR0cnMgKXtcclxuXHRcdG5lWyBrZXkgXSA9IHtcclxuXHRcdFx0d3JpdGFibGU6IHRydWUsXHJcblx0XHRcdGNvbmZpZ3VyYWJsZTogdHJ1ZSxcclxuXHRcdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0XHRcdHZhbHVlOiBhdHRyc1sga2V5XVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIG5lO1xyXG59XHJcblxyXG52YXIgY29tbW9uTWV0aG9kcyA9IHtcclxuXHRzZXQ6IGZ1bmN0aW9uKCBhdHRyLCB2YWx1ZSApe1xyXG5cdFx0dmFyIGF0dHJzID0gYXR0cixcclxuXHRcdFx0dXBkYXRlID0gdGhpcy5fXy50cmFuc1xyXG5cdFx0O1xyXG5cclxuXHRcdGlmKCB0eXBlb2YgdmFsdWUgIT0gJ3VuZGVmaW5lZCcgKXtcclxuXHRcdFx0YXR0cnMgPSB7fTtcclxuXHRcdFx0YXR0cnNbIGF0dHIgXSA9IHZhbHVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmKCAhdXBkYXRlICl7XHJcblx0XHRcdGZvciggdmFyIGtleSBpbiBhdHRycyApe1xyXG5cdFx0XHRcdHVwZGF0ZSA9IHVwZGF0ZSB8fCB0aGlzWyBrZXkgXSAhPSBhdHRyc1sga2V5IF07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIE5vIGNoYW5nZXMsIGp1c3QgcmV0dXJuIHRoZSBub2RlXHJcblx0XHRcdGlmKCAhdXBkYXRlIClcclxuXHRcdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdtZXJnZScsIHRoaXMsIGF0dHJzICk7XHJcblx0fSxcclxuXHJcblx0cmVzZXQ6IGZ1bmN0aW9uKCBhdHRycyApIHtcclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3JlcGxhY2UnLCB0aGlzLCBhdHRycyApO1xyXG5cdH0sXHJcblxyXG5cdGdldExpc3RlbmVyOiBmdW5jdGlvbigpe1xyXG5cdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAnbGlzdGVuZXInLCB0aGlzICk7XHJcblx0fSxcclxuXHJcblx0dG9KUzogZnVuY3Rpb24oKXtcclxuXHRcdHZhciBqcztcclxuXHRcdGlmKCB0aGlzLmNvbnN0cnVjdG9yID09IEFycmF5ICl7XHJcblx0XHRcdGpzID0gbmV3IEFycmF5KCB0aGlzLmxlbmd0aCApO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGpzID0ge307XHJcblx0XHR9XHJcblxyXG5cdFx0VXRpbHMuZWFjaCggdGhpcywgZnVuY3Rpb24oIGNoaWxkLCBpICl7XHJcblx0XHRcdGlmKCBjaGlsZCAmJiBjaGlsZC5fXyApXHJcblx0XHRcdFx0anNbIGkgXSA9IGNoaWxkLnRvSlMoKTtcclxuXHRcdFx0ZWxzZVxyXG5cdFx0XHRcdGpzWyBpIF0gPSBjaGlsZDtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiBqcztcclxuXHR9LFxyXG5cclxuXHR0cmFuc2FjdDogZnVuY3Rpb24oKXtcclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3RyYW5zYWN0JywgdGhpcyApO1xyXG5cdH0sXHJcblx0cnVuOiBmdW5jdGlvbigpe1xyXG5cdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAncnVuJywgdGhpcyApO1xyXG5cdH1cclxufTtcclxuXHJcbnZhciBhcnJheU1ldGhvZHMgPSBVdGlscy5leHRlbmQoe1xyXG5cdHB1c2g6IGZ1bmN0aW9uKCBlbCApe1xyXG5cdFx0cmV0dXJuIHRoaXMuYXBwZW5kKCBbZWxdICk7XHJcblx0fSxcclxuXHJcblx0YXBwZW5kOiBmdW5jdGlvbiggZWxzICl7XHJcblx0XHRpZiggZWxzICYmIGVscy5sZW5ndGggKVxyXG5cdFx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdzcGxpY2UnLCB0aGlzLCBbdGhpcy5sZW5ndGgsIDBdLmNvbmNhdCggZWxzICkgKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHBvcDogZnVuY3Rpb24oKXtcclxuXHRcdGlmKCAhdGhpcy5sZW5ndGggKVxyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5fXy5ub3RpZnkoICdzcGxpY2UnLCB0aGlzLCBbdGhpcy5sZW5ndGggLTEsIDFdICk7XHJcblx0fSxcclxuXHJcblx0dW5zaGlmdDogZnVuY3Rpb24oIGVsICl7XHJcblx0XHRyZXR1cm4gdGhpcy5wcmVwZW5kKCBbZWxdICk7XHJcblx0fSxcclxuXHJcblx0cHJlcGVuZDogZnVuY3Rpb24oIGVscyApe1xyXG5cdFx0aWYoIGVscyAmJiBlbHMubGVuZ3RoIClcclxuXHRcdFx0cmV0dXJuIHRoaXMuX18ubm90aWZ5KCAnc3BsaWNlJywgdGhpcywgWzAsIDBdLmNvbmNhdCggZWxzICkgKTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH0sXHJcblxyXG5cdHNoaWZ0OiBmdW5jdGlvbigpe1xyXG5cdFx0aWYoICF0aGlzLmxlbmd0aCApXHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3NwbGljZScsIHRoaXMsIFswLCAxXSApO1xyXG5cdH0sXHJcblxyXG5cdHNwbGljZTogZnVuY3Rpb24oIGluZGV4LCB0b1JlbW92ZSwgdG9BZGQgKXtcclxuXHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3NwbGljZScsIHRoaXMsIGFyZ3VtZW50cyApO1xyXG5cdH1cclxufSwgY29tbW9uTWV0aG9kcyApO1xyXG5cclxudmFyIEZyb3plbkFycmF5ID0gT2JqZWN0LmNyZWF0ZSggQXJyYXkucHJvdG90eXBlLCBjcmVhdGVORSggYXJyYXlNZXRob2RzICkgKTtcclxuXHJcbnZhciBNaXhpbnMgPSB7XHJcblxyXG5IYXNoOiBPYmplY3QuY3JlYXRlKCBPYmplY3QucHJvdG90eXBlLCBjcmVhdGVORSggVXRpbHMuZXh0ZW5kKHtcclxuXHRyZW1vdmU6IGZ1bmN0aW9uKCBrZXlzICl7XHJcblx0XHR2YXIgZmlsdGVyZWQgPSBbXSxcclxuXHRcdFx0ayA9IGtleXNcclxuXHRcdDtcclxuXHJcblx0XHRpZigga2V5cy5jb25zdHJ1Y3RvciAhPSBBcnJheSApXHJcblx0XHRcdGsgPSBbIGtleXMgXTtcclxuXHJcblx0XHRmb3IoIHZhciBpID0gMCwgbCA9IGsubGVuZ3RoOyBpPGw7IGkrKyApe1xyXG5cdFx0XHRpZiggdGhpcy5oYXNPd25Qcm9wZXJ0eSgga1tpXSApIClcclxuXHRcdFx0XHRmaWx0ZXJlZC5wdXNoKCBrW2ldICk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYoIGZpbHRlcmVkLmxlbmd0aCApXHJcblx0XHRcdHJldHVybiB0aGlzLl9fLm5vdGlmeSggJ3JlbW92ZScsIHRoaXMsIGZpbHRlcmVkICk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9XHJcbn0sIGNvbW1vbk1ldGhvZHMpKSksXHJcblxyXG5MaXN0OiBGcm96ZW5BcnJheSxcclxuYXJyYXlNZXRob2RzOiBhcnJheU1ldGhvZHNcclxufTtcclxuLy8jYnVpbGRcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTWl4aW5zOyIsIid1c2Ugc3RyaWN0JztcblxuLy8jYnVpbGRcbnZhciBnbG9iYWwgPSAobmV3IEZ1bmN0aW9uKFwicmV0dXJuIHRoaXNcIikoKSk7XG5cbnZhciBVdGlscyA9IHtcblx0ZXh0ZW5kOiBmdW5jdGlvbiggb2IsIHByb3BzICl7XG5cdFx0Zm9yKCB2YXIgcCBpbiBwcm9wcyApe1xuXHRcdFx0b2JbcF0gPSBwcm9wc1twXTtcblx0XHR9XG5cdFx0cmV0dXJuIG9iO1xuXHR9LFxuXG5cdGNyZWF0ZU5vbkVudW1lcmFibGU6IGZ1bmN0aW9uKCBvYmosIHByb3RvICl7XG5cdFx0dmFyIG5lID0ge307XG5cdFx0Zm9yKCB2YXIga2V5IGluIG9iaiApXG5cdFx0XHRuZVtrZXldID0ge3ZhbHVlOiBvYmpba2V5XSB9O1xuXHRcdHJldHVybiBPYmplY3QuY3JlYXRlKCBwcm90byB8fCB7fSwgbmUgKTtcblx0fSxcblxuXHRlcnJvcjogZnVuY3Rpb24oIG1lc3NhZ2UgKXtcblx0XHR2YXIgZXJyID0gbmV3IEVycm9yKCBtZXNzYWdlICk7XG5cdFx0aWYoIGNvbnNvbGUgKVxuXHRcdFx0cmV0dXJuIGNvbnNvbGUuZXJyb3IoIGVyciApO1xuXHRcdGVsc2Vcblx0XHRcdHRocm93IGVycjtcblx0fSxcblxuXHRlYWNoOiBmdW5jdGlvbiggbywgY2xiayApe1xuXHRcdHZhciBpLGwsa2V5cztcblx0XHRpZiggbyAmJiBvLmNvbnN0cnVjdG9yID09IEFycmF5ICl7XG5cdFx0XHRmb3IgKGkgPSAwLCBsID0gby5sZW5ndGg7IGkgPCBsOyBpKyspXG5cdFx0XHRcdGNsYmsoIG9baV0sIGkgKTtcblx0XHR9XG5cdFx0ZWxzZSB7XG5cdFx0XHRrZXlzID0gT2JqZWN0LmtleXMoIG8gKTtcblx0XHRcdGZvciggaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKyApXG5cdFx0XHRcdGNsYmsoIG9bIGtleXNbaV0gXSwga2V5c1tpXSApO1xuXHRcdH1cblx0fSxcblxuXHRhZGRORTogZnVuY3Rpb24oIG5vZGUsIGF0dHJzICl7XG5cdFx0Zm9yKCB2YXIga2V5IGluIGF0dHJzICl7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoIG5vZGUsIGtleSwge1xuXHRcdFx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcblx0XHRcdFx0Y29uZmlndXJhYmxlOiB0cnVlLFxuXHRcdFx0XHR3cml0YWJsZTogdHJ1ZSxcblx0XHRcdFx0dmFsdWU6IGF0dHJzWyBrZXkgXVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9LFxuXG5cdC8vIG5leHRUaWNrIC0gYnkgc3RhZ2FzIC8gcHVibGljIGRvbWFpblxuICBcdG5leHRUaWNrOiAoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHF1ZXVlID0gW10sXG5cdFx0XHRkaXJ0eSA9IGZhbHNlLFxuXHRcdFx0Zm4sXG5cdFx0XHRoYXNQb3N0TWVzc2FnZSA9ICEhZ2xvYmFsLnBvc3RNZXNzYWdlLFxuXHRcdFx0bWVzc2FnZU5hbWUgPSAnbmV4dHRpY2snLFxuXHRcdFx0dHJpZ2dlciA9IChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBoYXNQb3N0TWVzc2FnZVxuXHRcdFx0XHRcdD8gZnVuY3Rpb24gdHJpZ2dlciAoKSB7XG5cdFx0XHRcdFx0Z2xvYmFsLnBvc3RNZXNzYWdlKG1lc3NhZ2VOYW1lLCAnKicpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdDogZnVuY3Rpb24gdHJpZ2dlciAoKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHByb2Nlc3NRdWV1ZSgpIH0sIDApO1xuXHRcdFx0XHR9O1xuXHRcdFx0fSgpKSxcblx0XHRcdHByb2Nlc3NRdWV1ZSA9IChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdHJldHVybiBoYXNQb3N0TWVzc2FnZVxuXHRcdFx0XHRcdD8gZnVuY3Rpb24gcHJvY2Vzc1F1ZXVlIChldmVudCkge1xuXHRcdFx0XHRcdFx0aWYgKGV2ZW50LnNvdXJjZSA9PT0gZ2xvYmFsICYmIGV2ZW50LmRhdGEgPT09IG1lc3NhZ2VOYW1lKSB7XG5cdFx0XHRcdFx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdFx0XHRmbHVzaFF1ZXVlKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdDogZmx1c2hRdWV1ZTtcbiAgICAgIFx0fSkoKVxuICAgICAgO1xuXG4gICAgICBmdW5jdGlvbiBmbHVzaFF1ZXVlICgpIHtcbiAgICAgICAgICB3aGlsZSAoZm4gPSBxdWV1ZS5zaGlmdCgpKSB7XG4gICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRpcnR5ID0gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIG5leHRUaWNrIChmbikge1xuICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgIGlmIChkaXJ0eSkgcmV0dXJuO1xuICAgICAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICB0cmlnZ2VyKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChoYXNQb3N0TWVzc2FnZSkgZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBwcm9jZXNzUXVldWUsIHRydWUpO1xuXG4gICAgICBuZXh0VGljay5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBnbG9iYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHByb2Nlc3NRdWV1ZSwgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXh0VGljaztcbiAgfSkoKVxufTtcbi8vI2J1aWxkXG5cblxubW9kdWxlLmV4cG9ydHMgPSBVdGlsczsiLCJleHBvcnQgY2xhc3MgQWN0aW9uIHtcbiAgY29uc3RydWN0b3IoYXJncykge1xuICAgIGNvbnN0IFtzdG9yZSwgc3RvcmVzLCBhbGxTdG9yZXNdID0gW2FyZ3Muc3RvcmUsIGFyZ3Muc3RvcmVzLCBbXV07XG4gICAgdGhpcy5uYW1lID0gYXJncy5uYW1lO1xuXG4gICAgaWYgKHN0b3JlKSBhbGxTdG9yZXMucHVzaChzdG9yZSk7XG4gICAgaWYgKHN0b3JlcykgYWxsU3RvcmVzLnB1c2guYXBwbHkoYWxsU3RvcmVzLCBzdG9yZXMpO1xuXG4gICAgdGhpcy5zdG9yZXMgPSBhbGxTdG9yZXM7XG4gIH1cblxuICBydW4oLi4uYXJncykge1xuICAgIGNvbnN0IHN0b3Jlc0N5Y2xlcyA9IHRoaXMuc3RvcmVzLm1hcChzdG9yZSA9PlxuICAgICAgc3RvcmUucnVuQ3ljbGUuYXBwbHkoc3RvcmUsIFt0aGlzLm5hbWVdLmNvbmNhdChhcmdzKSlcbiAgICApO1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzdG9yZXNDeWNsZXMpO1xuICB9XG5cbiAgYWRkU3RvcmUoc3RvcmUpIHtcbiAgICB0aGlzLnN0b3Jlcy5wdXNoKHN0b3JlKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQWN0aW9ucyB7XG4gIGNvbnN0cnVjdG9yKGFjdGlvbnMpIHtcbiAgICB0aGlzLmFsbCA9IFtdO1xuICAgIGlmIChBcnJheS5pc0FycmF5KGFjdGlvbnMpKSB7XG4gICAgICBhY3Rpb25zLmZvckVhY2goKGFjdGlvbiA9PiB0aGlzLmFkZEFjdGlvbihhY3Rpb24pKSwgdGhpcyk7XG4gICAgfVxuICB9XG5cbiAgYWRkQWN0aW9uKGl0ZW0sIG5vT3ZlcnJpZGUpIHtcbiAgICBjb25zdCBhY3Rpb24gPSBub092ZXJyaWRlID8gZmFsc2UgOiB0aGlzLmRldGVjdEFjdGlvbihpdGVtKTtcbiAgICBpZiAoIW5vT3ZlcnJpZGUpIHtcbiAgICAgIGxldCBvbGQgPSB0aGlzW2FjdGlvbi5uYW1lXTtcbiAgICAgIGlmIChvbGQpIHRoaXMucmVtb3ZlQWN0aW9uKG9sZCk7XG4gICAgICB0aGlzLmFsbC5wdXNoKGFjdGlvbik7XG4gICAgICB0aGlzW2FjdGlvbi5uYW1lXSA9IGFjdGlvbi5ydW4uYmluZChhY3Rpb24pO1xuICAgIH1cblxuICAgIHJldHVybiBhY3Rpb247XG4gIH1cblxuICByZW1vdmVBY3Rpb24oaXRlbSkge1xuICAgIGNvbnN0IGFjdGlvbiA9IHRoaXMuZGV0ZWN0QWN0aW9uKGl0ZW0sIHRydWUpO1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5hbGwuaW5kZXhPZihhY3Rpb24pO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHRoaXMuYWxsLnNwbGljZShpbmRleCwgMSk7XG4gICAgZGVsZXRlIHRoaXNbYWN0aW9uLm5hbWVdO1xuICB9XG5cbiAgYWRkU3RvcmUoc3RvcmUpIHtcbiAgICB0aGlzLmFsbC5mb3JFYWNoKGFjdGlvbiA9PiBhY3Rpb24uYWRkU3RvcmUoc3RvcmUpKTtcbiAgfVxuXG4gIGRldGVjdEFjdGlvbihhY3Rpb24sIGlzT2xkKSB7XG4gICAgaWYgKGFjdGlvbi5jb25zdHJ1Y3RvciA9PT0gQWN0aW9uKSB7XG4gICAgICByZXR1cm4gYWN0aW9uO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiAoaXNPbGQpID8gdGhpc1thY3Rpb25dIDogbmV3IEFjdGlvbih7bmFtZTogYWN0aW9ufSk7XG4gICAgfVxuICB9XG59XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5cInVzZSBzdHJpY3RcIjtcblxudmFyIF9pbnRlcm9wUmVxdWlyZSA9IGZ1bmN0aW9uIChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9ialtcImRlZmF1bHRcIl0gOiBvYmo7IH07XG5cbmV4cG9ydHMuY3JlYXRlVmlldyA9IGNyZWF0ZVZpZXc7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHtcbiAgdmFsdWU6IHRydWVcbn0pO1xuXG52YXIgUmVhY3QgPSBfaW50ZXJvcFJlcXVpcmUoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0J10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdCddIDogbnVsbCkpO1xuXG52YXIgUmVhY3RSb3V0ZXIgPSBfaW50ZXJvcFJlcXVpcmUoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JlYWN0Um91dGVyJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydSZWFjdFJvdXRlciddIDogbnVsbCkpO1xuXG5mdW5jdGlvbiBnZXRSb3V0ZXIoKSB7XG4gIHZhciBSb3V0ZXIgPSB7fTtcbiAgaWYgKHR5cGVvZiBSZWFjdFJvdXRlciAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciByb3V0ZXJFbGVtZW50cyA9IFtcIlJvdXRlXCIsIFwiRGVmYXVsdFJvdXRlXCIsIFwiUm91dGVIYW5kbGVyXCIsIFwiQWN0aXZlSGFuZGxlclwiLCBcIk5vdEZvdW5kUm91dGVcIiwgXCJMaW5rXCIsIFwiUmVkaXJlY3RcIl0sXG4gICAgICAgIHJvdXRlck1peGlucyA9IFtcIk5hdmlnYXRpb25cIiwgXCJTdGF0ZVwiXSxcbiAgICAgICAgcm91dGVyRnVuY3Rpb25zID0gW1wiY3JlYXRlXCIsIFwiY3JlYXRlRGVmYXVsdFJvdXRlXCIsIFwiY3JlYXRlTm90Rm91bmRSb3V0ZVwiLCBcImNyZWF0ZVJlZGlyZWN0XCIsIFwiY3JlYXRlUm91dGVcIiwgXCJjcmVhdGVSb3V0ZXNGcm9tUmVhY3RDaGlsZHJlblwiLCBcInJ1blwiXSxcbiAgICAgICAgcm91dGVyT2JqZWN0cyA9IFtcIkhhc2hMb2NhdGlvblwiLCBcIkhpc3RvcnlcIiwgXCJIaXN0b3J5TG9jYXRpb25cIiwgXCJSZWZyZXNoTG9jYXRpb25cIiwgXCJTdGF0aWNMb2NhdGlvblwiLCBcIlRlc3RMb2NhdGlvblwiLCBcIkltaXRhdGVCcm93c2VyQmVoYXZpb3JcIiwgXCJTY3JvbGxUb1RvcEJlaGF2aW9yXCJdLFxuICAgICAgICBjb3BpZWRJdGVtcyA9IHJvdXRlck1peGlucy5jb25jYXQocm91dGVyRnVuY3Rpb25zKS5jb25jYXQocm91dGVyT2JqZWN0cyk7XG5cbiAgICByb3V0ZXJFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICBSb3V0ZXJbbmFtZV0gPSBSZWFjdC5jcmVhdGVFbGVtZW50LmJpbmQoUmVhY3QsIFJlYWN0Um91dGVyW25hbWVdKTtcbiAgICB9KTtcblxuICAgIGNvcGllZEl0ZW1zLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgIFJvdXRlcltuYW1lXSA9IFJlYWN0Um91dGVyW25hbWVdO1xuICAgIH0pO1xuICB9XG4gIHJldHVybiBSb3V0ZXI7XG59XG5cbmZ1bmN0aW9uIGdldERPTSgpIHtcbiAgdmFyIERPTUhlbHBlcnMgPSB7fTtcblxuICBpZiAodHlwZW9mIFJlYWN0ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgdmFyIHRhZyA9IGZ1bmN0aW9uIHRhZyhuYW1lKSB7XG4gICAgICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgYXJncyA9IEFycmF5KF9sZW4gPiAxID8gX2xlbiAtIDEgOiAwKSwgX2tleSA9IDE7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICAgICAgYXJnc1tfa2V5IC0gMV0gPSBhcmd1bWVudHNbX2tleV07XG4gICAgICB9XG5cbiAgICAgIHZhciBhdHRyaWJ1dGVzID0gdW5kZWZpbmVkO1xuICAgICAgdmFyIGZpcnN0ID0gYXJnc1swXSAmJiBhcmdzWzBdLmNvbnN0cnVjdG9yO1xuICAgICAgaWYgKGZpcnN0ID09PSBPYmplY3QpIHtcbiAgICAgICAgYXR0cmlidXRlcyA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGF0dHJpYnV0ZXMgPSB7fTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBSZWFjdC5ET01bbmFtZV0uYXBwbHkoUmVhY3QuRE9NLCBbYXR0cmlidXRlc10uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgdGFnTmFtZSBpbiBSZWFjdC5ET00pIHtcbiAgICAgIERPTUhlbHBlcnNbdGFnTmFtZV0gPSB0YWcuYmluZCh0aGlzLCB0YWdOYW1lKTtcbiAgICB9XG5cbiAgICBET01IZWxwZXJzLnNwYWNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIFJlYWN0LkRPTS5zcGFuKHtcbiAgICAgICAgZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw6IHtcbiAgICAgICAgICBfX2h0bWw6IFwiJm5ic3A7XCJcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gRE9NSGVscGVycztcbn1cblxudmFyIFJvdXRlciA9IGdldFJvdXRlcigpO1xuZXhwb3J0cy5Sb3V0ZXIgPSBSb3V0ZXI7XG52YXIgRE9NID0gZ2V0RE9NKCk7XG5cbmV4cG9ydHMuRE9NID0gRE9NO1xuXG5mdW5jdGlvbiBjcmVhdGVWaWV3KGNsYXNzQXJncykge1xuICB2YXIgUmVhY3RDbGFzcyA9IFJlYWN0LmNyZWF0ZUNsYXNzKGNsYXNzQXJncyk7XG4gIHZhciBSZWFjdEVsZW1lbnQgPSBSZWFjdC5jcmVhdGVFbGVtZW50LmJpbmQoUmVhY3QuY3JlYXRlRWxlbWVudCwgUmVhY3RDbGFzcyk7XG4gIHJldHVybiBSZWFjdEVsZW1lbnQ7XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSWk5b2IyMWxMMk5vY21sekwyTnZaR1V2WlhocGJTOXpjbU12UkU5TlNHVnNjR1Z5Y3k1cWN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaU96czdPenRSUVhkRVowSXNWVUZCVlN4SFFVRldMRlZCUVZVN096czdPMGxCZUVSdVFpeExRVUZMTERKQ1FVRk5MRTlCUVU4N08wbEJRMnhDTEZkQlFWY3NNa0pCUVUwc1kwRkJZenM3UVVGRmRFTXNVMEZCVXl4VFFVRlRMRWRCUVVrN1FVRkRjRUlzVFVGQlRTeE5RVUZOTEVkQlFVY3NSVUZCUlN4RFFVRkRPMEZCUTJ4Q0xFMUJRVWtzVDBGQlR5eFhRVUZYTEV0QlFVc3NWMEZCVnl4RlFVRkZPMEZCUTNSRExGRkJRVWtzWTBGQll5eEhRVUZITEVOQlFVTXNUMEZCVHl4RlFVRkZMR05CUVdNc1JVRkJSU3hqUVVGakxFVkJRVVVzWlVGQlpTeEZRVUZGTEdWQlFXVXNSVUZCUlN4TlFVRk5MRVZCUVVVc1ZVRkJWU3hEUVVGRE8xRkJRM0JJTEZsQlFWa3NSMEZCUnl4RFFVRkRMRmxCUVZrc1JVRkJSU3hQUVVGUExFTkJRVU03VVVGRGRFTXNaVUZCWlN4SFFVRkhMRU5CUVVNc1VVRkJVU3hGUVVGRkxHOUNRVUZ2UWl4RlFVRkZMSEZDUVVGeFFpeEZRVUZGTEdkQ1FVRm5RaXhGUVVGRkxHRkJRV0VzUlVGQlJTd3JRa0ZCSzBJc1JVRkJSU3hMUVVGTExFTkJRVU03VVVGRGJFb3NZVUZCWVN4SFFVRkhMRU5CUVVNc1kwRkJZeXhGUVVGRkxGTkJRVk1zUlVGQlJTeHBRa0ZCYVVJc1JVRkJSU3hwUWtGQmFVSXNSVUZCUlN4blFrRkJaMElzUlVGQlJTeGpRVUZqTEVWQlFVVXNkMEpCUVhkQ0xFVkJRVVVzY1VKQlFYRkNMRU5CUVVNN1VVRkRjRXNzVjBGQlZ5eEhRVUZITEZsQlFWa3NRMEZCUXl4TlFVRk5MRU5CUVVNc1pVRkJaU3hEUVVGRExFTkJRVU1zVFVGQlRTeERRVUZETEdGQlFXRXNRMEZCUXl4RFFVRkRPenRCUVVWNlJTeHJRa0ZCWXl4RFFVRkRMRTlCUVU4c1EwRkJReXhWUVVGVExFbEJRVWtzUlVGQlJUdEJRVU53UXl4WlFVRk5MRU5CUVVNc1NVRkJTU3hEUVVGRExFZEJRVWNzUzBGQlN5eERRVUZETEdGQlFXRXNRMEZCUXl4SlFVRkpMRU5CUVVNc1MwRkJTeXhGUVVGRkxGZEJRVmNzUTBGQlF5eEpRVUZKTEVOQlFVTXNRMEZCUXl4RFFVRkRPMHRCUTI1RkxFTkJRVU1zUTBGQlF6czdRVUZGU0N4bFFVRlhMRU5CUVVNc1QwRkJUeXhEUVVGRExGVkJRVk1zU1VGQlNTeEZRVUZGTzBGQlEycERMRmxCUVUwc1EwRkJReXhKUVVGSkxFTkJRVU1zUjBGQlJ5eFhRVUZYTEVOQlFVTXNTVUZCU1N4RFFVRkRMRU5CUVVNN1MwRkRiRU1zUTBGQlF5eERRVUZETzBkQlEwbzdRVUZEUkN4VFFVRlBMRTFCUVUwc1EwRkJRenREUVVObU96dEJRVVZFTEZOQlFWTXNUVUZCVFN4SFFVRkpPMEZCUTJwQ0xFMUJRVTBzVlVGQlZTeEhRVUZITEVWQlFVVXNRMEZCUXpzN1FVRkZkRUlzVFVGQlNTeFBRVUZQTEV0QlFVc3NTMEZCU3l4WFFVRlhMRVZCUVVVN1FVRkRhRU1zVVVGQlNTeEhRVUZITEVkQlFVY3NZVUZCVlN4SlFVRkpMRVZCUVZjN2QwTkJRVTRzU1VGQlNUdEJRVUZLTEZsQlFVazdPenRCUVVNdlFpeFZRVUZKTEZWQlFWVXNXVUZCUVN4RFFVRkRPMEZCUTJZc1ZVRkJTU3hMUVVGTExFZEJRVWNzU1VGQlNTeERRVUZETEVOQlFVTXNRMEZCUXl4SlFVRkpMRWxCUVVrc1EwRkJReXhEUVVGRExFTkJRVU1zUTBGQlF5eFhRVUZYTEVOQlFVTTdRVUZETTBNc1ZVRkJTU3hMUVVGTExFdEJRVXNzVFVGQlRTeEZRVUZGTzBGQlEzQkNMR3RDUVVGVkxFZEJRVWNzU1VGQlNTeERRVUZETEV0QlFVc3NSVUZCUlN4RFFVRkRPMDlCUXpOQ0xFMUJRVTA3UVVGRFRDeHJRa0ZCVlN4SFFVRkhMRVZCUVVVc1EwRkJRenRQUVVOcVFqdEJRVU5FTEdGQlFVOHNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhKUVVGSkxFTkJRVU1zUTBGQlF5eExRVUZMTEVOQlFVTXNTMEZCU3l4RFFVRkRMRWRCUVVjc1JVRkJSU3hEUVVGRExGVkJRVlVzUTBGQlF5eERRVUZETEUxQlFVMHNRMEZCUXl4SlFVRkpMRU5CUVVNc1EwRkJReXhEUVVGRE8wdEJRM0JGTEVOQlFVTTdPMEZCUlVZc1UwRkJTeXhKUVVGSkxFOUJRVThzU1VGQlNTeExRVUZMTEVOQlFVTXNSMEZCUnl4RlFVRkZPMEZCUXpkQ0xHZENRVUZWTEVOQlFVTXNUMEZCVHl4RFFVRkRMRWRCUVVjc1IwRkJSeXhEUVVGRExFbEJRVWtzUTBGQlF5eEpRVUZKTEVWQlFVVXNUMEZCVHl4RFFVRkRMRU5CUVVNN1MwRkRMME03TzBGQlJVUXNZMEZCVlN4RFFVRkRMRXRCUVVzc1IwRkJSeXhaUVVGWE8wRkJRelZDTEdGQlFVOHNTMEZCU3l4RFFVRkRMRWRCUVVjc1EwRkJReXhKUVVGSkxFTkJRVU03UVVGRGNFSXNLMEpCUVhWQ0xFVkJRVVU3UVVGRGRrSXNaMEpCUVUwc1JVRkJSU3hSUVVGUk8xTkJRMnBDTzA5QlEwWXNRMEZCUXl4RFFVRkRPMHRCUTBvc1EwRkJRenRIUVVOSU8wRkJRMFFzVTBGQlR5eFZRVUZWTEVOQlFVTTdRMEZEYmtJN08wRkJSVTBzU1VGQlRTeE5RVUZOTEVkQlFVY3NVMEZCVXl4RlFVRkZMRU5CUVVNN1VVRkJja0lzVFVGQlRTeEhRVUZPTEUxQlFVMDdRVUZEV2l4SlFVRk5MRWRCUVVjc1IwRkJSeXhOUVVGTkxFVkJRVVVzUTBGQlF6czdVVUZCWml4SFFVRkhMRWRCUVVnc1IwRkJSenM3UVVGRlZDeFRRVUZUTEZWQlFWVXNRMEZCUlN4VFFVRlRMRVZCUVVVN1FVRkRja01zVFVGQlNTeFZRVUZWTEVkQlFVY3NTMEZCU3l4RFFVRkRMRmRCUVZjc1EwRkJReXhUUVVGVExFTkJRVU1zUTBGQlF6dEJRVU01UXl4TlFVRkpMRmxCUVZrc1IwRkJSeXhMUVVGTExFTkJRVU1zWVVGQllTeERRVUZETEVsQlFVa3NRMEZCUXl4TFFVRkxMRU5CUVVNc1lVRkJZU3hGUVVGRkxGVkJRVlVzUTBGQlF5eERRVUZETzBGQlF6ZEZMRk5CUVU4c1dVRkJXU3hEUVVGRE8wTkJRM0pDSWl3aVptbHNaU0k2SW1kbGJtVnlZWFJsWkM1cWN5SXNJbk52ZFhKalpWSnZiM1FpT2lJaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SnBiWEJ2Y25RZ1VtVmhZM1FnWm5KdmJTQW5jbVZoWTNRbk8xeHVhVzF3YjNKMElGSmxZV04wVW05MWRHVnlJR1p5YjIwZ0ozSmxZV04wTFhKdmRYUmxjaWM3WEc1Y2JtWjFibU4wYVc5dUlHZGxkRkp2ZFhSbGNpQW9LU0I3WEc0Z0lHTnZibk4wSUZKdmRYUmxjaUE5SUh0OU8xeHVJQ0JwWmlBb2RIbHdaVzltSUZKbFlXTjBVbTkxZEdWeUlDRTlQU0FuZFc1a1pXWnBibVZrSnlrZ2UxeHVJQ0FnSUd4bGRDQnliM1YwWlhKRmJHVnRaVzUwY3lBOUlGc25VbTkxZEdVbkxDQW5SR1ZtWVhWc2RGSnZkWFJsSnl3Z0oxSnZkWFJsU0dGdVpHeGxjaWNzSUNkQlkzUnBkbVZJWVc1a2JHVnlKeXdnSjA1dmRFWnZkVzVrVW05MWRHVW5MQ0FuVEdsdWF5Y3NJQ2RTWldScGNtVmpkQ2RkTEZ4dUlDQWdJSEp2ZFhSbGNrMXBlR2x1Y3lBOUlGc25UbUYyYVdkaGRHbHZiaWNzSUNkVGRHRjBaU2RkTEZ4dUlDQWdJSEp2ZFhSbGNrWjFibU4wYVc5dWN5QTlJRnNuWTNKbFlYUmxKeXdnSjJOeVpXRjBaVVJsWm1GMWJIUlNiM1YwWlNjc0lDZGpjbVZoZEdWT2IzUkdiM1Z1WkZKdmRYUmxKeXdnSjJOeVpXRjBaVkpsWkdseVpXTjBKeXdnSjJOeVpXRjBaVkp2ZFhSbEp5d2dKMk55WldGMFpWSnZkWFJsYzBaeWIyMVNaV0ZqZEVOb2FXeGtjbVZ1Snl3Z0ozSjFiaWRkTEZ4dUlDQWdJSEp2ZFhSbGNrOWlhbVZqZEhNZ1BTQmJKMGhoYzJoTWIyTmhkR2x2Ymljc0lDZElhWE4wYjNKNUp5d2dKMGhwYzNSdmNubE1iMk5oZEdsdmJpY3NJQ2RTWldaeVpYTm9URzlqWVhScGIyNG5MQ0FuVTNSaGRHbGpURzlqWVhScGIyNG5MQ0FuVkdWemRFeHZZMkYwYVc5dUp5d2dKMGx0YVhSaGRHVkNjbTkzYzJWeVFtVm9ZWFpwYjNJbkxDQW5VMk55YjJ4c1ZHOVViM0JDWldoaGRtbHZjaWRkTEZ4dUlDQWdJR052Y0dsbFpFbDBaVzF6SUQwZ2NtOTFkR1Z5VFdsNGFXNXpMbU52Ym1OaGRDaHliM1YwWlhKR2RXNWpkR2x2Ym5NcExtTnZibU5oZENoeWIzVjBaWEpQWW1wbFkzUnpLVHRjYmx4dUlDQWdJSEp2ZFhSbGNrVnNaVzFsYm5SekxtWnZja1ZoWTJnb1puVnVZM1JwYjI0b2JtRnRaU2tnZTF4dUlDQWdJQ0FnVW05MWRHVnlXMjVoYldWZElEMGdVbVZoWTNRdVkzSmxZWFJsUld4bGJXVnVkQzVpYVc1a0tGSmxZV04wTENCU1pXRmpkRkp2ZFhSbGNsdHVZVzFsWFNrN1hHNGdJQ0FnZlNrN1hHNWNiaUFnSUNCamIzQnBaV1JKZEdWdGN5NW1iM0pGWVdOb0tHWjFibU4wYVc5dUtHNWhiV1VwSUh0Y2JpQWdJQ0FnSUZKdmRYUmxjbHR1WVcxbFhTQTlJRkpsWVdOMFVtOTFkR1Z5VzI1aGJXVmRPMXh1SUNBZ0lIMHBPMXh1SUNCOVhHNGdJSEpsZEhWeWJpQlNiM1YwWlhJN1hHNTlYRzVjYm1aMWJtTjBhVzl1SUdkbGRFUlBUU0FvS1NCN1hHNGdJR052Ym5OMElFUlBUVWhsYkhCbGNuTWdQU0I3ZlR0Y2JseHVJQ0JwWmlBb2RIbHdaVzltSUZKbFlXTjBJQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5a2dlMXh1SUNBZ0lHeGxkQ0IwWVdjZ1BTQm1kVzVqZEdsdmJpQW9ibUZ0WlN3Z0xpNHVZWEpuY3lrZ2UxeHVJQ0FnSUNBZ2JHVjBJR0YwZEhKcFluVjBaWE03WEc0Z0lDQWdJQ0JzWlhRZ1ptbHljM1FnUFNCaGNtZHpXekJkSUNZbUlHRnlaM05iTUYwdVkyOXVjM1J5ZFdOMGIzSTdYRzRnSUNBZ0lDQnBaaUFvWm1seWMzUWdQVDA5SUU5aWFtVmpkQ2tnZTF4dUlDQWdJQ0FnSUNCaGRIUnlhV0oxZEdWeklEMGdZWEpuY3k1emFHbG1kQ2dwTzF4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnWVhSMGNtbGlkWFJsY3lBOUlIdDlPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdjbVYwZFhKdUlGSmxZV04wTGtSUFRWdHVZVzFsWFM1aGNIQnNlU2hTWldGamRDNUVUMDBzSUZ0aGRIUnlhV0oxZEdWelhTNWpiMjVqWVhRb1lYSm5jeWtwTzF4dUlDQWdJSDA3WEc1Y2JpQWdJQ0JtYjNJZ0tHeGxkQ0IwWVdkT1lXMWxJR2x1SUZKbFlXTjBMa1JQVFNrZ2UxeHVJQ0FnSUNBZ1JFOU5TR1ZzY0dWeWMxdDBZV2RPWVcxbFhTQTlJSFJoWnk1aWFXNWtLSFJvYVhNc0lIUmhaMDVoYldVcE8xeHVJQ0FnSUgxY2JseHVJQ0FnSUVSUFRVaGxiSEJsY25NdWMzQmhZMlVnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCU1pXRmpkQzVFVDAwdWMzQmhiaWg3WEc0Z0lDQWdJQ0FnSUdSaGJtZGxjbTkxYzJ4NVUyVjBTVzV1WlhKSVZFMU1PaUI3WEc0Z0lDQWdJQ0FnSUNBZ1gxOW9kRzFzT2lBbkptNWljM0E3SjF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOUtUdGNiaUFnSUNCOU8xeHVJQ0I5WEc0Z0lISmxkSFZ5YmlCRVQwMUlaV3h3WlhKek8xeHVmVnh1WEc1bGVIQnZjblFnWTI5dWMzUWdVbTkxZEdWeUlEMGdaMlYwVW05MWRHVnlLQ2s3WEc1bGVIQnZjblFnWTI5dWMzUWdSRTlOSUQwZ1oyVjBSRTlOS0NrN1hHNWNibVY0Y0c5eWRDQm1kVzVqZEdsdmJpQmpjbVZoZEdWV2FXVjNJQ2hqYkdGemMwRnlaM01wSUh0Y2JpQWdiR1YwSUZKbFlXTjBRMnhoYzNNZ1BTQlNaV0ZqZEM1amNtVmhkR1ZEYkdGemN5aGpiR0Z6YzBGeVozTXBPMXh1SUNCc1pYUWdVbVZoWTNSRmJHVnRaVzUwSUQwZ1VtVmhZM1F1WTNKbFlYUmxSV3hsYldWdWRDNWlhVzVrS0ZKbFlXTjBMbU55WldGMFpVVnNaVzFsYm5Rc0lGSmxZV04wUTJ4aGMzTXBPMXh1SUNCeVpYUjFjbTRnVW1WaFkzUkZiR1Z0Wlc1ME8xeHVmVnh1SWwxOSIsImltcG9ydCB7QWN0aW9uc30gZnJvbSAnLi9BY3Rpb25zJztcbmltcG9ydCB1dGlscyBmcm9tICcuL3V0aWxzJztcbmltcG9ydCBGcmVlemVyIGZyb20gJ2ZyZWV6ZXItanMnO1xuaW1wb3J0IGdldENvbm5lY3RNaXhpbiBmcm9tICcuL21peGlucy9jb25uZWN0JztcblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdG9yZSB7XG4gIGNvbnN0cnVjdG9yKGFyZ3M9e30pIHtcbiAgICBsZXQge2FjdGlvbnMsIGluaXRpYWx9ID0gYXJncztcbiAgICBsZXQgaW5pdCA9IHR5cGVvZiBpbml0aWFsID09PSAnZnVuY3Rpb24nID8gaW5pdGlhbCgpIDogaW5pdGlhbDtcbiAgICBsZXQgc3RvcmUgPSBuZXcgRnJlZXplcihpbml0KTtcblxuICAgIHRoaXMuY29ubmVjdCA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICByZXR1cm4gZ2V0Q29ubmVjdE1peGluKHRoaXMsIGFyZ3MuY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuXG4gICAgdGhpcy5oYW5kbGVycyA9IGFyZ3MuaGFuZGxlcnMgfHwgdXRpbHMuZ2V0V2l0aG91dEZpZWxkcyhbJ2FjdGlvbnMnXSwgYXJncykgfHwge307XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShhY3Rpb25zKSkge1xuICAgICAgdGhpcy5hY3Rpb25zID0gYWN0aW9ucyA9IG5ldyBBY3Rpb25zKGFjdGlvbnMpO1xuICAgICAgdGhpcy5hY3Rpb25zLmFkZFN0b3JlKHRoaXMpO1xuICAgIH1cblxuICAgIGNvbnN0IHNldCA9IGZ1bmN0aW9uIChpdGVtLCB2YWx1ZSkge1xuICAgICAgc3RvcmUuZ2V0KCkuc2V0KGl0ZW0sIHZhbHVlKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZ2V0ID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiBzdG9yZS5nZXQoaXRlbSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHJlc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgc3RvcmUuc2V0KGluaXQpO1xuICAgIH07XG5cbiAgICB0aGlzLnNldCA9IHNldDtcbiAgICB0aGlzLmdldCA9IGdldDtcbiAgICB0aGlzLnJlc2V0ID0gcmVzZXQ7XG5cbiAgICB0aGlzLnN0YXRlUHJvdG8gPSB7c2V0LCBnZXQsIHJlc2V0LCBhY3Rpb25zfTtcbiAgICAvL3RoaXMuZ2V0dGVyID0gbmV3IEdldHRlcih0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGFkZEFjdGlvbihpdGVtKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgIHRoaXMuYWN0aW9ucyA9IHRoaXMuYWN0aW9ucy5jb25jYXQodGhpcy5hY3Rpb25zKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgdGhpcy5hY3Rpb25zLnB1c2goaXRlbSk7XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlQWN0aW9uKGl0ZW0pIHtcbiAgICB2YXIgYWN0aW9uO1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGFjdGlvbiA9IHRoaXMuZmluZEJ5TmFtZSgnYWN0aW9ucycsICduYW1lJywgaXRlbSk7XG4gICAgICBpZiAoYWN0aW9uKSBhY3Rpb24ucmVtb3ZlU3RvcmUodGhpcyk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGFjdGlvbiA9IGl0ZW07XG4gICAgICBsZXQgaW5kZXggPSB0aGlzLmFjdGlvbnMuaW5kZXhPZihhY3Rpb24pO1xuICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICBhY3Rpb24ucmVtb3ZlU3RvcmUodGhpcyk7XG4gICAgICAgIHRoaXMuYWN0aW9ucyA9IHRoaXMuYWN0aW9ucy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldEFjdGlvbkN5Y2xlKGFjdGlvbk5hbWUsIHByZWZpeD0nb24nKSB7XG4gICAgY29uc3QgY2FwaXRhbGl6ZWQgPSB1dGlscy5jYXBpdGFsaXplKGFjdGlvbk5hbWUpO1xuICAgIGNvbnN0IGZ1bGxBY3Rpb25OYW1lID0gYCR7cHJlZml4fSR7Y2FwaXRhbGl6ZWR9YDtcbiAgICBjb25zdCBoYW5kbGVyID0gdGhpcy5oYW5kbGVyc1tmdWxsQWN0aW9uTmFtZV0gfHwgdGhpcy5oYW5kbGVyc1thY3Rpb25OYW1lXTtcbiAgICBpZiAoIWhhbmRsZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gaGFuZGxlcnMgZm9yICR7YWN0aW9uTmFtZX0gYWN0aW9uIGRlZmluZWQgaW4gY3VycmVudCBzdG9yZWApO1xuICAgIH1cblxuICAgIGxldCBhY3Rpb25zO1xuICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGFjdGlvbnMgPSBoYW5kbGVyO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGhhbmRsZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGFjdGlvbnMgPSB7b246IGhhbmRsZXJ9O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7aGFuZGxlcn0gbXVzdCBiZSBhbiBvYmplY3Qgb3IgZnVuY3Rpb25gKTtcbiAgICB9XG4gICAgcmV0dXJuIGFjdGlvbnM7XG4gIH1cblxuICAvLyAxLiB3aWxsKGluaXRpYWwpID0+IHdpbGxSZXN1bHRcbiAgLy8gMi4gd2hpbGUodHJ1ZSlcbiAgLy8gMy4gb24od2lsbFJlc3VsdCB8fCBpbml0aWFsKSA9PiBvblJlc3VsdFxuICAvLyA0LiB3aGlsZShmYWxzZSlcbiAgLy8gNS4gZGlkKG9uUmVzdWx0KVxuICBydW5DeWNsZShhY3Rpb25OYW1lLCAuLi5hcmdzKSB7XG4gICAgLy8gbmV3IFByb21pc2UocmVzb2x2ZSA9PiByZXNvbHZlKHRydWUpKVxuICAgIGNvbnN0IGN5Y2xlID0gdGhpcy5nZXRBY3Rpb25DeWNsZShhY3Rpb25OYW1lKTtcbiAgICBsZXQgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuICAgIGxldCB3aWxsID0gY3ljbGUud2lsbCwgd2hpbGVfID0gY3ljbGUud2hpbGUsIG9uXyA9IGN5Y2xlLm9uO1xuICAgIGxldCBkaWQgPSBjeWNsZS5kaWQsIGRpZE5vdCA9IGN5Y2xlLmRpZE5vdDtcblxuICAgIC8vIExvY2FsIHN0YXRlIGZvciB0aGlzIGN5Y2xlLlxuICAgIGxldCBzdGF0ZSA9IE9iamVjdC5jcmVhdGUodGhpcy5zdGF0ZVByb3RvKTtcblxuICAgIC8vIFByZS1jaGVjayAmIHByZXBhcmF0aW9ucy5cbiAgICBpZiAod2lsbCkgcHJvbWlzZSA9IHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICByZXR1cm4gd2lsbC5hcHBseShzdGF0ZSwgYXJncyk7XG4gICAgfSk7XG5cbiAgICAvLyBTdGFydCB3aGlsZSgpLlxuICAgIGlmICh3aGlsZV8pIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKHdpbGxSZXN1bHQpID0+IHtcbiAgICAgIHdoaWxlXy5jYWxsKHN0YXRlLCB0cnVlKTtcbiAgICAgIHJldHVybiB3aWxsUmVzdWx0O1xuICAgIH0pO1xuXG4gICAgLy8gQWN0dWFsIGV4ZWN1dGlvbi5cbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKCh3aWxsUmVzdWx0KSA9PiB7XG4gICAgICBpZiAod2lsbFJlc3VsdCA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBvbl8uYXBwbHkoc3RhdGUsIGFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG9uXy5jYWxsKHN0YXRlLCB3aWxsUmVzdWx0KTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFN0b3Agd2hpbGUoKS5cbiAgICBpZiAod2hpbGVfKSBwcm9taXNlID0gcHJvbWlzZS50aGVuKChvblJlc3VsdCkgPT4ge1xuICAgICAgd2hpbGVfLmNhbGwoc3RhdGUsIGZhbHNlKTtcbiAgICAgIHJldHVybiBvblJlc3VsdDtcbiAgICB9KTtcblxuICAgIC8vIEZvciBkaWQgYW5kIGRpZE5vdCBzdGF0ZSBpcyBmcmVlemVkLlxuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oKG9uUmVzdWx0KSA9PiB7XG4gICAgICBPYmplY3QuZnJlZXplKHN0YXRlKTtcbiAgICAgIHJldHVybiBvblJlc3VsdDtcbiAgICB9KTtcblxuICAgIC8vIEhhbmRsZSB0aGUgcmVzdWx0LlxuICAgIGlmIChkaWQpIHByb21pc2UgPSBwcm9taXNlLnRoZW4ob25SZXN1bHQgPT4ge1xuICAgICAgcmV0dXJuIGRpZC5jYWxsKHN0YXRlLCBvblJlc3VsdCk7XG4gICAgfSk7XG5cbiAgICBwcm9taXNlLmNhdGNoKGVycm9yID0+IHtcbiAgICAgIGlmICh3aGlsZV8pIHdoaWxlXy5jYWxsKHRoaXMsIHN0YXRlLCBmYWxzZSk7XG4gICAgICBpZiAoZGlkTm90KSB7XG4gICAgICAgIGRpZE5vdC5jYWxsKHN0YXRlLCBlcnJvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG59XG4iLCJleHBvcnQgZGVmYXVsdCB7XG4gIGN4OiBmdW5jdGlvbiAoY2xhc3NOYW1lcykge1xuICAgIGlmICh0eXBlb2YgY2xhc3NOYW1lcyA9PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGNsYXNzTmFtZXMpLmZpbHRlcihmdW5jdGlvbihjbGFzc05hbWUpIHtcbiAgICAgICAgcmV0dXJuIGNsYXNzTmFtZXNbY2xhc3NOYW1lXTtcbiAgICAgIH0pLmpvaW4oJyAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5qb2luLmNhbGwoYXJndW1lbnRzLCAnICcpO1xuICAgIH1cbiAgfVxufTtcbiIsImV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGdldENvbm5lY3RNaXhpbiAoc3RvcmUpIHtcbiAgbGV0IGNoYW5nZUNhbGxiYWNrID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgdGhpcy5zZXRTdGF0ZShzdGF0ZSk7XG4gIH07XG5cbiAgbGV0IGxpc3RlbmVyO1xuXG4gIHJldHVybiB7XG4gICAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCBzdGF0ZSA9IHN0b3JlLmdldChhcmd1bWVudHMpO1xuICAgICAgbGlzdGVuZXIgPSBzdGF0ZS5nZXRMaXN0ZW5lcigpO1xuICAgICAgY2hhbmdlQ2FsbGJhY2sgPSBjaGFuZ2VDYWxsYmFjay5iaW5kKHRoaXMpO1xuICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH0sXG5cbiAgICBjb21wb25lbnREaWRNb3VudDogZnVuY3Rpb24gKCkge1xuICAgICAgbGlzdGVuZXIub24oJ3VwZGF0ZScsIGNoYW5nZUNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgY29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGxpc3RlbmVyLm9mZigndXBkYXRlJywgY2hhbmdlQ2FsbGJhY2spO1xuICAgIH1cbiAgfTtcbn1cbiIsImNvbnN0IHV0aWxzID0ge307XG5cbnV0aWxzLmdldFdpdGhvdXRGaWVsZHMgPSBmdW5jdGlvbiAob3V0Y2FzdCwgdGFyZ2V0KSB7XG4gIGlmICghdGFyZ2V0KSB0aHJvdyBuZXcgRXJyb3IoJ1R5cGVFcnJvcjogdGFyZ2V0IGlzIG5vdCBhbiBvYmplY3QuJyk7XG4gIHZhciByZXN1bHQgPSB7fTtcbiAgaWYgKHR5cGVvZiBvdXRjYXN0ID09PSAnc3RyaW5nJykgb3V0Y2FzdCA9IFtvdXRjYXN0XTtcbiAgdmFyIHRLZXlzID0gT2JqZWN0LmtleXModGFyZ2V0KTtcbiAgb3V0Y2FzdC5mb3JFYWNoKGZ1bmN0aW9uKGZpZWxkTmFtZSkge1xuICAgIHRLZXlzXG4gICAgICAuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICByZXR1cm4ga2V5ICE9PSBmaWVsZE5hbWU7XG4gICAgICB9KVxuICAgICAgLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gdGFyZ2V0W2tleV07XG4gICAgICB9KTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG51dGlscy5vYmplY3RUb0FycmF5ID0gZnVuY3Rpb24gKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0KS5tYXAoa2V5ID0+IG9iamVjdFtrZXldKTtcbn07XG5cbnV0aWxzLmNsYXNzV2l0aEFyZ3MgPSBmdW5jdGlvbiAoSXRlbSwgYXJncykge1xuICByZXR1cm4gSXRlbS5iaW5kLmFwcGx5KEl0ZW0sW0l0ZW1dLmNvbmNhdChhcmdzKSk7XG59O1xuXG4vLyAxLiB3aWxsXG4vLyAyLiB3aGlsZSh0cnVlKVxuLy8gMy4gb25cbi8vIDQuIHdoaWxlKGZhbHNlKVxuLy8gNS4gZGlkIG9yIGRpZE5vdFxudXRpbHMubWFwQWN0aW9uTmFtZXMgPSBmdW5jdGlvbihvYmplY3QpIHtcbiAgY29uc3QgbGlzdCA9IFtdO1xuICBjb25zdCBwcmVmaXhlcyA9IFsnd2lsbCcsICd3aGlsZVN0YXJ0JywgJ29uJywgJ3doaWxlRW5kJywgJ2RpZCcsICdkaWROb3QnXTtcbiAgcHJlZml4ZXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICBsZXQgbmFtZSA9IGl0ZW07XG4gICAgaWYgKGl0ZW0gPT09ICd3aGlsZVN0YXJ0JyB8fCBpdGVtID09PSAnd2hpbGVFbmQnKSB7XG4gICAgICBuYW1lID0gJ3doaWxlJztcbiAgICB9XG4gICAgaWYgKG9iamVjdFtuYW1lXSkge1xuICAgICAgbGlzdC5wdXNoKFtpdGVtLCBvYmplY3RbbmFtZV1dKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gbGlzdDtcbn07XG5cbnV0aWxzLmlzT2JqZWN0ID0gZnVuY3Rpb24gKHRhcmcpIHtcbiAgcmV0dXJuIHRhcmcgPyB0YXJnLnRvU3RyaW5nKCkuc2xpY2UoOCwxNCkgPT09ICdPYmplY3QnIDogZmFsc2U7XG59O1xudXRpbHMuY2FwaXRhbGl6ZSA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgY29uc3QgZmlyc3QgPSBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCk7XG4gIGNvbnN0IHJlc3QgPSBzdHIuc2xpY2UoMSk7XG4gIHJldHVybiBgJHtmaXJzdH0ke3Jlc3R9YDtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHV0aWxzO1xuIl19
