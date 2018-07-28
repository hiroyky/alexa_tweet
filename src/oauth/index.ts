import { APIGatewayEvent, Callback, Context } from "aws-lambda";
import * as awsServerlessExpress from "aws-serverless-express";
import cookieParser from "cookie-parser";
import express from "express";
import { checkSchema, validationResult, ValidationSchema } from "express-validator/check";
import { OAuth } from "oauth";
import Env from "../env";

const env = new Env();

const app = express();
app.use(cookieParser());

app.get("/oauth/request_token", async (req, res, next) => {
    const oauth = new OAuth(
        env.twitter.oauth.requestUrl,
        env.twitter.oauth.accessUrl,
        env.twitter.oauth.key,
        env.twitter.oauth.secret,
        "1.0",
        env.api.callbackUrl,
        "HMAC-SHA1");

    oauth.getOAuthRequestToken((err, token, secret, result) => {
        if (err) {
            console.error(`error: ${JSON.stringify(err)}`);
            res.status(500).end(JSON.stringify(err));
            return;
        }

        const url = `${env.twitter.oauth.authUrl}?oauth_token=${token}`;
        res.cookie("secret", secret);
        res.cookie("redirect", req.query.redirect_uri);
        res.cookie("state", req.query.state);
        res.cookie("client", req.query.client_id);
        res.redirect(url);
    });
});

const callbackSchema: ValidationSchema = {
    client: { in: ["cookies"] },
    redirect: { in: ["cookies"] },
    secret: { in: ["cookies"] },
    state: { in: ["cookies"] },
    oauth_token: { in: ["query"] },
    oauth_verifier: { in: ["query"] },
};

app.get("/oauth/callback",
    checkSchema(callbackSchema),
    async (req, res, next) => {
        if (!validationResult(req).isEmpty()) {
            res.state(400).end();
            return;
        }

        const oauth = new OAuth(
            env.twitter.oauth.requestUrl,
            env.twitter.oauth.accessUrl,
            env.twitter.oauth.key,
            env.twitter.oauth.secret,
            "1.0",
            req.cookies.redirect,
            "HMAC-SHA1");

        oauth.getOAuthAccessToken(req.query.oauth_token, req.cookies.secret, req.query.oauth_verifier, (err, token, secret) => {
            if (err) {
                res.status(500).end(JSON.stringify(err));
                return;
            }
            const url = `${req.cookies.redirect}#state=${req.cookies.state}&access_token=${token},${secret}&client_id=${req.cookies.client}&token_type=Bearer`;
            res.redirect(url);
        });
    });

const server = awsServerlessExpress.createServer(app, undefined, ["application/json"]);
export function handler(event: APIGatewayEvent, context: Context, callback: Callback) {
    env.init()
        .then(awsServerlessExpress.proxy(server, event, context))
        .catch((err) => console.error(err));
}
