const functions = require("firebase-functions");
const express = require('express')
const app = express() 

const {signup, login, logout, uploadImage, addUserDetails, getUserData, googleSignIn } = require('./routers/users')
const {globalChat, globalChat1, messageGlobalChat} = require('./routers/chat')

const auth = require('./utils/auth')

const db = require('./utils/admin')

app.post('/signup', signup)
app.post('/login', login)
app.post('/login/google', googleSignIn)
app.post('/logout', auth, logout)

app.post('/user/image', auth, uploadImage)
app.post('/user', auth, addUserDetails)
app.get('/user', auth, getUserData)

app.get('/globalChat', auth, globalChat) 
app.get('/globalChat/:globalChatId', auth, globalChat1) 
app.post('/globalChat/:globalChatId/message', auth, messageGlobalChat)

exports.api = functions.https.onRequest(app)

exports.createSOS = functions.firestore.document('sos/{id}').onCreate((snapshot)=>{
    return db.doc(`/users/`).get().then((docs)=>{
        if (docs.exists){
            return db.doc(`/sosSent/${snapshot.id}`).set({
                createdAt : new Date().toISOString(),
                recipient : docs.data(), //all users?
                sender: snapshot.data().userHandle,
                type: 'SOS',
                read: false
            })
        }
    }).then(()=>{
        return;
    }).catch((e)=>{
        console.error(e)
    })
})

