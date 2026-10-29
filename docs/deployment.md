# 公開手順

本番の会員データを扱うため、GitHub・Cloudflare・Googleの接続と実アカウントでの疎通確認が必要です。メール配送は送信元の設定後に検証します。イベントは雛形のため、Stripeの接続と有料募集は保留しています。秘密情報は `.dev.vars` または `wrangler secret put` に入力し、Git・チャット・画面のURLへ含めません。

## 現在の接続状況（2026年10月29日）

- GitHub APIで `LilDayne30` と確認済みメール `danaoki30@gmail.com` の一致を再確認しました。`workflow` 権限の追加承認も完了しています。公開先は既存の [LilDayne30/machi-community](https://github.com/LilDayne30/machi-community) のみです。
- Cloudflare CLIを再認証し、`danaoki30@gmail.com` と既存D1のあるアカウントIDの一致を確認しました。
- 既存D1の未適用だった0003（写真）・0004（地域との関係）・0005（管理操作）を適用しました。0001〜0005の移行履歴、追加テーブル、285の地域、会員0件・管理セッション0件を実SQLで読み戻しました。DBは再作成していません。
- Cloudflareが返した利用者アプリの実URLは `https://machi-community.lildayne.workers.dev` です。設定の `APP_ORIGIN` と管理サイト間のリンクを、このアカウントの実サブドメインへ揃えました。
- 管理サイトは別Worker `machi-admin` で配信します。管理者ログインは保留のままで、本番は未認証ロックを維持します。
- 本番には所有者メールを `ADMIN_EMAIL` として設定しました。Google OAuthのクライアントID・シークレットは未設定で、実Googleログインは未完了です。ローカルも同様です。
- Stripe・Resendは未接続、リモートWorkers AIの実応答は未検証です。AI bindingの本番バンドルには成功しています。一般利用者へのAI公開や、自動の通報処分は行いません。
- 188のローカル検証ケース（ブラウザ・API 127、単体61）の結果と、追加操作の範囲は [検証記録](testing.md) を参照してください。公開URLとGitHub Actionsの検証は別に記録します。

以下は接続を完了する手順です。すでに作成したリポジトリやD1を重複作成しないでください。

`npm run api:dev` は `wrangler dev --local` を使い、開発・テストをローカルで実行します。Workers AIの実応答を確認する際はCloudflare CLI認証後に `npx wrangler dev --port 8787` でremote bindingを有効にしてください。

## 別管理サイトとログイン保留

管理者ログインは保留中です。`npm run admin:api` と `npm run admin:dev` で、[ローカル管理サイト](http://127.0.0.1:5174/) のサンプルを操作できます。機能・技術選定・認証再開時の注意は [管理サイトの説明](admin.md) に記載しています。

ビルド先を `dist/community` と `dist/admin` に分離しました。利用者向けWorkerは `wrangler.jsonc`、管理用Workerは `wrangler.admin.jsonc` を使います。0001〜0005のマイグレーションはローカル・本番とも適用済みです。今後は未適用分だけを確認し、適用します。

管理用は `npm run deploy:admin` で別Workerへ配信する構成です。配信先は `https://machi-admin.lildayne.workers.dev` です。ログイン保留中の本番画面はロックされ、管理セッションを発行する経路はありません。利用者向けAPIのCookieでは管理APIを使用できません。定期処理は利用者Workerだけで実行します。

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
- 承認済みリダイレクトURI：`https://machi-community.lildayne.workers.dev/api/auth/callback`。
- OAuth同意画面がテスト中の場合は、利用者をテストユーザーに登録します。

```sh
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

最初に `ADMIN_EMAIL` のGoogleアカウントでログインすると運営者になります。他の新規会員は事前招待が必要です。管理者ログインは保留中なので、本番の招待登録・運営操作はまだ開始しません。保留の解除と管理認証を別途合意してから、「募集・招待」で登録する運用を再開します。テスト用会員・固定セッションを本番に投入しないでください。招待の有効期間は30日で、招待メールの自動送信はありません。

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

## 4. Stripe（イベント運用の再開時）

現在のイベント一覧・詳細は企画の雛形で、申込み・決済を行いません。有料募集を開始する際にStripeのテストモードで接続し、確認後に本番キーへ切り替えます。

```sh
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Webhookは `APP_ORIGIN/api/stripe/webhook` に設定し、次を購読します。

- `checkout.session.completed`
- `checkout.session.expired`

Checkoutはカード払い、JPY固定です。Webhookの署名と時刻、Checkout Session ID、会員ID、予約ID、金額、通貨、入金状態を照合し、入金通知の受信後に参加確定します。戻りURLでは確定しません。StripeイベントIDと冪等キーで重複確定・重複返金を防ぎます。

有料予約は30分間の仮押さえです。遅れて届いた入金は返金待ちにし、Cronが返金します。開始24時間前までのキャンセルは全額返金、それ以降は返金なしです。運営から既存トークを中止すると、入金済み予約を返金待ちへ移し、通知の重複を防ぎます。実際の返金応答はStripe接続後に検証します。

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

公開用D1 ID・HTTPSオリジン・production設定がない場合、`deploy` は停止します。配信が返した実URLと `APP_ORIGIN` が一致することを確認してください。設定例からサブドメインを推測せず、実URLをGoogle OAuthにも登録します。

公開URLでは以下を順に確認します。

1. 利用者・管理のHTTPSページが表示され、本番でプレビューの架空会員・会話を返さない。
2. Google設定前は未接続と表示する。設定後、所有者の実Googleログイン、取消、未招待の拒否、ログアウトを確認する。
3. 招待運用の再開後、実会員がプロフィール・写真・立場・居住地を保存し、相手を探して1対1で往復できる。同じ相手の履歴に戻れる。
4. 個人会話と写真は第三者へ開示せず、ブロック後は双方が送信できない。会話受付を停止しても既存の履歴は維持する。
5. イベント雛形では申込みを開始しない。管理は保留中の未認証ロックを維持し、利用者Cookieで管理APIを通さない。
6. メールとWorkers AIの実接続は、設定後に配送・応答を別途確認する。管理画面の操作を再開する場合は、管理認証の保留を先に解消する。

イベントの実募集・決済を再開するときは、無料／有料予約、Stripe署名済み通知、同時定員管理、キャンセル・返金・開催リンクの配送を追加で確認します。ローカルの模擬テスト合格と、実サービスでの支払い・配送の成功は区別します。

GitHub Actionsで公開する場合はproduction環境に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を登録し、「Deploy to Cloudflare」を手動実行します。OAuth・Stripe・メールのruntime secretは、先にCloudflare側へ設定してください。

## 検証指標と運用上の境界

- 再接点：同じ小部屋で最初の投稿から14日以上後に再投稿し、別参加者の直近投稿がある参加者を集計。厳密な同一相手との相互再接触は、投稿と参加履歴を人が照合してください。
- 予約・有料需要：bookingsに初回無料／有料金額、入金待ち／確定／参加／返金の状態を保持。
- 住民の継続：users.profile.relationと参加記録を照合。進行役はトークのhost・運営記録と分けて確認。
- プロ相談：送信・受諾・有料成立を運営が更新。サービス代金の徴収や自動送金は行わない。
- 採算：参加費と原価を記録。決済費・謝礼・調整人件費は手入力。会計ソフトとの自動連携はしない。
- 会話更新：小規模運用では12秒ごとの取得を採用。利用量が増えたらDurable Objects / WebSocketへ移行可能。
- PWA：静的ファイルのみキャッシュ。ログイン、会話、相談、予約はオフラインで開示・送信しない。
