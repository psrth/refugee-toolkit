const { admin, db } = require("../utils/admin");

const config = require("../utils/config");


const firebase = require("firebase");
firebase.initializeApp(config);

const BusBoy = require('busboy')
const path = require('path')
const os = require('os')
const fs = require('fs')



const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails
} = require("../utils/validators");

//signup
exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

  const noImg = "no-img.png";

  let token, userId;
  db.doc(`/users/${newUser.handle}`).get().then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is already taken" });
      } else {
        return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    }).then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    }).then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    }).then(() => {
      return res.status(201).json({ token });
    }).catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already is use" });
      } else {
        return res.status(500).json({ general: "Something went wrong, please try again" });
      }
    });
};

// Log user in
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  firebase.auth().signInWithEmailAndPassword(user.email, user.password).then((data) => {
      return data.user.getIdToken();
    }).then((token) => {
      return res.json({ token });
    }).catch((err) => {
      console.error(err);
      return res.status(403).json({ general: "Wrong credentials, please try again" });
    });
};

//google sign in
exports.googleSignIn = () => {
  base_provider = new firebase.auth.GoogleAuthProvider() 
  firebase.auth.signInWithPopup(base_provider).then((result)=>{
    const credential = result.credential
    const token = credential.accessToken
    const user = result.user
    //TODO:add to db

    console.log('success')
  }).catch((e)=>{
    console.error(e)
  })
}

//logout
exports.logout = (req,res) => {
  firebase.auth().signOut().then(()=>{
  }).catch((e)=>{
    console.error(e)
    return res.status(500).json({error: 'some error occured. please try again later'})
  })
}

//add user detail
exports.addUserDetails = (req,res) => {
  let userDetails = reduceUserDetails(req.body)
  db.doc(`/users/${req.user.handle}`).update(userDetails).then(()=>{
    return res.json({message: 'details added succesfully'})
  }).catch((e)=>{
    console.error(e)
    return res.status(500).json({error: e.code})
  })
}

//get user(self) details
exports.getUserData = (req,res) => {
  let userData = {}
  db.doc(`/users/${req.user.handle}`).get().then((doc)=>{
    if(doc.exists){
      userData.credentials = doc.data()
      return db.collection('oops').where('userHandle', '==', req.user.handle).get() //how to return?
    }
  }).then((data)=>{
    userData.oops = []
    data.forEach((doc)=>{
      userData.oops.push(doc.data())
    })
    return res.json(userData)
  }).catch((e)=>{
    console.error(e)
    return res.status(500).json({error : e.code})
  })
}

//profile pic
exports.uploadImage = (req,res)=>{
  let imageFileName
  let imageToBeUploaded = {}  

  const busboy = new BusBoy({headers: req.headers})

  busboy.on('file', (fieldname, file, filename, encoding, mimetype)=>{
    if (mimetype !== 'img/jpeg' && mimetype !== 'image/png'){
      return res.status(400).json({error: 'wrong file type submitted'})
    }
    const imgExt = filename.split('.')[filename.split('.').length - 1]
    imageFileName = `${Math.round(Math.random()*1000000)}.${imgExt}`
    const filepath = path.join(os.tmpdir(), imageFileName)
    imageToBeUploaded = {filepath,mimetype}
    file.pipe(fs.createWriteStream(filepath))
  })

  busboy.on('finish', ()=>{
    admin.storage().bucket().upload(imageToBeUploaded.filepath, {
      resumable: false,
      metadata: {
        metadata:{
          contentType: imageToBeUploaded.mimetype
        }
      }
    }).then(()=>{
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
      return db.doc(`/users/${req.user.handle}`).update({imageUrl})
    }).then(()=>{
      return res.json({ message : 'image uploaded succesfully'})
    }).catch((e)=>{
      console.error(e)
      return res.status(500).json()
    })
  })
  busboy.end(req.rawBody)
}
