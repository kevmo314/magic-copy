const webpack = require("webpack");
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const srcDir = path.join(__dirname, "..", "src");

module.exports = {
  mode: "production",
  entry: {
    figma: path.join(srcDir, "figma.ts"),
    figmaUi: path.join(srcDir, "figma_ui.ts"),
  },
  output: {
    path: path.join(__dirname, "../dist/js"),
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
          from: ".",
          to: "../",
          context: "public",
          filter: (resourcePath) => {
            return !resourcePath.endsWith(".json");
          },
        },
      ],
      options: {},
    }),
    new CopyPlugin({
      patterns: [
        {
          from: "./public/manifest.figma.json",
          to: "../manifest.json",
        },
      ],
      options: {},
    }),
  ],
};
