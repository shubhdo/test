var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var chatSchema = new Schema({

	
	senderId: {
		type: String
	},
    roomId:{
		type:String
	},
	senderName :{
		type: String
	},
	
    receiverId: {
		type:String
	},
		
    receiverName: {
    	type: String
    },
    messageType:{
    	type:String
    },
    mediaType: {
        	type:String
        },
    media: [String],
 	
	message:{
		type: String
	},

	timeStamp:{
		type: Date
	}
});


module.exports = mongoose.model('chatHistory',chatSchema,'chatHistory');



