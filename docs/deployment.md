# 公開手順

本番の会員データを扱うため、GitHub・Cloudflare・Google・Stripe・メール送信元の接続設定が必要です。秘密情報は `.dev.vars` または `wrangler secret put` に入力し、Git・チャット・画面のURLへ含めません。

## 現在の準備状況（2026年10月23日）

- GitHubの `LilDayne30` と、確認済みメール `danaoki30@gmail.com` の一致をブラウザで確認済みです。
- publicリポジトリ [LilDayne30/machi-community](https://github.com/LilDayne30/machi-community) は作成済みです。ソースの送信はまだ完了していません。
- Cloudflareの `Danaoki30@gmail.com's Account` に `machi-community` D1をアジア配置で作成しました。`wrangler.jsonc` はこのアカウントとDBへ設定済みです。
- 本番D1の初期スキーマを適用し、18テーブル・7インデックス・会員0件を実SQLで確認しました。`d1_migrations` に `0001_initial.sql` の適用済み記録もあります。DBを再作成しないでください。
- 1対1会話を追加する `0002_direct_conversations.sql` はローカル・本番へ適用済みです。本番でも追加テーブル・3つのトリガー・移行履歴を読み戻しました。今後の未適用分は `npm run db:remote` で適用します。既存の小部屋や履歴を引き継ぎます。
- 写真用の `0003_profile_photos.sql` はローカルへ適用済みです。今回のWorkerを本番へデプロイする前に `npm run db:remote` で本番にも適用してください。居住地域用の `0004_region_connections.sql` もローカルへ適用済み・本番へ未適用です。デプロイ前に0003・0004を両方適用してください。国籍・街・興味のある地域は既存のprofile JSONで保持します。既存会員は国籍登録後にメッセージを送れるようになります。
- 居住地域用の `0004_region_connections.sql` もローカルへ適用済み、本番へは未適用です。共通の地域カタログと会員・地域の関係テーブルを追加します。既存会員の国籍や自由記述の街から関係を推定して移行しません。既存のプロフィール・会話は保持します。0003・0004を適用してから新しいWorkerをデプロイしてください。
- 配信先の設定は `https://machi-community.danaoki30.workers.dev` です。これは設定上の公開予定URLで、デプロイ済みという意味ではありません。
- Google OAuthの設定は、Google Cloudの本人確認・多要素認証などの要件を満たしたアカウントで行ってください。
- デプロイにはCLI認証と、Google OAuth / Stripe / Resendのruntime secretの設定が必要です。秘密情報はリポジトリへ保存しません。

以下は接続を完了する手順です。すでに作成したリポジトリやD1を重複作成しないでください。

`npm run api:dev` は `wrangler dev --local` を使い、開発・テストをローカルで実行します。Workers AIの実応答を確認する際はCloudflare CLI認証後に `npx wrangler dev --port 8787` でremote bindingを有効にしてください。

## 別管理サイト（2026年10月24日）

管理者ログインは保留中です。`npm run admin:api` と `npm run admin:dev` で、[ローカル管理サイト](http://127.0.0.1:5174/) のサンプルを操作できます。機能・技術選定・認証再開時の注意は [管理サイトの説明](admin.md) に記載しています。

ビルド先を `dist/community` と `dist/admin` に分離しました。利用者向けWorkerは `wrangler.jsonc`、管理用Workerは `wrangler.admin.jsonc` を使います。0005の管理操作用マイグレーションもローカルへ適用済み、本番へ未適用です。公開前に0003〜0005を適用してください。

管理用は `npm run deploy:admin` で別Workerへ配信する構成です。公開予定URLは `https://machi-admin.danaoki30.workers.dev` で、まだ公開していません。ログイン保留中の本番画面はロックされ、管理セッションを発行する経路はありません。利用者向けAPIのCookieでは管理APIを使用できません。定期処理は利用者Workerだけで実行します。

## 1. GitHub

`gh` を認証し、本人がOAuthの承認を完了します。

```sh
gh auth login --hostname github.com --git-protocol https --web --scopes user:email,workflow
npm run publish:github
```

スクリプトは `gh api user` と `gh api user/emails` を取得し、`LilDayne30` / `danaoki30@gmail.com`（確認済み）以外での作成・Pushを止めます。作成するリポジトリはpublicです。既存の別アカウントのGit認証設定は変更しません。GitHub CLIの場所が標準PATH以外なら `GH_CLI_EXECUTABLE` に絶対パスを設定します。

CI・デプロイのワークフローファイルも含むため、GitHubは `workflow` 権限を要求します。既存のCLI認証にこの権限がない場合は `gh auth refresh --hostname github.com --scopes workflow` を実行し、本人が追加承認してください。承認前のPushはGitHubが拒否します。

## 2. Cloudflare

```sh
npx wrangler login
```

このリポジトリの公開先アカウント・D1 ID・workers.devオリジンは設定済みです。既存D1をそのまま使用してください。別環境へ新規導入する場合に限り、`npx wrangler d1 create machi-community --location apac` でDBを作成し、返されたdatabase_idと配信先オリジンを `wrangler.jsonc` に設定します。カスタムドメインの場合はそのHTTPSオリジンを設定してください。末尾のスラッシュは不要です。

`vars.APP_ENV=production`、`vars.DEMO_MODE=false` を維持します。ローカルの `.dev.vars` は公開されません。`ADMIN_EMAIL` をsecretとして `danaoki30@gmail.com` に設定します。

```sh
npx wrangler secret put ADMIN_EMAIL
npm run db:remote
```

`db:remote` は適用済み履歴を確認し、未適用分だけを実行します。初期スキーマはすでに適用・記録済みなので、SQLを手動で再実行しないでください。本番マイグレーションにはテスト会員・固定セッション・架空の店舗は含まれません。

## 3. Google認証

Google Cloud ConsoleでWebアプリ用OAuthクライアントを作成します。必要なスコープは `openid email profile` だけです。

- 承認済みJavaScript生成元：`APP_ORIGIN` と同じHTTPSオリジン。
- 承認済みリダイレクトURI：`https://<公開ドメイン>/api/auth/callback`。
- OAuth同意画面がテスト中の場合は、利用者をテストユーザーに登録します。

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

最初に `ADMIN_EMAIL` のGoogleアカウントでログインすると運営者になります。他の新規会員は事前招待が必要です。「運営管理 → 募集・招待」からメールアドレスを登録してください。招待の有効期間は30日です。招待メールは自動送信せず、運営者がアプリURLを本人へ共有します。

認証は認可コード＋PKCE、state、nonce、Googleの公開鍵、issuer、audience、email_verifiedを検証します。セッションはランダム値をHttpOnly / Secure / SameSite=Lax Cookieへ入れ、DBにはそのSHA-256だけを保存します。

### ローカルでGoogleログインを有効にする

現在のローカル版はGoogleのクライアントID・シークレットが未設定です。Google Cloud側の本人確認を完了してから、Webアプリ用のOAuthクライアントを作成します。クライアント作成画面で次を登録してください。

- 承認済みJavaScript生成元：`http://127.0.0.1:5173`
- 承認済みリダイレクトURI：`http://127.0.0.1:5173/api/auth/callback`
- テストユーザー：まず運営用のGoogleアカウント。

`localhost` と `127.0.0.1`、ポート、パスは別のURIです。`.dev.vars` の `APP_ORIGIN` と完全に一致させます。詳細は[Google公式の認可コードフロー](https://developers.google.com/identity/protocols/oauth2/web-server)を参照してください。

Googleから取得したWebクライアントのJSONをリポジトリ外へ保存し、次で取り込みます。シークレットをチャットへ貼り付ける必要はありません。

```sh
npm run auth:google -- /絶対パス/client_secret.json
```

このコマンドは承認済みコールバックの一致を確認してから、Git対象外の `.dev.vars` にだけ保存します。秘密情報は出力せず、ファイルの権限を所有者のみの読み書きにします。本番Workerのsecretは別途前記の手順で登録します。APIサーバーが設定を読み直した後、`/profile` の「Googleで続ける」でログインします。

取消・期限切れ・未招待・トークン検証失敗はプロフィール画面へ戻して案内します。模擬プロバイダーのテストと、実Googleアカウントを使う疎通確認は別に記録します。実アカウントの成功確認は未完了です。

## 4. Stripe

Stripeのテストモードで接続し、確認後に本番キーへ切り替えます。

```sh
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Webhookは `APP_ORIGIN/api/stripe/webhook` に設定し、次を購読します。

- `checkout.session.completed`
- `checkout.session.expired`

Checkoutはカード払い、JPY固定です。Webhookの署名と時刻、Checkout Session ID、会員ID、予約ID、金額、通貨、入金状態を照合し、入金通知の受信後に参加確定します。戻りURLでは確定しません。StripeイベントIDと冪等キーで重複確定・重複返金を防ぎます。

有料予約は30分間の仮押さえです。遅れて届いた入金は返金待ちにし、Cronが返金します。開始24時間前までのキャンセルは全額返金、それ以降は返金なしです。運営都合で中止した場合の一括キャンセルは、現段階では個別予約の確認と手動対応が必要です。

## 5. メール

Resendで送信ドメインを認証し、APIキーと送信元を設定します。

```sh
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
```

D1 outboxへ通知を蓄積し、15分間隔のCronで再試行します。初期構成のメール通知は即時配信を保証しません。「開催・メール」からの会議リンク送信は配信処理を即実行します。配送が失敗した通知はoutboxに残ります。5回失敗した通知は運営で確認して再投入します。

## 6. Workers AI

`wrangler.jsonc` の `ai.binding=AI` を使用します。モデルは `@cf/meta/llama-3.3-70b-instruct-fp8-fast`。通報画面の明示操作で最大10件を分類し、JSONをZodで検証します。出力はテーマと確認候補で、通報対応状態は自動変更しません。一般利用者にAIを直接公開していません。

## 7. デプロイと運営開始

```sh
npm run test:all
npm run deploy
```

公開用D1 ID・HTTPSオリジン・production設定がない場合、`deploy` は停止します。設定後に生成されたworkers.dev URLで以下を実機確認します。

1. 招待されたGoogleアカウントでログイン。未招待アカウントは拒否される。
2. 運営者が未来のトークを募集し、無料の初回予約ができる。
3. 別のトークでStripeテスト決済。署名済みWebhookでのみ確定する。
4. キャンセル・返金・開催リンク・返信メールが届く。
5. 同じトークの4〜6人を小部屋へ割り当て、参加者だけが投稿を読める。
   個人会話では双方が受付をオンにし、プロフィールからメッセージを往復する。同じ相手で履歴に戻れること、第三者の非開示、ブロック後の両者の送信拒否、受付オフでも既存の会話を継続できることを確認する。
6. 事業者の会員を登録・確認し、相談者と指定事業者だけに相談が見える。
7. 通報のAI分類と人による対応を確認する。

GitHub Actionsで公開する場合はproduction環境に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を登録し、「Deploy to Cloudflare」を手動実行します。OAuth・Stripe・メールのruntime secretは、先にCloudflare側へ設定してください。

## 検証指標と運用上の境界

- 再接点：同じ小部屋で最初の投稿から14日以上後に再投稿し、別参加者の直近投稿がある参加者を集計。厳密な同一相手との相互再接触は、投稿と参加履歴を人が照合してください。
- 予約・有料需要：bookingsに初回無料／有料金額、入金待ち／確定／参加／返金の状態を保持。
- 住民の継続：users.profile.relationと参加記録を照合。進行役はトークのhost・運営記録と分けて確認。
- プロ相談：送信・受諾・有料成立を運営が更新。サービス代金の徴収や自動送金は行わない。
- 採算：参加費と原価を記録。決済費・謝礼・調整人件費は手入力。会計ソフトとの自動連携はしない。
- 会話更新：小規模運用では12秒ごとの取得を採用。利用量が増えたらDurable Objects / WebSocketへ移行可能。
- PWA：静的ファイルのみキャッシュ。ログイン、会話、相談、予約はオフラインで開示・送信しない。
