import { parentPort } from 'worker_threads';
import { execSync } from 'child_process';

function extractFunctionBody(code) {
  const trimmed = code.trim();
  if (trimmed.startsWith('return ') || trimmed.startsWith('throw ') || !trimmed.includes('{')) {
    return code;
  }

  let openBraceIndex = -1;
  let inComment = false;
  let commentChar = '';

  for (let i = 0; i < code.length; i++) {
    if (!inComment && (code[i] === '/' && code[i + 1] === '*')) {
      inComment = true;
      commentChar = '*';
      i++;
      continue;
    }
    if (inComment && commentChar === '*' && code[i] === '*' && code[i + 1] === '/') {
      inComment = false;
      i++;
      continue;
    }
    if (!inComment && code[i] === '{') {
      openBraceIndex = i;
      break;
    }
  }

  if (openBraceIndex === -1) {
    return code;
  }

  let braceCount = 0;
  let closeBraceIndex = -1;

  for (let i = openBraceIndex; i < code.length; i++) {
    if (code[i] === '{') braceCount++;
    if (code[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        closeBraceIndex = i;
        break;
      }
    }
  }

  if (closeBraceIndex !== -1) {
    return code.substring(openBraceIndex + 1, closeBraceIndex);
  }

  return code;
}

let requestId = 0;
const pendingRequests = new Map();

const __callHostTool__ = async (toolName, params = {}) => {
  const id = requestId++;
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    parentPort.postMessage({
      type: 'call-tool',
      id,
      toolName,
      params
    });
  });
};

parentPort.on('message', async (message) => {
  if (message.type === 'tool-result') {
    const { id, success, result, error } = message;
    const pending = pendingRequests.get(id);
    pendingRequests.delete(id);
    if (pending) {
      if (success) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error));
      }
    }
  } else {
    const { taskCode, input, taskName } = message;

    try {
      const body = extractFunctionBody(taskCode);
      const fn = new Function(
        'input',
        '__callHostTool__',
        'execSync',
        'Date',
        'Object',
        'Array',
        'JSON',
        'console',
        'Error',
        `return (async (input, __callHostTool__, execSync) => { ${body} })(input, __callHostTool__, execSync)`
      );
      const result = await fn(
        input || {},
        __callHostTool__,
        execSync,
        Date,
        Object,
        Array,
        JSON,
        console,
        Error
      );
      parentPort.postMessage({ success: true, result });
    } catch (error) {
      parentPort.postMessage({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  }
});
