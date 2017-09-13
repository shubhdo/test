var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var roomschema = new Schema({

	senderId: {
		type: String
	},
	
	receiverId: {
		type: String
	},
	createdAt: {
		type: Date,
		default: new Date()
	}
})

var Room = mongoose.model('room', roomschema,'room');

module.exports = Room;