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
admin routes 
*/
app.get("/", (req, res) => {
    req.session.Generation = "None";
    req.session.smUsage = "None";
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

app.post("/loginSubmit", (req, res) => {
    const loginUsername = req.body.login_username;
    const loginPassword = req.body.login_password;

    knex("users").select("user_id",
                         "username",
                         "password").then(user => {
        let unlocked = false;
        for (i = 0; i < user.length; i++){
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
    const filterID = req.query.filterID;
    const filterDate = req.query.filterDate;

    let query = knex("entries")
        .select("entry_id",
                "timestamp",
                "age",
                "gender",
                "relationship",
                "occupation",
                "location").orderBy("entry_id");
    
    if (filterID && filterID !== 'all') {
        query = query.where({'entry_id': parseInt(filterID)});
    }

    query.then(entries => {
        res.render("adminDashboard", {myEntries: entries});
    }).catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
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

app.post("/createAcc", authenticate, async (req, res) => {

    async function doesUsernameExist() {
        return knex("users").select("username").where({username: req.body.login_username})
    }
    let usernameExistsData = await doesUsernameExist();
    //let usernameExistsResult = usernameExistsData[0].username;
    if (usernameExistsData.length == 0) {
        console.log(usernameExistsData);
        knex("users").insert({
            username: req.body.login_username,
            password: req.body.login_password,
            first_name: req.body.login_firstname,
            last_name: req.body.login_lastname})
        .then(user => {
            res.redirect("adminDashboard");
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Internal Server Error");
        });
    }
    else {
        let usernameExistsResult = usernameExistsData[0].username;
        console.log(usernameExistsResult);
    }
});

app.get("/modifyAcc", authenticate, (req, res) => {
    knex("users").select()
    .where({user_id: req.session.userID})
    .then(user => {
        res.render("modifyAcc", {myUsers: user});
    });
});

app.post("/modifyAcc", (req, res) => {
    knex("users").select().where({user_id: req.session.userID}).update({
        username: req.body.login_username,
        password: req.body.login_password,
        first_name: req.body.login_firstname,
        last_name: req.body.login_lastname
    }).then(myProducts => {
        res.redirect("/adminDashboard");
    }).catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });
});

app.get("/survey", (req, res) => {
    res.render("survey");
});

app.post("/submitSurvey", async (req, res) => {
    req.session.Generation = req.body.age;
    req.session.smUsage = req.body.avg_daily_sm_use;

    knex("entries").insert({
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
        location: "Provo"
    }).catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });

    async function getEntryID() {
        return knex("entries").select("entry_id").orderBy("entry_id", "desc").first();
    }

    let entryID = await getEntryID();
    const organizations = Array.isArray(req.body.organization_name) ? req.body.organization_name : [req.body.organization_name];
    const platforms = Array.isArray(req.body.platform_name) ? req.body.platform_name : [req.body.platform_name];

    console.log(organizations);
    console.log(platforms);

    for (const organizationName of organizations) {
        for (const platformName of platforms) {
            const organizationID = await knex('organizations').select('organization_id').where({ organization_name: organizationName }).first();
            const platformID = await knex('platforms').select('platform_id').where({ platform_name: platformName }).first();
            await knex('social_media_data').insert({
                entry_id: entryID.entry_id,
                organization_id: organizationID.organization_id,
                platform_id: platformID.platform_id
            });
        }
    }

    res.redirect("/customizedAssessment");
});

app.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

app.get("/customizedAssessment", (req,res) => {
    knex.select("entry_id", "age", "avg_daily_sm_use").from('entries').orderBy("entry_id", "desc")
    .then(entry => {
        res.render("customizedAssessment", {myInfo: entry})
    })
    .catch(err => {
        console.error(err);
        res.status(500).send("Internal Server Error");
    });
});

app.get("/helpGenZ", (req, res) => {
    res.render("helpGenZ")
})

app.listen(port, () => console.log("Website is running"));