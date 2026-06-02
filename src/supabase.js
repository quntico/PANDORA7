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

export const supabase = client;

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
