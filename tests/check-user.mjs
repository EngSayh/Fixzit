import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.development" });
dotenv.config();

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

async function test() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("❌ MONGODB_URI not found in environment");
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");

    // Define a simple User schema
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model("User", userSchema, "users");

    // Check if admin user exists
    const admin = await User.findOne({ email: `admin@${EMAIL_DOMAIN}` });
    if (admin) {
      console.log("✅ Admin user found:", {
        email: admin.email,
        hasPassword: !!admin.password,
        role: admin.role || admin.professional?.role,
        isActive:
          admin.isActive !== undefined
            ? admin.isActive
            : admin.status === "ACTIVE",
      });
    } else {
      console.log(`❌ Admin user NOT found with email: admin@${EMAIL_DOMAIN}`);

      // Check what users exist
      const count = await User.countDocuments();
      console.log("Total users in database:", count);

      if (count > 0) {
        const sample = await User.find({}, { email: 1, username: 1 }).limit(5);
        console.log("Sample users:", JSON.stringify(sample, null, 2));
      }
    }

    await mongoose.disconnect();
    console.log("✅ Test complete");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

test();
