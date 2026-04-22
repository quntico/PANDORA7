
import { PandoraOrchestrator } from '../lib/PandoraOrchestrator.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function test() {
  const orchestrator = new PandoraOrchestrator();
  const payload = {
    message: "Hola, ¿quién eres?",
    userId: "test-user",
    projectId: "83514186-0f21-44d1-971c-42b8b341b6de", // El ID que encontramos antes
    v2: true,
    projectContext: {
      projectName: "Test Project",
      vaultContext: "Esta es una nota de prueba de la bóveda."
    }
  };

  try {
    console.log('Starting execution...');
    const result = await orchestrator.execute(payload, 'test-rq-123');
    console.log('Execution Success:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Execution Error:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

test();
