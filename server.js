// server.js
// where your node app starts
//move environment veriables
// var url = require("url");
// console.log("got url")
// function fullUrl(req) {
//   return url.format({
//     protocol: req.protocol,
//     host: req.get("host"),
//     pathname: req.originalUrl
//   });
// }
// const result = require("dotenv").config();
// if (result.error) {
//   throw result.error;
// }

// console.log(result.parsed);
// let keys = ["PROJECT_DOMAIN", "CLIENT_ID", "CLIENT_SECRET"];
// keys.map(key => console.log(key, "=", process.env[key]));
// API library from https://github.com/google/google-api-nodejs-client
const { google } = require("googleapis");

//the complete set of APIs hat are supported is here: https://developers.google.com/apis-explorer/#p/
//the link to the selected API has a list of all of the API calls, and also a link to the documenation. For example
//for blogger the blogger API https://developers.google.com/apis-explorer/#p/blogger/v3/
//is at V3 and a link leads to the documentaiton https://developers.google.com/blogger/docs/3.0/getting_started
const blogger = google.blogger("v3");

//For sheets it is V4 https://developers.google.com/apis-explorer/#p/sheets/v4/
//and docs at https://developers.google.com/sheets/
const sheets = google.sheets("v4");

//For plus it is v1 https://developers.google.com/apis-explorer/#p/plus/v1/
//and docs at https://developers.google.com/+/web/api/rest/
const plus = google.plus("v1");

let userName; //name to pull from G+ data

// the process.env values are set in .env
//Credentials needed for API calls
console.log("doing it");
const returnPath = "/login/google/return";

// var callbackURL = `https://${
//   process.env.PROJECT_DOMAIN
// }.glitch.me${returnPath}`;

var callbackURL = "https://21jlqq6qk0.sse.codesandbox.io/login/google/return";

var scopes = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/plus.me",
  "https://www.googleapis.com/auth/blogger"
];
const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
console.log(clientID);
var oauth2Client = new google.auth.OAuth2(clientID, clientSecret, callbackURL);

var oauthUrl = oauth2Client.generateAuthUrl({
  // 'online' (default) or 'offline' (gets refresh_token)
  // If you only need one scope you can pass it as a string
  scope: scopes,
  access_type: "offline",
  prompt: "consent" //or could be 'consent' to define what access is given
});

// init project

const setupExpress = () => {
  var express = require("express");
  var app = express();
  var expressSession = require("express-session");

  // cookies are used to save authentication
  var bodyParser = require("body-parser");
  var cookieParser = require("cookie-parser");
  app.use(express.static("views"));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    expressSession({
      secret: "watchingmonkeys",
      resave: true,
      saveUninitialized: true
    })
  );
  var port = 3000;
  var listener = app.listen(port, function() {
    console.log("Your app is listening on port " + listener.address().port);
  });
  return app;
};
var app = setupExpress();
// index route
app.get("/", function(req, res) {
  console.log("ROOT");
  // res.sendFile('index.html');
});

// on clicking "logoff" the cookie is cleared
app.get("/logoff", function(req, res) {
  console.log("Logging off");
  res.clearCookie("googleauth");
  res.redirect("/");
});

app.get("/auth/google", function(req, res) {
  console.log("auth", req.header("referer"));
  res.cookie("referer", req.header("referer"));
  if (req.cookies.googleauth) {
    res.redirect("/success");
  } else {
    console.log("redirecting to ", oauthUrl);
    res.redirect(oauthUrl);
  }
});

app.get("/login/google/return", function(req, res) {
  console.log("login referrer", req.cookies["referer"]);
  oauth2Client.getToken(req.query.code, function(err, tokens) {
    // Tokens contains an access_token and a refresh_token if you set access type to offline. Save them.
    if (!err) {
      console.log("Setting credentials");
      res.cookie("access_token", tokens.access_token);
      res.cookie("refresh_token", tokens.refresh_token);
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      });
      res.cookie("googleauth", new Date());
      console.log("referr afterward", '"' + req.cookies["referer"] + '"');
      console.log(
        req.cookies["referer"] === "https://eldr-blitz-blogger.stackblitz.io"
      );
      if (
        req.cookies["referer"] === "https://eldr-blitz-blogger.stackblitz.io/"
      ) {
        res.redirect(req.cookies["referer"]);
      } else res.redirect("/success");
    } else {
      console.log("Error on getToken: " + err);
    }
  });
});

// if cookie exists, success. otherwise, user is redirected to index
app.get("/success", function(req, res) {
  if (req.cookies["googleauth"]) {
    oauth2Client.setCredentials({
      access_token: req.cookies.access_token,
      refresh_token: req.cookies.refresh_token
    });
    console.log("Google auth");
    res.sendFile(__dirname + "/views/success.html");
  } else {
    console.log("Redirect to root");
    res.redirect("/");
  }
});
const blogId = process.env.BLOG_KEY;

app.get("/getStatus", function(req, res) {});

const pushSheetWithContents = contents => {
  const sheetId = process.env.SHEET_KEY;
  console.log("Push Sheet");
  let request = {
    spreadsheetId: sheetId,
    range: "70Years!A1",
    auth: oauth2Client,
    valueInputOption: "USER_ENTERED",

    requestBody: {
      values: contents,
      majorDimension: "ROWS"
    }
  };
  sheets.spreadsheets.values.update(request, (err, response) => {
    if (err) {
      console.log("err", err);
    } // else {console.log(response)}
  });
};

let getData = (req, res) => {
  console.log("GETDATA");
  let blogRequest = {
    blogId: blogId,
    fetchBodies: false,
    maxResults: 3,
    orderBy: "published",
    auth: oauth2Client
  };
  let postsData = [];

  const getAndPrintPosts = () => {
    blogger.posts.list(blogRequest, function(err, response) {
      console.log("getting posts");
      if (err) {
        console.log("error", err);
        return;
      }
      printPosts(response);
      if (response.data.nextPageToken) {
        //getAndPrintPosts(postsData)
        // } else {
        console.log("postsData");
        pushSheetWithContents(postsData);
        res.append("Access-Control-Allow-Origin", "*");
        res.send(postsData);
      }
    });
  };

  let postNo = 0;
  const printPosts = response => {
    let items = response.data.items;
    let count = items.length;
    let item = items[0];
    // console.log( item.title, item.url, item.labels )
    //patchIt(item.id, item.title, item)

    for (let i = 0; i < 1; i++) {
      let item = items[i];
      // console.log(++postNo, item.title)
      const link = `=HYPERLINK("${item.url}","post")`;
      const edit = `=HYPERLINK("https://www.blogger.com/blogger.g?blogID=${blogId}#editor/target=post;postID=${
        item.id
      }","edit")`;
      postsData.push([item.title, link, edit, JSON.stringify(item.labels)]);
      //https://www.blogger.com/blogger.g?blogID=809323243837962619#editor/target=post;postID=5587730061441549723
    }
    let nextToken = response.data.nextPageToken;
    blogRequest.pageToken = nextToken;
  };

  getAndPrintPosts();

  // Now get spreadsheet values
  // var request = {
  //   // The ID of the spreadsheet to retrieve data from.
  //   spreadsheetId: process.env.SHEET_KEY,
  //   // The A1 notation of the values to retrieve.
  //   range: 'A1:I8',
  //   auth: oauth2Client
  // };
  // sheets.spreadsheets.values.update(request, function(err, response) {
  //   debugger
  //   if (err) {
  //     console.log("Aww, man: " + err);
  //     res.send("An error occurred");
  //   } else {
  //     console.log(response.data.values)
  //     dataDeets = response.data.values;
  //     res.send([userName, dataDeets]);
  //     console.log(userName, dataDeets)
  //   }
  // });
  //   }
  // });
};

// listen for requests :)
const patchIt = (id, title, item) => {
  console.log("Patchit");
  // console.log("title", title, "labels", item.labels)
  if (!item.labels) item.labels = [];
  item.labels.push("yoiksey");
  // console.log(Object.keys(item))
  // item.labels.push = "verymuch"
  // item.title = item.title + "!"
  // console.log(item)
  let patchRequest = {
    blogId: blogId,
    postId: id,
    publish: true,
    auth: oauth2Client,
    resource: { labels: item.labels }
  };
  console.log("About to patchit");
  blogger.posts.patch(patchRequest, function(err, response) {
    if (err) {
      console.log("patchrequest", err.errors);
    } else {
      console.log("OK");
    }
  });
};
const getPeople = () => {
  // plus.people.get({
  //   userId: 'me',
  //   auth: oauth2Client
  // }, function (err, response) {
  //   console.log("Returned from getting people")
  //   if (err) {
  //     console.log("Failed getting people: " + err);
  //     res.send("Failed to get from the people");
  //   } else {
  //     console.log("got people");
  //     if(response.data.isPlusUser==true){
  //       userName = response.data.name.givenName;
  //     } else {
  //       userName = "Unknown Stranger";
  //     }
};

const pushSheet = () => {
  return pushSheetWithContents([
    ["ValueA1xxx", "ValueB1"],
    ["Row2A1", "Row2B1"]
  ]);
};

app.get("/getData", getData);
