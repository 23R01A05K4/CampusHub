const mongoose = require("mongoose");

// Use MONGO_URI if set; otherwise build an Atlas URI from separate parts so the
// password never has to be pasted into a connection string by hand.
function getMongoUri() {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  const { MONGO_HOST, MONGO_USER, MONGO_PASSWORD, MONGO_DB } = process.env;
  if (MONGO_HOST && MONGO_USER && MONGO_PASSWORD) {
    return `mongodb+srv://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASSWORD)}@${MONGO_HOST}/${MONGO_DB || "campushub"}?retryWrites=true&w=majority`;
  }
  return null;
}

const connectDB = async () => {
  const uri = getMongoUri();
  if (!uri) {
    console.warn('MONGO_URI not set — skipping DB connection (use .env to provide).');
    return;
  }
  try {
    await mongoose.connect(uri);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.getMongoUri = getMongoUri;
