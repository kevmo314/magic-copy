const CopyPlugin = require("copy-webpack-plugin");
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

module.exports = merge(common, {
  devtool: "inline-source-map",
  mode: "development",
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "./public/manifest.chrome.json",
          to: "../manifest.json",
        },
      ],
      options: {},
    }),
  ],
});
