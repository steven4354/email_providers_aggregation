# API Aggregator

Aggregates all your Email APIs into 1

Currently supported:
- Gmail
- Google Oauth 2.0
- More Email APIs to be added!

## Demo

Check out the deployed app at: https://email-api-aggregation.herokuapp.com/

Picture 1
![Alt text](./1.png?raw=true "Title")

Picture 2
![Alt text](./2.png?raw=true "Title")

Picture 3
![Alt text](./3.png?raw=true "Title")

Picture 4
Note on deployed version - because site is hosted on a herokuapp subdomain for demonstration purposes, browsers may tell you to proceed back. Feel free to press Advanced and proceed to site to test out application. Only a minimal amount of information is stored which are acccesstokens and email addresses for access to Google's API. Accesstokens will be set to expire in 1 hour.
![Alt text](./4.png?raw=true "Title")

Picture 5
![Alt text](./5.png?raw=true "Title")


## Key Technologies Used and Technical Challenges 

Technologies used: 
- Google OAuth 2.0
- PassportJS
- NodeJS Backend
- ExpressJS
- MongoDB database and PassportJS for user authentification and keeping a list of user's information
- HandlebarsJS for the view (utitlized an MVC model)

## Deployment Locally

What things you need to install the software and how to install them

* node
* npm
* mongodb 

How to deploy this on your local machine

```
git clone <project-folder-on-github>
cd <cloned-project-folder-on-your-local-machine>
npm install
```

Enable the Gmail API on your google development console.

Create a .env file and add these items to
it to :

```
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

Run the application
```
nodemon app.js
```

## Found Bugs (to be fixed!)
Note on deployed version - because it is hosted on a herokuapp subdomain, browsers may tell you to proceed back. This is normal,
and feel free to press Advanced and proceed to site to continue. The only information stored are acccesstokens and emails. Accesstokens will expire in 1 hour.
