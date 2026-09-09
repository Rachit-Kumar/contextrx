/**
 * ContextRx — DynamoDB Seed Script (Node.js)
 * 
 * No AWS CLI needed. Just set your credentials in data/.env
 * 
 * Usage:
 *   cd data
 *   npm install
 *   npm run seed
 */

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall } = require("@aws-sdk/util-dynamodb");
const fs = require("fs");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────────────
const REGION    = process.env.AWS_REGION          || "ap-south-1";
const TABLE     = process.env.DYNAMODB_TABLE_NAME  || "PatientRecords";
const KEY_ID    = process.env.AWS_ACCESS_KEY_ID;
const SECRET    = process.env.AWS_SECRET_ACCESS_KEY;

// ── Validate credentials are present ─────────────────────────────────────────
if (!KEY_ID || !SECRET) {
  console.error("\nERROR: AWS credentials not found.");
  console.error("Add these to data/.env:");
  console.error("  AWS_ACCESS_KEY_ID=your_key");
  console.error("  AWS_SECRET_ACCESS_KEY=your_secret\n");
  process.exit(1);
}

// ── Init DynamoDB client ──────────────────────────────────────────────────────
const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: KEY_ID,
    secretAccessKey: SECRET,
  },
});

// ── Load patients ─────────────────────────────────────────────────────────────
const patientsPath = path.join(__dirname, "patients.json");
const patients = JSON.parse(fs.readFileSync(patientsPath, "utf-8"));

// ── Seed ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("\nContextRx — DynamoDB Seed Script (Node.js)");
  console.log(`Table  : ${TABLE}`);
  console.log(`Region : ${REGION}`);
  console.log(`File   : ${patientsPath}\n`);
  console.log(`Loaded ${patients.length} patient(s) from JSON.`);

  let success = 0;
  for (const patient of patients) {
    const name = patient?.demographics?.name || "Unknown";
    try {
      await client.send(new PutItemCommand({
        TableName: TABLE,
        Item: marshall(patient, { removeUndefinedValues: true }),
      }));
      console.log(`  ✓ Seeded: ${patient.patient_id} (${name})`);
      success++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${patient.patient_id} — ${err.message}`);
    }
  }

  console.log(`\nDone: ${success}/${patients.length} patients seeded to '${TABLE}'.`);
}

seed().catch((err) => {
  console.error("\nUnexpected error:", err.message);
  process.exit(1);
});
