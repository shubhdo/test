var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');
var waterfall = require('async-waterfall');
var ChatHistory = require('./db_repo/chatHistory.js');
var Room = require('./db_repo/room.js');
var User = require('./db_repo/chatUser.js');
var fs = require('fs');
var path = require('path');
var morgan = require('morgan')
var gcm = require('node-gcm')
var apn = require('apn');
var _ = require('underscore');
//var config = require('./config');

mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/chatSchema");

app.use(morgan('dev'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('chatFiles'));

/*var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'ducixxxyx', 
  api_key: '971481123293634', 
  api_secret: '_nCwcLXMZ2o6t_4zdpgtYSseaBU' 
});*/


var sockets = {};
var onlineUsers = {};
var apikey = "AAAAghx30-0:APA91bGARrZNjm6u3BFfLZWutuiJzp9yA6Nnpwy9NuMiicRwRmGRM3bBH-0WTHQc55gw88P_x5S2bIyGV6yU9upg9BANtwElZIm7mX1BZt0UTkXzfKCmhZLIrp-HSwJP7LBkTdFy1ekD";

io.sockets.on('connection', function (socket) {

    console.log("\x1b[31m", "connection created for Meal Deal");

    socket.on('initChat', function (data) {
        console.log("initChat created....." + JSON.stringify(data));

        User.find({userId: data.userId}, function (err, result) {
            console.log("result data of init chat--->" + result);
            if (result == null || result == "" || result == undefined) {
                var user = new User(data);
                user.save(function (err) {
                    if (err) return err;
                })
            } else {
                User.update({userId: data.userId}, {
                    $set: {

                        deviceToken: data.deviceToken,

                    }
                }, function (err, results) {
                    if (err) return err;
                    console.log("initChat>>>>", results);

                });
            }
        })

        sockets[socket.id] = {data: data, socket: socket};

        onlineUsers[data.userId] = {
            socketId: socket.id,
            userId: data.userId,
            userName: data.userName,
            status: "online"
        };

        console.log('Online Users---->' + JSON.stringify(onlineUsers));

    })


    socket.on('sendmessage', function (data) {
        var timeStamp = Date.now();
        var utcDate = new Date();
        console.log("chat data-------->" + JSON.stringify(data));
        var roomId = null;
        var query = {$or: [{$and: [{senderId: data.senderId}, {receiverId: data.receiverId}]}, {$and: [{senderId: data.receiverId}, {receiverId: data.senderId}]}]}
        Room.findOne(query, function (err, result) {
            if (result == null || result == "" || result == undefined) {

                var room = new Room({senderId: data.senderId, receiverId: data.receiverId});
                room.save(function (err, result) {
                    console.log("Room saved");
                    roomId = result._id;

                })
            } else {
                roomId = result._id;
            }
            var newChatData = new ChatHistory({
                messageType: data.messageType,
                message: data.message,
                roomId: roomId,
                senderId: data.senderId,
                senderName: data.senderName,
                receiverId: data.receiverId,
                receiverName: data.receiverName,
                timeStamp: timeStamp,
                mediaType: data.mediaType,
                media: data.imageURL

            })

            newChatData.save(function (error, result) {

                if (onlineUsers[data.receiverId] == undefined) {
                    console.log("qdatareceiverId>>>>" + data.receiverId)
                    User.findOne({userId: data.receiverId}, function (err, find_result) {
                        if (err) console.log("error", err);
                        if (find_result) {
                            if (data.deviceType=='Android') {
                                var sender = new gcm.Sender(apikey);
                                var message = new gcm.Message({
                                    data: {
                                        message: data.message
                                    }
                                })

                                var regTokens = [data.deviceToken]

                                sender.send(message, {registrationTokens: regTokens}, function (err, response) {
                                    if (err) console.error(err);
                                    else console.log(response);
                                })
                            }
                          /*  else if(data.deviceType=='iOS') {
                                var options = {
                                    token: {
                                        key: "",
                                        keyId: "",
                                        teamId: ""
                                    },
                                    production: false
                                };

                                var apnProvider = new apn.Provider(options);

                                var deviceToken=data.deviceToken;

                                var note=new apn.Notification()
                                note.payload({message:data.message})

                                apnProvider.send(note,deviceToken).then(function (result) {
                                    console.log(result)
                                })

                            }*/


                        }
                    })

                } else {
                    console.log("result", result)

                    sockets[onlineUsers[data.receiverId].socketId].socket.emit("receivemessage", result);
                }


            })


        })


    })
    socket.on('disconnect', function () {

        var socketId = socket.id;
        console.log("socket id in disconnected--" + socketId);
        console.log("socket id in disconnect111111111111111111111--" + sockets[socketId]);


        if (sockets[socketId] != undefined) {
            delete onlineUsers[sockets[socketId].data.userId];
            console.log(" users deleted" + JSON.stringify(onlineUsers));
        } else {
            console.log("not deleted-----");
        }

        console.log('connection disconnected---->' + socketId);
    })


})


app.post('/ChatHistory', function (req, res) {  //need receiverId, senderId, pageNumber


    var query = {$or: [{$and: [{senderId: req.body.senderId}, {receiverId: req.body.receiverId}]}, {$and: [{senderId: req.body.receiverId}, {receiverId: req.body.senderId}]}]}
    Room.findOne(query, function (err, result) {
        console.log("DAta for chat room id>???" + result);
        if (result == null) {
            console.log("result == null")
            res.send({
                responseCode: 402,
                responseMessage: "No chat history for this user.",
            })
        }
        else {
            ChatHistory.find({roomId: result._id}, function (error, success) {
                if (error) {
                    console.log("find1 error", error)
                    res.send({
                        responseCode: 500,
                        responseMessage: "Internal server error",
                    })
                }
                else {
                    console.log("find1 success", success);
                    if (success == null || success == "" || success == undefined) {
                        res.send("No message for this user");
                    }
                    else {
                        var lastLimit = success.length;
                        var pageNumber = req.body.pageNumber;
                        console.log("lenght of results " + lastLimit);

                        var max_page = parseInt((lastLimit) / 10);
                        max_page = lastLimit % 10 != 0 ? max_page + 1 : max_page;
                        console.log("maximum length====>>>" + max_page);
                        var a = (parseInt(req.body.pageNumber) - 1) * 10;
                        var query = ChatHistory.find({roomId: result._id}).sort({timeStamp: -1});
                        query.skip(a).limit(10).exec('find', function (err, items) {
                            console.log("find2 success", items)
                            res.send({
                                responseCode: 200,
                                responseMessage: "List found successfully",
                                pagination: {
                                    pageNumber: req.body.pageNumber,
                                    max_page: max_page
                                },
                                DataList: items
                            })
                        })
                    }
                }
            })

        }
    })

    /* Room.findOne(query, function (err, result) {
         console.log("DAta for chat room id>???" + result);
         if (result == null) {
             console.log("result == null")
             res.send({
                 responseCode: 402,
                 responseMessage: "No chat history for this user.",
             })
         } else {
             if (req.body.midDate) {
                 var startTime = new Date(parseInt(req.body.midDate)).toUTCString();
                 var query = {timeStamp: {$gte: startTime}}
             } else {
                 var query = {}
             }
             console.log("query" + query)
             Model.find(query, {'_id': 0}).exec(function (err, result) {

                 if (result == null || result == "" || result == undefined) {
                     res.send("No message for this user");
                 } else {
                     var lastLimit = result.length;
                     var pageNumber = req.body.pageNumber;
                     console.log("lenght of results " + lastLimit);

                     var max_page = parseInt((lastLimit) / 10);
                     max_page = lastLimit % 10 != 0 ? max_page + 1 : max_page;
                     console.log("maximum length====>>>" + max_page);
                     var a = (parseInt(req.body.pageNumber) - 1) * 10;
                     var query = Model.find().sort({timeStamp: -1});
                     query.skip(a).limit(10).exec('find', function (err, items) {
                         res.send({
                             responseCode: 200,
                             responseMessage: "List found successfully",
                             pagination: {
                                 pageNumber: req.body.pageNumber,
                                 max_page: max_page
                             },
                             DataList: items
                         })
                     })
                 }


             })
         }
     })*/
})


server.listen(8090, function () {
    console.log(' chat Server is listening on ', server.address().port);
});