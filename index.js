const express = require("express");
const path = require("path");
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

    knex.select("Username", "Password").from("users").where("Username", loginUsername)
        .then((user) => {
            if (user.length > 0) {
                // User with the provided username exists in the database
                const storedPassword = user[0].Password;

                // Now you can compare storedPassword with req.body.login_password
                // For security reasons, you should hash the passwords and compare the hashes

                // Example: (you should use a proper password hashing library)
                const bcrypt = require("bcrypt");
                const isPasswordValid = bcrypt.compareSync(req.body.login_password, storedPassword);

                if (isPasswordValid) {
                    // Password is valid, you can proceed with login
                    res.send("Login successful");
                } else {
                    // Password is not valid
                    res.send("Invalid password");
                }
            } else {
                // User with the provided username doesn't exist
                res.send("User not found");
            }
        })
        .catch((error) => {
            // Handle any database error
            console.error(error);
            res.status(500).send("Internal Server Error");
        });
});


app.get("/createAcc", (req, res) => {
    res.render("createAcc");
});

app.get("/modifyAcc", (req, res) => {
    res.render("modifyAcc");
});

app.get("/survey", (req, res) => {
    res.render("survey");
});

app.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

app.get("/adminDashboard", (req, res) => {
    res.render("adminDashboard");
});

app.listen(port, () => console.log("Website is running"));