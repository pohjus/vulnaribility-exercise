const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3");

// Import the cookie-parser middleware to parse cookies
const cookieParser = require("cookie-parser");

// Import the express-session middleware to manage sessions in Express
const session = require("express-session");

// Create an instance of an Express application
const app = express();

// Serve static files from the 'public' directory
app.use(express.static("public"));

// Use the body-parser middleware to parse URL-encoded bodies
// When a form is submitted through an HTTP request
// (typically a POST or PUT request), the form data is sent to the server
// as a URL - encoded query string.The body - parser middleware can parse
// this type of data.
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize cookie-parser to allow access to cookies stored in the client
app.use(cookieParser());

// Initialize express-session to store session state in server-side memory
app.use(
  session({
    secret: "secret",
    cookie: { httpOnly: false },
    resave: true,
    saveUninitialized: true,
  })
);

// Create a new SQLite3 database in memory
let db = new sqlite3.Database(":memory:");

// Serialize database statements to ensure sequential execution
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS users " +
      "(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)"
  );

  // Check if the default user 'admin' already exists
  db.get("SELECT * FROM users WHERE username = ?", ["admin"], (err, row) => {
    if (err) {
      console.error(err.message);
    } else if (!row) {
      // Insert the default user with plain text password
      db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        ["admin", "admin"],
        (err) => {
          if (err) {
            console.error(err.message);
          } else {
            console.log("Default user 'admin' pw 'admin' created");
          }
        }
      );
    }
  });
});

// Route handler for GET requests to '/user'
app.get("/user", function (req, res) {
  const user_id = req.query.id;
  db.all(`SELECT * FROM users WHERE id = ${user_id}`, [], (err, rows) => {
    if (err) {
      res.status(500).send("An error occurred");
    } else {
      res.json(rows);
    }
  });
});

// Route handler for POST requests to '/login'
app.post("/login", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  db.get(
    `SELECT * FROM users WHERE username = '${username}' ` +
      `AND password = '${password}'`,
    (err, row) => {
      if (err) {
        res.status(500).send("An error occurred: " + JSON.stringify(err));
      } else if (row) {
        req.session.loggedin = true;
        req.session.username = username;
        res.redirect("/page1");
      } else {
        res.status(401).send("Incorrect Username and/or Password!");
      }
    }
  );
});

// Route handler for GET requests to '/home'
app.get("/page1", function (req, res) {
  if (req.session.loggedin) {
    res.send(
      `<h1>Page 1</h1><p>Welcome back, ${req.session.username}!</p>
      <p><a href="/page2">To page 2...</a></p><p><a href='/logout'>Logout</a></p>`
    );
  } else {
    res
      .status(401)
      .send(`Please <a href="login.html">login</a>  to view this page!`);
  }
});

// Route handler for GET requests to '/home2'
app.get("/page2", function (req, res) {
  if (req.session.loggedin) {
    res.send(
      `<h1>Page 2</h1><p>Welcome back, ${req.session.username}!</p>
      <p><a href="/page1">To page 1...</a></p><p><a href='/logout'>Logout</a></p>`
    );
  } else {
    res
      .status(401)
      .send(`Please <a href="login.html">login</a> to view this page!`);
  }
});

// Route handler for GET requests to '/logout'
app.get("/logout", function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      console.error(err);
      res.status(500).send("Error logging out:", JSON.stringify(err));
    } else {
      res.redirect("/login.html");
    }
  });
});

// Listen on port 3000 for incoming requests
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
