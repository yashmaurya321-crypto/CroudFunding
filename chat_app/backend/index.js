const express = require('express')
const app = express()
const User = require('./model/user')
const Message = require('./model/messege')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const conversation = require('./model/conv')
const secret_key = "this is secreat key"
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const io = require('socket.io')(8000, {
  cors : {
    origin : 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})
 require('./db/conn')
app.use(express.json())
app.use(cors())
app.get('/', (req, res) => {
  res.send('hello')

});

app.post('/register', async (req, res) => {
  try {
      const { name, email, password } = req.body;

      // Check if any required field is missing
      if (!name || !email || !password) {
          return res.status(400).json({ error: "Please fill all the fields" });
      }

      // Create a new user instance
      const newUser = new User({ name, email, password });

      // Save the new user to the database
      await newUser.save();

      console.log('User registration successful');
      res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
      // Check if the error is a MongoDB duplicate key error for the email field
      if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
          return res.status(400).json({ error: 'Email is already registered' });
      } else {
          // Handle other types of errors
          console.error('Error during user registration:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      }
  }
});

app.post('/login', async (req, res) => {
  try {
      const { email, password } = req.body;

      // Check if both email and password are provided
      if (!email || !password) {
          return res.status(400).json({ error: "Please provide both email and password" });
      }

      // Find the user in the database
      const user = await User.findOne({ email });

      // If no user is found with the provided email, return error
      if (!user) {
          return res.status(400).json({ error: "Invalid email or password" });
      }

      // Check if the provided password matches the user's password
      
      if (password != user.password){
        return res.status(400).json({ error: "Invalid email or password" });
      }

     

      const token = jwt.sign({ id: user._id, email: user.email }, secret_key, { expiresIn: "1h" });

      // Update user document with token
      user.token = token;
      await user.save();

      // Return success response with user data and token
      res.status(200).json({ message: "Login successful", user, token });
  } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/conversation', async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    
    // Log receiverId to check if it's received correctly
    console.log('ReceiverId:', receiverId);

    // Check if receiverId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ error: 'Invalid receiverId' });
    }

    // Temporarily comment out the code related to creating conversation and updating user
    const newConv = await new conversation({ members: [senderId, receiverId] });
    await newConv.save();

    const updatedUser = await User.findByIdAndUpdate(
      senderId,
      { $pull: { request: { _id: mongoose.Types.ObjectId.createFromHexString(receiverId) } } },
      { new: true }
    );

    res.status(200).json(updatedUser); // Return updated user document in the response
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});




app.post('/requests', async (req, res) => {
  try {
    const {id} = req.body

    // Find user by ID
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Access the request array
    const requestArray = user.request;

    // Send the request array as a response
    res.status(200).json({ requestArray });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.post('/request', async (req, res) => {
  try {
    const { email, userId } = req.body;

    // Find user by email
    const userByEmail = await User.findOne({ email });

    if (!userByEmail) {
      return res.status(404).json({ message: "User not found by email" });
    }

    // Find user by userId
    const userById = await User.findById(userId);

    if (!userById) {
      return res.status(404).json({ message: "User not found by userId" });
    }

    // Add user found by userId to the request array of the user found by email
    userByEmail.request.push(userById);
    await userByEmail.save();

    // Send response with success message and updated user request array
    res.status(200).json({ message: "Request added successfully", userRequest: userByEmail.request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});



app.get('/conversation/:senderId', async (req, res) => {
  try {
    const senderId = req.params.senderId;

    // Find all conversations where the sender is a member
    const conversations = await conversation.find({ members: senderId });
    if (!conversations || conversations.length === 0) {
      return res.status(404).json({ error: "Conversations not found for the sender" });
    }

    // Extract receiver IDs from each conversation
    const receiverDetails = conversations.map(conv => {
      const receiverId = conv.members.find(memberId => memberId.toString() !== senderId.toString());
      return {
        conversationId: conv._id,
        receiverId: receiverId
      };
    });
    if (!receiverDetails || receiverDetails.length === 0) {
      return res.status(404).json({ error: "Receivers not found for the sender's conversations" });
    }

    // Fetch receiver details from the User collection
    const receiverPromises = receiverDetails.map(receiver => User.findById(receiver.receiverId));
    const receivers = await Promise.all(receiverPromises);
    if (!receivers || receivers.length === 0) {
      return res.status(404).json({ error: "Receivers not found in User collection" });
    }
    
    // Return the list of receivers along with conversation IDs
    res.status(200).json({ receivers: receivers, conversations: receiverDetails });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/messege', async (req, res) => {
  try {
    const { conversationID, sender, messege, receiver } = req.body;
       
    if (!conversationID) {
      // If conversationID is not provided, create a new conversation and message
      const newConversation = new conversation({ members: [sender, receiver] });
      const savedConversation = await newConversation.save(); // await the save() call
    console.log( savedConversation)
      const newMessage = new Message({
        conversationID: savedConversation._id,
        sender,
        messege
      });

      await newMessage.save();

      return res.status(200).send("Message sent successfully");
    }

    // If conversationID is provided, just save the message
    const newMessage = new Message({
      conversationID,
      sender,
      messege
    });

    await newMessage.save();
    res.status(200).send("Message sent successfully");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/messege/:id', async (req, res) => {
  try {
    const conversationID = req.params.id;

    const messages = await Message.find({ conversationID });
   
    const user_data = await Promise.all(messages.map(async (msg) => {
      const users = await User.findById(msg.sender);
    return  { user: { email: users.email, name: users.name }, mess:msg.messege };
    }));

    res.status(200).json( user_data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/users', async(req,res)=>{
  try{
     const users = await User.find()
     
     res.send(users)
  }catch(err){
    res.send(err)
  }
})
let users = []
io.on('connect', (socket) => {
  console.log('user connected ', socket.id);
   
  // Add user to the list
  socket.on('adduser', (userID) => {
    const user = { userID, socketId: socket.id };
    users.push(user);
    // Emit only the newly added user to all clients
    console.log(users)
    io.emit('user_connected', user);
    
    // Emit the updated user list to all clients
    io.emit('getuser', users);
  });


  // Handle message sending
  socket.on('send', ({ sender,  receiver ,message}) => {
    console.log("Received message via socket:", {  sender,  receiver ,message });
    io.to()
    // Handle the message (e.g., save to database)
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected : ', socket.id);
    // Remove the disconnected user from the list
    users = users.filter((user) => user.socketId !== socket.id);
    io.emit('getuser', users);
  });
});


app.listen(5000, () => {
  console.log('App listening on port 5000!');
});