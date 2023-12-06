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
    if (req.session.userID != null){
        res.redirect("adminDashboard")
    }
    else{
        res.render("login");
    }

});

app.post("/loginsubmit", (req, res) => {
    const loginUsername = req.body.login_username;
    const loginPassword = req.body.login_password;

    knex.select("user_id", "username", "password").from("users")
        .then(user => {

            let unlocked = false;
            for (i = 0; i < user.length; i++){
                // console.log(user[i].username + " | " + loginUsername)
                // console.log(user[i].password + " | " + loginPassword)
                if(user[i].username == loginUsername && user[i].password == loginPassword){
                    unlocked = true;
                    req.session.userID = user[i].user_id;
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

app.get("/createAcc", authenticate, (req, res) => {
    res.render("createAcc");
});

app.post("/createAcc", authenticate, (req, res) => {
    knex.insert({username: req.body.login_username, password: req.body.login_password, first_name: req.body.login_firstname, last_name: req.body.login_lastname}).from("users")
    .then(user => {
        res.redirect("adminDashboard")
    })
    .catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });
});

app.get("/modifyAcc", authenticate, (req, res) => {

    knex.select("user_id", "username", "password", "first_name", "last_name").from("users").where({"user_id": req.session.userID})
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
        // timestamp: req.body.timestamp,
        timestamp: new Date(),
        age: req.body.age,
        gender: req.body.gender,
        relationship: req.body.relationship,
        occupation: req.body.occupation,
        use_sm: req.body.use_sm,
        avg_daily_sm_use: req.body.avg_daily_sm_use,
        no_purpose_use_score: req.body.no_purpose_use_score,
        distracted_use_score: req.body.distracted_use_score,
        restlessness_without_sm_score: req.body.restlessness_without_sm_score,
        general_distraction_score: req.body.general_distraction_score,
        bothered_by_worries_score: req.body.bothered_by_worries_score,
        concentration_difficulty_score: req.body.concentration_difficulty_score,
        freq_comparison_to_successful_people_via_sm_score: req.body.freq_comparison_to_successful_people_via_sm_score,
        feelings_about_comparison_score: req.body.feelings_about_comparison_score,
        validation_seeking_from_sm_score: req.body.validation_seeking_from_sm_score,
        freq_feeling_depressed_or_down_score: req.body.freq_feeling_depressed_or_down_score,
        freq_fluctuation_of_interest_in_daily_activities_score: req.body.freq_fluctuation_of_interest_in_daily_activities_score,
        freq_sleep_issues_score: req.body.freq_sleep_issues_score,
        location: req.body.location
    }).then(myEntries => {
        res.redirect("/");
    }).catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });

    async function getEntryID() {
        return knex("entries").select("entry_id").orderBy("entry_id", "desc").first();
    }

    let entryID = await getEntryID();
    console.log(entryID);

    const organizations = req.body.organization_name;    
    console.log(organizations);

    const platforms = req.body.platform_name;
    console.log(platforms);

    organizations.forEach(async (organizationName) => {
        platforms.forEach(async (platformName) => {
            await knex('social_media_data').insert({
                entry_id: entryID,
                organization_name: organizationName,
                platform_name: platformName
            });
        });
    }).then( () => {
        res.redirect("/")
    }).catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });
});

app.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

app.listen(port, () => console.log("Website is running"));