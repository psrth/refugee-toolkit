const { admin, db } = require("../utils/admin");

const config = require("../utils/config");



exports.globalChat = (req,res) =>{
    db.collection('globalChat').get().then((data)=>{
        let chat = []
        data.forEach((doc)=>{
            chat.push({
                globalChatId : doc.id,
                body : doc.data().body,
            })
        })
        return res.json(chat)
    }).catch((e)=>{
        console.error(e)
        res.status(500).json({error: e.code})
    })

}

exports.globalChat1 = (req,res) =>{
    let chatData = {}
    db.doc(`/globalChat/${req.params.globalChatId}`).get().then((doc)=>{
        if (!doc.exists){
            return res.status(404).json({error: 'this global chat is not enabled yet'})
        }
        chatData = doc.data()
        chatData.globalChatId = doc.id
        return db.collection('messages').orderBy('createdAt', 'desc').where('globalChatId', '==', req.params.globalChatId).get()
    }).then((data)=>{
        chatData.messages = []
        data.forEach((doc)=>{
            chatData.messages.push(doc.data())
        })
        return res.json(chatData)
    }).catch((e)=>{
        console.error(e)
        res.status(500).json({error: e.code})
    })
}

exports.messageGlobalChat = (req,res)=>{
    if(req.body.body.trim() === ''){
        return res.status(400).json({error:'Must not be empty'})
    }
    const newMessage = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        globalChatId: req.params.globalChatId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    }
    db.doc(`/globalChat/${req.params.globalChatId}`).get().then((doc)=>{
        if(!doc.exists){
            return res.status(404).json({error: 'GlobalChat not found'})
        }
        return db.collection('messages').add(newMessage)
    }).then(()=>{
        res.json(newMessage)
    }).catch((e)=>{
        console.log(e)
        res.status(500).json({error: 'something went wrong'})
    })
}