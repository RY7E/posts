const mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/authproj2");

const userSchema = mongoose.Schema({
    username: String,
    email: String,
    name: String,
    password: String,
    posts: [
        {type: mongoose.Schema.Types.ObjectId, ref: "post"}
    ]
})

module.exports = mongoose.model('user', userSchema);