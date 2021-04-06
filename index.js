const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors"); //cors is to make connection between server and client
const app = express();
const admin = require("firebase-admin");
require('dotenv').config();

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(cors());


const MongoClient = require('mongodb').MongoClient;
//username, password and database name. Kept it in env to keep it secure
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yfcjm.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

//the downloaded file is in configs 
const serviceAccount = require("./configs/burj-al-arab-6e13c-firebase-adminsdk-692yh-da259ef5bb.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    //db name and collection name
  const bookings = client.db(`${process.env.DB_NAME}`).collection(`${process.env.DB_COLLECTION}`);
  // perform actions on the collection object
  console.log("Database connected");

  //receiving data from front-end
  app.post("/addBooking", (req,res) => {
      const newBooking = req.body;
      bookings.insertOne(newBooking)
      .then(result => {
          res.send(result.insertedCount > 0);
      });
  });

  app.get("/bookings", (req,res) => {

      //accessing the token which was sent in the header
      //console.log(req.headers.authorization);

      
      const bearer = req.headers.authorization;
      //checking if it's start with Bearer and space 
      if(bearer && bearer.startsWith('Bearer ')) {
          const idToken = bearer.split(' ')[1]; //splitting it and then taking the next part
          console.log('ID Token: ',idToken);
          //got this from verify id tokens in firebase 
          admin.auth().verifyIdToken(idToken)
            .then((decodedToken) => {
                const tokenEmail = decodedToken.email;
                const queryEmail = req.query.email;
                console.log(tokenEmail, queryEmail)
                if(tokenEmail === queryEmail) {
                    //loading specific booking using query email which was sent from the client side
                    //console.log(req.query.email);
                    bookings.find({email:queryEmail})
                    .toArray((err, documents) => {
                        res.send(documents);
                    })
                }
                else {
                    res.status(401).send('un-authorized user');
                }
            })
            .catch((error) => {
                res.status(401).send('un-authorized user');
            });
      }
      else {
          res.status(401).send('un-authorized user');
      }

      


      
  })
});

app.get("/", (req,res)=>{
    res.send("Hello from the server side");
});

app.listen(process.env.PORT || 5000, ()=>{
    console.log("Server has started");
});