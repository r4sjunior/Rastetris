if (process.env.DATABASE_URL) {
  require("child_process").execSync("drizzle-kit push --force --verbose", {
    stdio: "inherit",
  });
}
