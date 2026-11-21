#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS ACID FILE LOCKING & ATOMIC STORAGE PRIMITIVES
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Cross-process POSIX-compliant file locking and atomic read-modify-write
 *          primitives to prevent torn reads, lost updates, and race conditions
 *          when goals execute, plan, or sync in parallel.
 * ════════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Synchronous non-busy-wait sleep using Atomics.wait.
 */
function sleepSync(ms) {
  if (ms <= 0) return;
  const sab = new SharedArrayBuffer(4);
  const ia = new Int32Array(sab);
  Atomics.wait(ia, 0, 0, ms);
}

/**
 * POSIX-compliant atomic file write.
 * Writes to a unique temp file in the SAME directory (same filesystem mount/device),
 * calls fsync to flush kernel page cache to physical storage, and atomically renames.
 */
function atomicWriteFileSync(filePath, content, options = 'utf8') {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);
  fs.mkdirSync(dir, { recursive: true });

  const encoding = typeof options === 'string' ? options : (options && options.encoding) || 'utf8';
  const mode = (typeof options === 'object' && options.mode) || undefined;

  // Suffix with PID, timestamp, and high-entropy random token
  const tmpName = `.${path.basename(resolved)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  const tmpPath = path.join(dir, tmpName);

  let fd = null;
  try {
    fd = fs.openSync(tmpPath, 'w', mode || 0o666);
    if (typeof content === 'string') {
      fs.writeSync(fd, content, 0, encoding);
    } else if (Buffer.isBuffer(content)) {
      fs.writeSync(fd, content, 0, content.length, 0);
    } else {
      fs.writeSync(fd, String(content), 0, encoding);
    }
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;

    fs.renameSync(tmpPath, resolved);
  } catch (err) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (_) {}
    }
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_) {}
    throw err;
  }
}

/**
 * Resolves lock path for a given target file path.
 */
function resolveLockPath(filePath) {
  const resolved = path.resolve(filePath);
  return resolved.endsWith('.lock') ? resolved : `${resolved}.lock`;
}

/**
 * Checks if a process on the current host is still alive.
 */
function isProcessAlive(pid) {
  if (!pid || typeof pid !== 'number' || pid <= 0) return false;
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM'; // Process exists but owned by another user
  }
}

/**
 * Acquires an exclusive advisory file lock using O_EXCL (wx).
 * Automatically detects and evicts stale locks from terminated processes or expired TTLs.
 */
function acquireFileLock(filePath, options = {}) {
  const lockPath = resolveLockPath(filePath);
  const staleTimeoutMs = options.staleTimeoutMs !== undefined
    ? options.staleTimeoutMs
    : (options.staleMs !== undefined ? options.staleMs : 30000);
  const acquireTimeoutMs = options.acquireTimeoutMs !== undefined
    ? options.acquireTimeoutMs
    : (options.timeoutMs !== undefined ? options.timeoutMs : 10000);
  const retryMinDelayMs = options.retryMinDelayMs !== undefined
    ? options.retryMinDelayMs
    : (options.retryDelayMs !== undefined ? options.retryDelayMs : 10);
  const retryMaxDelayMs = options.retryMaxDelayMs || 150;

  const dir = path.dirname(lockPath);
  fs.mkdirSync(dir, { recursive: true });

  const startTime = Date.now();
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let retries = 0;

  while (true) {
    let fd = null;
    try {
      fd = fs.openSync(lockPath, 'wx');
      const payload = JSON.stringify({
        pid: process.pid,
        createdAt: Date.now(),
        host: os.hostname(),
        token,
      });
      fs.writeSync(fd, payload, 0, 'utf8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      return { lockPath, pid: process.pid, createdAt: Date.now(), token };
    } catch (err) {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (_) {}
      }

      if (err.code !== 'EEXIST') {
        throw err;
      }

      // Check for stale lock
      try {
        if (fs.existsSync(lockPath)) {
          const stat = fs.statSync(lockPath);
          const fileAge = Date.now() - stat.mtimeMs;
          const raw = fs.readFileSync(lockPath, 'utf8');

          if (!raw || raw.trim() === '') {
            // File is currently being written by the process that just won 'wx'
            // Only consider it stale if its mtime is older than 2000ms
            if (fileAge > Math.min(staleTimeoutMs, 2000)) {
              try { fs.unlinkSync(lockPath); continue; } catch (_) {}
            }
          } else {
            let data = null;
            try {
              data = JSON.parse(raw);
            } catch (_) {
              // Parse error: only unlink if file is older than 2000ms
              if (fileAge > Math.min(staleTimeoutMs, 2000)) {
                try { fs.unlinkSync(lockPath); continue; } catch (_) {}
              }
            }

            if (data) {
              const lockAge = Date.now() - (data.createdAt || stat.mtimeMs);
              let isStale = false;
              if (data.host === os.hostname()) {
                if (!isProcessAlive(data.pid)) {
                  isStale = true; // Holder process has terminated
                } else if (lockAge > staleTimeoutMs) {
                  isStale = true; // Exceeded stale TTL
                }
              } else if (lockAge > staleTimeoutMs) {
                isStale = true;
              }

              if (isStale) {
                try {
                  fs.unlinkSync(lockPath);
                  continue; // Immediately retry acquisition
                } catch (_) {}
              }
            }
          }
        }
      } catch (_) {
        // Transient error during stat or read (e.g. race with unlink), retry next loop
      }

      if (Date.now() - startTime > acquireTimeoutMs) {
        throw new Error(
          `[soda-os:file-lock] Failed to acquire lock: Timed out after ${acquireTimeoutMs}ms waiting for lock on ${path.basename(filePath)} (${lockPath})`
        );
      }

      retries++;
      const baseDelay = Math.min(retryMaxDelayMs, retryMinDelayMs * Math.pow(1.3, retries));
      const jitter = Math.floor(Math.random() * 20);
      sleepSync(Math.floor(baseDelay + jitter));
    }
  }
}

/**
 * Asynchronously acquires an exclusive advisory file lock using O_EXCL (wx).
 * Non-blocking retry loop using setTimeout to avoid starving the V8 event loop.
 */
async function acquireFileLockAsync(filePath, options = {}) {
  const lockPath = resolveLockPath(filePath);
  const staleTimeoutMs = options.staleTimeoutMs !== undefined
    ? options.staleTimeoutMs
    : (options.staleMs !== undefined ? options.staleMs : 30000);
  const acquireTimeoutMs = options.acquireTimeoutMs !== undefined
    ? options.acquireTimeoutMs
    : (options.timeoutMs !== undefined ? options.timeoutMs : 10000);
  const retryMinDelayMs = options.retryMinDelayMs !== undefined
    ? options.retryMinDelayMs
    : (options.retryDelayMs !== undefined ? options.retryDelayMs : 10);
  const retryMaxDelayMs = options.retryMaxDelayMs || 150;

  const dir = path.dirname(lockPath);
  fs.mkdirSync(dir, { recursive: true });

  const startTime = Date.now();
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let retries = 0;

  while (true) {
    let fd = null;
    try {
      fd = fs.openSync(lockPath, 'wx');
      const payload = JSON.stringify({
        pid: process.pid,
        createdAt: Date.now(),
        host: os.hostname(),
        token,
      });
      fs.writeSync(fd, payload, 0, 'utf8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      return { lockPath, pid: process.pid, createdAt: Date.now(), token };
    } catch (err) {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (_) {}
      }

      if (err.code !== 'EEXIST') {
        throw err;
      }

      // Check for stale lock
      try {
        if (fs.existsSync(lockPath)) {
          const stat = fs.statSync(lockPath);
          const fileAge = Date.now() - stat.mtimeMs;
          const raw = fs.readFileSync(lockPath, 'utf8');

          if (!raw || raw.trim() === '') {
            // File is currently being written by the process that just won 'wx'
            // Only consider it stale if its mtime is older than 2000ms
            if (fileAge > Math.min(staleTimeoutMs, 2000)) {
              try { fs.unlinkSync(lockPath); continue; } catch (_) {}
            }
          } else {
            let data = null;
            try {
              data = JSON.parse(raw);
            } catch (_) {
              if (fileAge > Math.min(staleTimeoutMs, 2000)) {
                try { fs.unlinkSync(lockPath); continue; } catch (_) {}
              }
            }

            if (data) {
              const lockAge = Date.now() - (data.createdAt || stat.mtimeMs);
              let isStale = false;
              if (data.host === os.hostname()) {
                if (!isProcessAlive(data.pid)) {
                  isStale = true; // Holder process has terminated
                } else if (lockAge > staleTimeoutMs) {
                  isStale = true; // Exceeded stale TTL
                }
              } else if (lockAge > staleTimeoutMs) {
                isStale = true;
              }

              if (isStale) {
                try {
                  fs.unlinkSync(lockPath);
                  continue; // Immediately retry acquisition
                } catch (_) {}
              }
            }
          }
        }
      } catch (_) {
        // Transient error during stat or read (e.g. race with unlink), retry next loop
      }

      if (Date.now() - startTime > acquireTimeoutMs) {
        throw new Error(
          `[soda-os:file-lock] Failed to acquire lock: Timed out after ${acquireTimeoutMs}ms waiting for lock on ${path.basename(filePath)} (${lockPath})`
        );
      }

      retries++;
      const baseDelay = Math.min(retryMaxDelayMs, retryMinDelayMs * Math.pow(1.3, retries));
      const jitter = Math.floor(Math.random() * 20);
      const sleepDuration = Math.floor(baseDelay + jitter);

      await new Promise((resolve) => setTimeout(resolve, sleepDuration));
    }
  }
}

/**
 * Releases an exclusive file lock if held by current process or matching token.
 */
function releaseFileLock(filePath, lockInfo = null) {
  const lockPath = resolveLockPath(filePath);
  try {
    if (fs.existsSync(lockPath)) {
      try {
        const raw = fs.readFileSync(lockPath, 'utf8');
        const data = JSON.parse(raw);
        if (lockInfo && lockInfo.token && data.token) {
          if (data.token === lockInfo.token) {
            fs.unlinkSync(lockPath);
          }
        } else if (data.pid === process.pid && data.host === os.hostname()) {
          fs.unlinkSync(lockPath);
        }
      } catch (_) {
        // If unreadable or corrupted, unlink if we were the supposed locker
        if (lockInfo && lockInfo.pid === process.pid) {
          fs.unlinkSync(lockPath);
        }
      }
    }
  } catch (_) {}
}

/**
 * Checks if a function is an async function or returns a promise.
 */
function isAsyncFunction(fn) {
  if (!fn) return false;
  return (
    fn.constructor.name === 'AsyncFunction' ||
    fn[Symbol.toStringTag] === 'AsyncFunction' ||
    typeof fn.then === 'function'
  );
}

/**
 * Asynchronously executes a function within the critical section of a file lock.
 */
async function withFileLockAsync(filePath, fn, options = {}) {
  const lock = await acquireFileLockAsync(filePath, options);
  try {
    return await fn();
  } finally {
    releaseFileLock(filePath, lock);
  }
}

/**
 * Executes a function within the critical section of a file lock.
 * Supports both synchronous functions and Promises.
 */
function withFileLock(filePath, fn, options = {}) {
  if (options.async || isAsyncFunction(fn)) {
    return withFileLockAsync(filePath, fn, options);
  }

  const lock = acquireFileLock(filePath, options);
  let isPromise = false;
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      isPromise = true;
      return result.finally(() => {
        releaseFileLock(filePath, lock);
      });
    }
    return result;
  } finally {
    if (!isPromise) {
      releaseFileLock(filePath, lock);
    }
  }
}

/**
 * Transactional atomic read-modify-write helper.
 * Executes mutatorFn(currentContent) inside withFileLock and atomically saves result.
 */
function transactionalUpdate(filePath, mutatorFn, options = {}) {
  return withFileLock(filePath, () => {
    let currentContent = '';
    if (fs.existsSync(filePath)) {
      currentContent = fs.readFileSync(filePath, 'utf8');
    } else if (options.defaultContent !== undefined) {
      currentContent = options.defaultContent;
    }

    const updated = mutatorFn(currentContent);
    if (updated === null || updated === undefined) {
      return { updated: false, content: currentContent };
    }

    if (!options.dryRun) {
      atomicWriteFileSync(filePath, updated, options.encoding || 'utf8');
    }
    return { updated: true, content: updated };
  }, options);
}
/**
 * Asynchronously or synchronously executes a function while holding multiple exclusive
 * advisory file locks in strict lexicographical order to prevent deadlocks (Pillar 6 Invariant).
 */
function withMultiFileLock(filePaths, fn, options = {}) {
  const uniquePaths = [...new Set((filePaths || []).filter(Boolean).map((p) => path.resolve(p)))].sort();
  if (uniquePaths.length === 0) {
    return fn();
  }

  function acquireAndRun(index) {
    if (index >= uniquePaths.length) {
      return fn();
    }
    return withFileLock(uniquePaths[index], () => {
      return acquireAndRun(index + 1);
    }, options);
  }

  return acquireAndRun(0);
}

module.exports = {
  atomicWriteFileSync,
  acquireFileLock,
  acquireFileLockAsync,
  releaseFileLock,
  withFileLock,
  withFileLockAsync,
  withMultiFileLock,
  transactionalUpdate,
  sleepSync,
  isProcessAlive,
  resolveLockPath,
};
