import { SubmissionsRepository } from '../src/modules/submissions/submissions.repository';
import { SubmissionsService } from '../src/modules/submissions/submissions.service';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const repo = new SubmissionsRepository();
  const service = new SubmissionsService(repo);
  try {
    console.log('Triggering findMatch programmatically for Gurugram submission...');
    const result = await service.findMatch(
      '761b58b9-2953-4646-9d30-25c2edde2e48', 
      '47adc573-9854-4b35-b7a5-fe6a2101043a'
    );
    console.log('MATCH RESULT:', result);
  } catch (err: any) {
    console.error('ERROR:', err.message, err.stack);
  }
  process.exit(0);
}

run();
