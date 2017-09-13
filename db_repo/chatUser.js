var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userschema = new Schema({

	
	userName: {
		type: String
	},
    userPic :{
	    type:String
	},
	userId : {
		type: String
	},
	deviceType:{
	    type:String
	},
	deviceToken : {
		type : String,
		default : null
	}
});

var chatUsers = mongoose.model('chatUsers', userschema,'chatUsers');

module.exports = chatUsers;
