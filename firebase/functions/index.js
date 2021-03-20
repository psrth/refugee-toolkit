const functions = require("firebase-functions");
const express = require('express')
const app = express() 

const {signup, login, logout, uploadImage, addUserDetails, getUserData, googleSignIn } = require('./routers/users')
const auth = require('./utils/auth')

const db = require('./utils/admin')

app.post('/signup', signup)
app.post('/login', login)
app.post('/login/google', googleSignIn)
app.post('/logout', auth, logout)

app.post('/user/image', auth, uploadImage)
app.post('/user', auth, addUserDetails)
app.get('/user', auth, getUserData)

exports.api = functions.https.onRequest(app)