import { SSM } from "aws-sdk";

export default class Env {
    protected ssm = new SSM();
    protected twitterConsumerKey = "";
    protected twitterConsumerSecret = "";

    public async init() {
        this.twitterConsumerKey = await this.getSSMParameter("TWITTER_CONSUMER_KEY");
        this.twitterConsumerSecret = await this.getSSMParameter("TWITTER_CONSUMER_SECRET");
    }

    get twitter() {
        return {
            oauth: {
                accessUrl: "https://api.twitter.com/oauth/access_token",                
                authUrl: "https://api.twitter.com/oauth/authenticate",
                key: this.twitterConsumerKey,
                requestUrl: "https://api.twitter.com/oauth/request_token",
                secret: this.twitterConsumerSecret,
            },
        };
    }

    get api() {
        return {
            callbackUrl: this.getEnv("CALLBACK_URL"),
        };
    }

    protected async getSSMParameter(name): Promise<string> {
        const param: SSM.GetParameterRequest = {
            Name: name,
            WithDecryption: true,
        };
        const result = await this.ssm.getParameter(param).promise();
        if (result === undefined) {
            throw new Error(`failed to get SSM parameter: ${name}`);
        }
        return result.Parameter.Value;
    }

    protected getEnv(name): string {
        return process.env[name];
    }
}
