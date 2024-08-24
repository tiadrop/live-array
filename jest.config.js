const config = {
  coverageProvider: "v8",
  transform: {
    "^.+\\.(t|j)s$": ["@swc/jest"]
  },
  testEnvironment: "node",
};

module.exports = config;
