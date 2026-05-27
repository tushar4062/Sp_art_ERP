const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

function loadEnv(envPath) {
  const env = {};
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    env[key.trim()] = rest.join('=').trim().replace(/^"|"$/g, '');
  }
  return env;
}

const env = loadEnv(path.resolve(process.cwd(), '.env'));

async function main() {
  const uri = env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found');
    process.exit(1);
  }

  const client = new MongoClient(uri, {});

  await client.connect();
  const db = client.db();
  const enrollments = db.collection('courseenrollments');
  const one = await enrollments.findOne({});
  console.log('Enrollment sample:', JSON.stringify(one, null, 2));
  if (one) {
    const courses = db.collection('courses');
    const course = await courses.findOne({ _id: one.courseId });
    console.log('Course sample:', JSON.stringify(course, null, 2));
    const students = db.collection('students');
    const student = await students.findOne({ _id: one.studentId });
    console.log('Student sample:', JSON.stringify(student, null, 2));
  }

  await client.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
