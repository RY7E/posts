const express = require('express');
const app = express();
const path = require('path');
const port = 3000;
const userModel = require('./models/user');
const postModel = require('./models/post');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.get("/", (req, res) => {
    res.render('index');
})

app.get("/login", (req, res) => {
    res.render('login')
})

app.post("/login", async (req, res) => {
    let {email, password} = req.body;
    let user = await userModel.findOne({email});
    if (!user) return res.status(500).send("Something went wrong :(");

    bcrypt.compare(password, user.password, (err, result) => {
        if (result) {
            let token = jwt.sign({email: email, userid: user._id}, "secret");
            
            res.cookie("token", token);
            res.status(200).redirect("/profile");     
        }
        else {
            res.redirect("/login")
        }    
    })
})

app.post("/register", async (req, res) => {
    let {username, name, email, password} = req.body;
    let user = await userModel.findOne({email})
    if (user) return res.status(500).send("User already exists.");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let user = await userModel.create({
                username,
                name,
                email,
                password: hash,
            })

            let token = jwt.sign({email: email, userid: user._id}, "secret");
            res.cookie("token", token)
            res.redirect("/profile");
        })
    })
})

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
})

app.get("/profile", isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email}).populate("posts");

    res.render('profile', {user});
})


function isLoggedIn(req, res, next){
    if(req.cookies.token === "") {
        res.redirect("/login");
    }
    else {
        let data = jwt.verify(req.cookies.token, "secret");
        req.user = data;
    }
    next();
}

app.post('/post', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({email: req.user.email});
    let post = await postModel.create({
        user: user._id,
        content: req.body.postdesc
    });

    user.posts.push(post._id);
    await user.save();

    res.redirect("/profile");
})

app.get("/like/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate("user");

    if (post.likes.indexOf(req.user.userid) === -1) {
        post.likes.push(req.user.userid);
    }
    else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save()
    res.redirect("/profile");
})

app.get("/delete/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndDelete({_id: req.params.id});
    res.redirect("/profile");
})

app.get("/edit/:id", isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id})
    res.render("edit", {post});
})

app.post("/update/:id", isLoggedIn, async (req, res) => {
    let newDesc = req.body.postdesc;
    await postModel.findOneAndUpdate({_id: req.params.id}, {content: newDesc});
    res.redirect("/profile");
})

app.listen(port);