const webpack = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, "..", "src");
const InlineChunkHtmlPlugin = require("react-dev-utils/InlineChunkHtmlPlugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  devtool: "inline-source-map",
  mode: "development",
  entry: {
    figma: path.join(srcDir, "figma.ts"),
    figmaUi: path.join(srcDir, "figma_ui.tsx"),
  },
  output: {
    path: path.join(__dirname, "../dist/"),
    filename: "[name].js",
  },
  optimization: {
    runtimeChunk: false,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "./public/manifest.figma.json",
          to: "./manifest.json",
        },
      ],
      options: {},
    }),
    new HtmlWebpackPlugin({
      inject: "body",
      template: "./src/figma.html",
      filename: "figma.html",
      chunks: ["figmaUi"],
      cache: false,
    }),
    new InlineChunkHtmlPlugin(HtmlWebpackPlugin, [/figmaUi/]),
  ],
};
