const path = require("path");

const mode =
  process.env.NODE_ENV === "production" ? "production" : "development";

module.exports = {
  mode,
  target: "node",
  entry: "./webpack-entry.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    library: {
      type: "commonjs2",
    },
    clean: true,
  },
  resolve: {
    extensions: [".js", ".json"],
  },
  stats: "errors-warnings",
  infrastructureLogging: {
    level: "error",
  },
};
