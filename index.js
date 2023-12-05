const express = require("express");
const path = require("path");
const session = require("express-session");
let app = express();
const port = process.env.PORT || 3000;
app.use(express.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname));
const isLocal = process.env.NODE_ENV === 'development';

const knex = require("knex")({
    client: "pg",
    connection: {
        host: process.env.RDS_HOSTNAME || "localhost",
        user: process.env.RDS_USERNAME || "test",
        password: process.env.RDS_PASSWORD || "SuperPass",
        database: process.env.RDS_DB_NAME || "intex1_test",
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? {rejectUnauthorized: false} : false
    }
});

app.use(session({
    secret: "social media secrets",
    resave: false,
    saveUninitialized: true
}));

const authenticate = (req, res, next) => {
    if (!req.session.loggedIn) {
        return res.redirect('/login'); // Redirect to login if not logged in
    }
    next(); // Continue to the next middleware or route handler
  };
  

/* 
user routes 
*/
/* 
user routes 
*/
app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/loginsubmit", (req, res) => {
    const loginUsername = req.body.login_username;
    const loginPassword = req.body.login_password;

    knex.select("username", "password").from("users")
        .then(user => {

            let unlocked = false;
            for (i = 0; i < user.length; i++){
                // console.log(user[i].username + " | " + loginUsername)
                // console.log(user[i].password + " | " + loginPassword)
                if(user[i].username == loginUsername && user[i].password == loginPassword){
                    unlocked = true;   
                }
            }
            if (unlocked == true) {
                req.session.loggedIn = true;
                res.redirect("adminDashboard")
            }
            else {
                res.redirect("login")
            }
        })
        .catch((error) => {
            // Handle any database error
            console.error(error);
            res.status(500).send("Internal Server Error");
        });
});

app.get("/adminDashboard", authenticate, (req, res) => {
    knex("entries").select("entry_id",
                           "timestamp",
                           "age",
                           "gender",
                           "relationship",
                           "occupation",
                           "location").orderBy("entry_id").then(entries => {
        res.render("adminDashboard", {myEntries: entries});
    });
});

app.get("/entryDetails/:id", authenticate, (req, res) => {
    knex('entries').select()
        .innerJoin('social_media_data', 'entries.entry_id', 'social_media_data.entry_id')
        .innerJoin('organizations', 'social_media_data.organization_id', 'organizations.organization_id')
        .innerJoin('platforms', 'social_media_data.platform_id', 'platforms.platform_id')
    .where({'entries.entry_id': parseInt(req.params.id)}).then(entries => {
        res.render('entryDetails', {myEntries: entries});
    }).catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });
});

app.get("/createAcc", (req, res) => {
    res.render("createAcc");
});

app.post("/createAcc", (req, res) => {
    knex.insert({username: req.body.login_username, password: req.body.login_password, first_name: req.body.login_firstname, last_name: req.body.login_lastname}).from("users")
    .then(user => {
        res.redirect("adminDashboard")
    })
    .catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });
});

app.get("/modifyAcc", (req, res) => {
    
    knex.select("username", "password", "first_name", "last_name").from("users")
        .then(user => {
            res.render("modifyAcc", {user: user});
        });
});

app.post("/modifyAcc", (req, res) => {
    res.render("modifyAcc");
});

app.get("/survey", (req, res) => {
    res.render("survey");
});

app.post("/submitSurvey", (req, res) => {
    knex("entries").insert({
        age: req.body.age,
        gender: req.body.gender
    }).catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });

    /*
    knex("social_media_data").insert({

    }).catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });*/
});

app.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

app.get("/adminDashboard", (req, res) => {
    res.render("adminDashboard");
});

app.listen(port, () => console.log("Website is running"));