# alexa_tweet
Amazon echoでツイッターにツイートするスキルのサンプルプログラムです．以下の内容を含みます．

- ツイッターアカウントとのアカウントリンク(ApiGateway + Lambda を利用したOAuth認証)
- ツイートするスキル本体

# 解説記事


# ビルド & デプロイ
nodejsを実行できる環境が必要です．

### ビルド
```
$ npm install
$ npm build
```

### デプロイ
下記コマンドでApiGateway, Lambdaを作成します．

#### コンポーネントを構築

```
aws cloudformation package --template-file deploy/sam.yml --s3-bucket ${S3バケット名} --output-template-file ./artifacts/sam.yml 
aws cloudformation deploy --template-file ./artifacts/sam.yml --stack-name alexa-tweet --capabilities CAPABILITY_NAMED_IAM
```

#### Parameter Storeに値を設定

TwitterのConsumerKey, ConsumerSecretをSSM Parameter Storeに登録します．

```
aws ssm put-parameter --name TWITTER_CONSUMER_KEY --value {consumer key} --type SecureString
aws ssm put-parameter --name TWITTER_CONSUMER_SECRET --value {consumer secret} --type SecureString
```

#### Lambdaの環境変数追加

Lambda: alexa-oauth_twitter の環境変数「CALLBACK_URL」にAPI Gatewayの/oauth/callbackのURLを登録します．(本来なら固定のドメインを取得してsamファイルで設定するのが理想)

### ツイッターの設定
ツイッターのアプリ管理画面を開き，Callback URLsにAPI Gatewayの /oauth/request_token のURLを追加する．

- 最低２つのURLを指定する必要があるようなので，API GatewayのStageとdefualtのバージョンを指定する．

### Amazon Alexa Skillの設定

#### アカウントリンク
認証種別としてImplicit Grantを選択し，認証画面URIにAPI Gatewayの/oauth/request_tokenのURLを設定する．

#### エンドポイント
エンドポイントに，alexa-tweet_skillのLambdaを設定する

#### インテント
TweetRequestとしてツイートの発話のリクエストを作成する．

# 構成
### ソースコードのエントリポイント
- src/oauth/index.ts: OAuth認証をするためのREST API．
- src/skill/index.ts: Amazon echoスキル本体コード．

### OAuth認証
Amazon echoのスキルがツイートをするためにツイッターのOAuth認証を行います．
Amazon echoはOAuth2が必要ですが，2018年7月29日現在ツイッターのツイート用APIはOAuth1認証です．
そこで，認証時にトンネリングすることで，OAuth1, OAuth2の変換を行っています．

トンネリングを行うために，ApiGateway + LambdaでAmazon echoからの認証をリクエストを受け付け認証処理を仲介します．

### 依存パラメータの取得
ツイッターのAPIキー(Consumer Key) 及びAPI秘密キー(Consumer Secret)はSSMのParameterStoreから取得します．
ソースコード上では，envのプロパティから取得しています．

| 内容 | パラメータストア | ソースコード内での取得 | 
|:---|:----|:---|
| Consumer Key | TWITTER_CONSUMER_KEY | env.twitter.oauth.key | 
| Consumer Secret | TWITTER_CONSUMER_SECRET | env.twitter.oauth.secret |

