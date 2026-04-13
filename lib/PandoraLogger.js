
import dotenv from 'dotenv';

dotenv.config();

/**
 * PANDORA LOGGER / OBSERVABILITY
 * Senior professional logging for PANDORA V2.
 */
export class PandoraLogger {
  static get isDebug() {
    return process.env.NODE_ENV !== 'production' || process.env.PANDORA_DEBUG === 'true';
  }

  static get isVerbose() {
    return process.env.PANDORA_DEBUG_VERBOSE === 'true';
  }

  static logRequestStage(requestId, stage, details) {
    if (!this.isDebug) return;
    
    console.log(`\n[PANDORA V2] (STAGE: ${stage})`);
    console.log(`request_id=${requestId}`);
    if (details) {
      Object.keys(details).forEach(key => {
        if (!key.toLowerCase().includes('key') && !key.toLowerCase().includes('token')) {
          console.log(`${key}=${JSON.stringify(details[key])}`);
        }
      });
    }
  }

  static logSuccess(requestId, stats) {
    if (!this.isDebug) return;
    
    console.log(`\n[PANDORA V2] (200 OK)`);
    console.log(`request_id=${requestId}`);
    console.log(`timestamp=${new Date().toLocaleString()}`);
    if (stats) {
      Object.keys(stats).forEach(key => {
        console.log(`${key}=${stats[key]}`);
      });
    }
    console.log(`status=SUCCESS\n`);
  }

  static logError(requestId, stage, errorMessage) {
    if (!this.isDebug) return;
    
    console.error(`\n[PANDORA V2] !!! ERROR !!!`);
    console.error(`request_id=${requestId}`);
    console.error(`stage=${stage}`);
    console.error(`error=${errorMessage}`);
    console.error(`status=FAILED\n`);
  }
}
