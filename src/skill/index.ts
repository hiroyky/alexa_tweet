import Alexa from "alexa-sdk";
import Twitter from "Twitter";
import Env from "../env";

const env = new Env();

export function handler(event: Alexa.RequestBody<any>, context: Alexa.Context) {
    const alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
}

const handlers: Alexa.Handlers<any> = {
    LaunchRequest: function() {
    },

    SessionEndedRequest: function() {
        this.emit(":tell", "終了します．");
    },

    TweetRequest: async function() {
        const accessToken = this.event.session.user.accessToken;
        if (accessToken === undefined) {
            this.emit(":tellWithLinkAccountCard", "ログインしてください");
            return;
        }

        await env.init();

        const client = new Twitter({
            consumer_key: env.twitter.oauth.key,
            consumer_secret: env.twitter.oauth.secret,
            access_token_key: accessToken.split(",")[0],
            access_token_secret: accessToken.split(",")[1],
        });

        const message = `テスト ${new Date().getTime() / 1000}`;
        client.post("statuses/update", {status: message}, (err: Error, tweet: any, response: any) => {
            if (err) {
                console.error(err);
                console.error(response);
                this.emit(":tell", "つぶやきに失敗しました");
            }
            this.emit(":tell", "つぶやきました");
        });
    },
};
