var messageBuilder = require( '../message/message-builder' ),
	messageParser = require( '../message/message-parser' ),
	C = require( '../constants/constants' ),
	EventEmitter = require( 'component-emitter' );

/**
 * This class handles incoming and outgoing messages in relation
 * to deepstream events. It basically acts like an event-hub that's
 * replicated across all connected clients.
 *
 * @param {Object} options    deepstream options
 * @param {Connection} connection
 *
 * @public
 * @constructor
 */
var EventHandler = function( options, connection ) {
	this._options = options;
	this._connection = connection;
	this._emitter = new EventEmitter();
};

/**
 * Subscribe to an event. This will receive both locally emitted events
 * as well as events emitted by other connected clients.
 *
 * @param   {String}   eventName
 * @param   {Function} callback
 *
 * @public
 * @returns {void}
 */
EventHandler.prototype.subscribe = function( eventName, callback ) {
	if( !this._emitter.hasListeners( eventName ) ) {
		this._connection.sendMsg( C.TOPIC.EVENT, C.ACTIONS.SUBSCRIBE, [ eventName ] );
	}

	this._emitter.on( eventName, callback );
};

/**
 * Removes a callback for a specified event. If all callbacks
 * for an event have been removed, the server will be notified
 * that the client is unsubscribed as a listener
 *
 * @param   {String}   eventName
 * @param   {Function} callback
 *
 * @public
 * @returns {void}
 */
EventHandler.prototype.unsubscribe = function( eventName, callback ) {
	this._emitter.off( eventName, callback );
	
	if( !this._emitter.hasListeners( eventName ) ) {
		this._connection.sendMsg( C.TOPIC.EVENT, C.ACTIONS.UNSUBSCRIBE, [ eventName ] );
	}
};

/**
 * Emits an event locally and sends a message to the server to 
 * broadcast the event to the other connected clients
 *
 * @param   {String} name 
 * @param   {Mixed} data will be serialized and deserialized to its original type.
 *
 * @public
 * @returns {void}
 */
EventHandler.prototype.emit = function( name, data ) {
	this._connection.sendMsg( C.TOPIC.EVENT, C.ACTIONS.EVENT, [ name, messageBuilder.typed( data ) ] );
	this._emitter.emit( name, data );
};

/**
 * Handles incoming messages from the server
 *
 * @param   {Object} message parsed deepstream message
 *
 * @package privat
 * @returns {void}
 */
EventHandler.prototype._$handle = function( message ) {
	if( message.action === C.ACTIONS.EVENT ) {
		if( message.data && message.data.length === 2 ) {
			this._emitter.emit( message.data[ 0 ], messageParser.convertTyped( message.data[ 1 ] ) );
		} else {
			this._emitter.emit( message.data[ 0 ] );
		}
	}
};

module.exports = EventHandler;