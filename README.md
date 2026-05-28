# Armyknife Extension

Chrome 拡張として、ツールバーのポップアップから Web 関連ツールを実行できます。

## アイコン

拡張アイコンは `icons/` にあります（16 / 32 / 48 / 128px）。差し替える場合は同じファイル名で上書きし、拡張を再読み込みしてください。

## 使い方

1. Chrome の `chrome://extensions` を開く
2. 「デベロッパーモード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択
4. ツールバーから拡張を開いて「見出し階層を表示」を実行

## 拡張しやすい構成

- ツール本体: `popup/tools/*.js`
- ツール登録: `popup/tools/index.js`
- UI と実行制御: `popup/popup.js`

新しいツールを追加する場合:

1. `popup/tools/` に新規ファイルを作成
2. `id`, `title`, `description`, `run(tabId)` を持つオブジェクトを export
3. `popup/tools/index.js` に追加

これでポップアップに自動で表示され、実行できるようになります。
