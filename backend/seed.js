// Idempotent demo seed. Creates read-only demo accounts and a few neutral sample events.
// Needs DEMO_ADMIN_PASSWORD and DEMO_STUDENT_PASSWORD (12+ chars) in the environment.
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./models/User");
const Event = require("./models/Event");
const { getMongoUri } = require("./config/db");

async function run() {
  const { DEMO_ADMIN_PASSWORD, DEMO_STUDENT_PASSWORD } = process.env;
  const MONGO_URI = getMongoUri();
  if (!MONGO_URI || !DEMO_ADMIN_PASSWORD || !DEMO_STUDENT_PASSWORD) {
    console.log("Seed skipped: database settings, DEMO_ADMIN_PASSWORD or DEMO_STUDENT_PASSWORD not set.");
    return;
  }
  if (DEMO_ADMIN_PASSWORD.length < 12 || DEMO_STUDENT_PASSWORD.length < 12) throw new Error("Demo passwords must be 12+ characters.");
  await mongoose.connect(MONGO_URI);

  const ensure = async (email, name, role, password) => {
    let u = await User.findOne({ email }).select("+password");
    if (!u) {
      u = await User.create({ name, email, role, college: "Demo College", password: await bcrypt.hash(password, 10), demoReadOnly: true, profileComplete: true });
      console.log("Created", role, email);
    } else if (!(await bcrypt.compare(password, u.password))) {
      // Keep the demo password in sync with the environment (allows rotation).
      u.password = await bcrypt.hash(password, 10);
      u.demoReadOnly = true;
      await u.save();
      console.log("Updated password for", email);
    }
    return u;
  };
  const admin = await ensure("demo-admin@example.com", "Demo Admin", "admin", DEMO_ADMIN_PASSWORD);
  await ensure("demo-student@example.com", "Demo Student", "student", DEMO_STUDENT_PASSWORD);

  if ((await Event.countDocuments({ admin: admin._id })) === 0) {
    const day = 24 * 3600 * 1000;
    const mk = (title, category, location, description, inDays, price) => ({
      title, category, location, description, ticketPrice: price,
      eventDate: new Date(Date.now() + inDays * day),
      registrationEndDate: new Date(Date.now() + (inDays - 1) * day),
      image: "demo-banner.svg", admin: admin._id,
    });
    await Event.insertMany([
      mk("Hack Night", "Technical", "Seminar Hall A", "An evening of team coding and demos.", 21, null),
      mk("Open Mic Evening", "Cultural", "Auditorium", "Music, poetry and stand-up from students.", 28, 50),
      mk("Inter-Department Sports Day", "Sports", "Main Ground", "Friendly matches across departments.", 35, null),
    ]);
    console.log("Created sample events");
  }
  await mongoose.disconnect();
}
run().catch((e) => { console.error(e.message); process.exit(1); });
