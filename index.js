// Dependencies
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

// Uses express-session to keep users logged in. Put authenticate on any route that requires a user to login
const authenticate = (req, res, next) => {
    // During a session, if a user has logged in, they don't have to again because of the loggedIn session variable
    if (!req.session.loggedIn) {
        return res.redirect('/login'); // Redirect to login if not logged in
    }
    next(); // Continue to the next middleware or route handler
};

/* 
user routes 
*/

// Get the home page. Set generation and smUsage session variables to none
app.get("/", (req, res) => {
    req.session.Generation = "None";
    req.session.smUsage = "None";
    res.render("home");
});

// Get the dashboard page
app.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

// Get the login page.
app.get("/login", (req, res) => {
    let loginChecker = '';

    // If the user has logged in previously in this session, send to Admin Dashboard
    if (req.session.userID != null) {
        res.redirect("adminDashboard");
    }
    // If they haven't logged in in this session, send to login.
    else{
        res.render("login", { loginChecker });
    }
});

// Submit the login form
app.post("/loginSubmit", (req, res) => {
    const loginUsername = req.body.login_username;
    const loginPassword = req.body.login_password;
    // loginChecker helps to send an alert to the user if they failed to log in
    let loginChecker = '';

    // Check if the username and password are in the database. If so, send to adminDashboard route and set the loggedIn session variable to true.
    knex("users").select("user_id",
                         "username",
                         "password").then(user => {
        let unlocked = false;
        for (i = 0; i < user.length; i++){
            if (user[i].username == loginUsername && user[i].password == loginPassword) {
                unlocked = true;
                // Set the userID session variable to the logged in user
                req.session.userID = user[i].user_id;
            }
        }
        if (unlocked == true) {
            req.session.loggedIn = true;
            res.redirect("adminDashboard")
        }
        else {
            loginChecker = 'failed';
            res.render("login", { loginChecker });
        }
    })
    .catch((err) => {
        console.error(err);
        res.status(500).send("Internal Server Error"); // Helpful error routing
    });
});

// Get the survey page
app.get("/survey", (req, res) => {
    res.render("survey");
});

// Submit the survey
app.post("/submitSurvey", async (req, res) => {
    req.session.Generation = req.body.age;
    req.session.smUsage = req.body.avg_daily_sm_use;

    // Insert survey into the entries table
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

    // Get the most recent entry_id
    async function getEntryID() {
        return knex("entries").select("entry_id").orderBy("entry_id", "desc").first();
    }

    let entryID = await getEntryID();
    // If only one organization or platform is selected, put them into arrays
    const organizations = Array.isArray(req.body.organization_name) ? req.body.organization_name : [req.body.organization_name];
    const platforms = Array.isArray(req.body.platform_name) ? req.body.platform_name : [req.body.platform_name];

    // Loop over the number of organizations and platforms selected and insert that many records into the social_media_data linking table
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

    // Send the user to the customizedAssessment route
    res.redirect("/customizedAssessment");
});

// Get the customizedAssessment page that fills out based on the age and average daily use of the submitted form
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

/* 
admin routes 
*/

// Get the adminDashboard page
app.get("/adminDashboard", authenticate, (req, res) => {
    // Assign the ID Filter dropdown from adminDashboard.ejs to a variable
    const filterID = req.query.filterID;

    // Get identifying details for each entry in the entry table and assign it to a variable
    let query = knex("entries")
        .select("entry_id",
                "timestamp",
                "age",
                "gender",
                "relationship",
                "occupation",
                "location").orderBy("entry_id");
    
    // If the ID Filter isn't set to all, only return the 1 filtered survey record
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

// Get the entryDetails page based on the entry_id of the row in the adminDashboard
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

// Get the createAcc page
app.get("/createAcc", authenticate, (req, res) => {
    let usernameExistsResult = '';
    res.render("createAcc", { usernameExistsResult });
});

// Creates an account
app.post("/createAcc", authenticate, async (req, res) => {
    // Checks if the username already exists in the database
    // If it does, usernameExistsResult gets set to the entered username, but if not, it remains empty
    async function doesUsernameExist() {
        return knex("users").select("username").where({username: req.body.login_username})
    }
    let usernameExistsData = await doesUsernameExist();

    let usernameExistsResult = '';

    // Username exists. usernameExistsResult gets sent to the createAcc page to display alert message
    if (usernameExistsData.length !== 0) {
        usernameExistsResult = usernameExistsData[0].username;
        res.render("createAcc", { usernameExistsResult });        
    }
    // Username doesn't exist. Insert it into the users table, then route back to the adminDashboard
    else {
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
});

// Get the modifyAcc page filled with the values the current logged in user via the userID session variable
app.get("/modifyAcc", authenticate, (req, res) => {
    knex("users").select()
    .where({user_id: req.session.userID})
    .then(user => {
        res.render("modifyAcc", {myUsers: user});
    });
});

// Updates the selected user account (from the userID session variable) with modified data
app.post("/modifyAcc", authenticate, (req, res) => {
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

//EVENTBRITE API (Extra Add in if we had more time)
// app.get('/events', async (req, res) => {
//     try {
//         const response = await axios.get('https://www.eventbriteapi.com/v3/events/search/', {
//             headers: {
//                 'Authorization': 'Bearer BJ23RP7LXVHPFMENRG6Y'
//             },
//             params: {
//                 'location.address': 'Provo',
//                 'q': 'Mental Health',
//                 'sort_by': 'date'
//             }
//         });
//         // Render the EJS template with the events data
//         res.render('events', { events: response.data.events });
//     } catch (err) {
//         console.error(err);
//         res.status(500).render('error', { message: 'An error occurred' });
//     }
// });
  
app.listen(port, () => console.log("Website is running"));