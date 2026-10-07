import { createClient } from '@supabase/supabase-js';

// FULLY HARDCODED CREDENTIALS FOR PRODUCTION DEBUGGING
// This bypasses any environment variable injection issues completely.

const supabaseUrl = 'https://tbqoreremmusplbznmfn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRicW9yZXJlbW11c3BsYnpubWZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDc2NDIsImV4cCI6MjA4NjE4MzY0Mn0.Z2rLoB4CYRGfq-yahkTsTpzXqXhya1pJzHcLw2arblg';

/*
console.log('[Debug] Force using hardcoded URL:', supabaseUrl);
*/

// Create client directly
const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});

// Proxy/Wrapper to intercept calls to project_context_beta keys
const proxyClient = new Proxy(client, {
  get(target, propKey, receiver) {
    const origMethod = target[propKey];
    if (propKey === 'from') {
      return function (tableName) {
        const queryBuilder = origMethod.apply(target, arguments);
        if (tableName === 'project_context_beta') {
          // Intercept eq('key', 'sim_...')
          const origEq = queryBuilder.eq;
          queryBuilder.eq = function (column, value) {
            if (column === 'key' && typeof value === 'string' && value.startsWith('sim_') && value.endsWith('_data')) {
              // Extract the simulator ID from current pathname
              const match = window.location.pathname.match(/\/simulators\/(sim_[^\/]+)/i);
              if (match) {
                const currentSimId = match[1];
                const newValue = `sim_${currentSimId}_data`;
                return origEq.call(this, column, newValue);
              }
            }
            return origEq.apply(this, arguments);
          };

          // Also intercept insert/update/upsert to rewrite the payload keys!
          const origInsert = queryBuilder.insert;
          queryBuilder.insert = function (values, options) {
            const match = window.location.pathname.match(/\/simulators\/(sim_[^\/]+)/i);
            if (match) {
              const currentSimId = match[1];
              const rewritePayload = (payload) => {
                if (Array.isArray(payload)) {
                  return payload.map(p => {
                    if (p && p.key && p.key.startsWith('sim_') && p.key.endsWith('_data')) {
                      return { ...p, key: `sim_${currentSimId}_data` };
                    }
                    return p;
                  });
                } else if (payload && payload.key && payload.key.startsWith('sim_') && payload.key.endsWith('_data')) {
                  return { ...payload, key: `sim_${currentSimId}_data` };
                }
                return payload;
              };
              return origInsert.call(this, rewritePayload(values), options);
            }
            return origInsert.apply(this, arguments);
          };

          const origUpsert = queryBuilder.upsert;
          queryBuilder.upsert = function (values, options) {
            const match = window.location.pathname.match(/\/simulators\/(sim_[^\/]+)/i);
            if (match) {
              const currentSimId = match[1];
              const rewritePayload = (payload) => {
                if (Array.isArray(payload)) {
                  return payload.map(p => {
                    if (p && p.key && p.key.startsWith('sim_') && p.key.endsWith('_data')) {
                      return { ...p, key: `sim_${currentSimId}_data` };
                    }
                    return p;
                  });
                } else if (payload && payload.key && payload.key.startsWith('sim_') && payload.key.endsWith('_data')) {
                  return { ...payload, key: `sim_${currentSimId}_data` };
                }
                return payload;
              };
              return origUpsert.call(this, rewritePayload(values), options);
            }
            return origUpsert.apply(this, arguments);
          };

          const origUpdate = queryBuilder.update;
          queryBuilder.update = function (values, options) {
            const match = window.location.pathname.match(/\/simulators\/(sim_[^\/]+)/i);
            if (match) {
              const currentSimId = match[1];
              const rewritePayload = (payload) => {
                if (payload && payload.key && payload.key.startsWith('sim_') && payload.key.endsWith('_data')) {
                  return { ...payload, key: `sim_${currentSimId}_data` };
                }
                return payload;
              };
              return origUpdate.call(this, rewritePayload(values), options);
            }
            return origUpdate.apply(this, arguments);
          };
        }
        return queryBuilder;
      };
    }
    return typeof origMethod === 'function' ? origMethod.bind(target) : origMethod;
  }
});

export const supabase = proxyClient;

/**
 * Uploads a file to Supabase Storage with progress tracking using raw XMLHttpRequest
 */
export const uploadFileWithProgress = (bucketName, path, file, onProgress) => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `${supabaseUrl}/storage/v1/object/${bucketName}/${path}`;
        
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Authorization', `Bearer ${supabaseAnonKey}`);
        xhr.setRequestHeader('apikey', supabaseAnonKey);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        
        // Track upload progress
        if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentage = Math.round((event.loaded / event.total) * 100);
                    onProgress(percentage);
                }
            };
        }
        
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve({ data, error: null });
                } catch (e) {
                    resolve({ data: { path }, error: null });
                }
            } else {
                let errMessage = xhr.responseText;
                try {
                    const parsed = JSON.parse(xhr.responseText);
                    errMessage = parsed.message || parsed.error || xhr.responseText;
                } catch (e) {}
                resolve({ data: null, error: new Error(errMessage) });
            }
        };
        
        xhr.onerror = () => {
            reject(new Error('Network error during file upload'));
        };
        
        xhr.send(file);
    });
};
