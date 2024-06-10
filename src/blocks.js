import hmacSHA256 from 'crypto-js/hmac-sha256';
import Base64 from 'crypto-js/enc-base64';
import { Text } from '@blockcode/ui';
import translations from './l10n.yaml';
import iconURI from './icon.svg';
import brainPyURI from './brain.py';

const SPARKAI_HOST = 'spark-api.xf-yun.com';
const SPARKAI_PATHNAME = '/v1.1/chat';
const SPARKAI_APP_ID = 'db45f79e';
const SPARKAI_API_SECRET = 'MWFiNjVmNDA4YjNhODFkZGE0MGQ1YWRj';
const SPARKAI_API_KEY = '6a3dfe79b9e9ec588ca65bf3b9d9c847';
const SPARKAI_DOMAIN = 'general';
const SPARKAI_TEMPERATURE = 0.4; // 0.1 ~ 1
const SPARKAI_MAX_TOKENS = 200; // 1 token = 1.5 chinese or 0.8 english
const SPARKAI_TOP_K = 3; // 1 ~ 6
const DIALOGS_LENGTH = 3;

export default {
  iconURI,
  name: (
    <Text
      id="extension.brain.name"
      defaultMessage="Brain"
    />
  ),
  files: [
    {
      name: 'brain',
      type: 'text/x-python',
      uri: brainPyURI,
    },
  ],
  connectionConfig: {
    title: (
      <Text
        id="extension.brain.openplatform"
        defaultMessage="iFLYTEK Open Platform authorization"
      />
    ),
    items: [
      {
        id: 'appid',
        text: 'APPID',
      },
      {
        id: 'apisecret',
        text: 'APISecret',
      },
      {
        id: 'apikey',
        text: 'APIKey',
      },
    ],
    description: (
      <Text
        id="extension.brain.openplatform.description"
        defaultMessage="Please register your own <a href='https://xinghuo.xfyun.cn/sparkapi'>iFLYTEK Open Platform (Chinese)</a> account, the test account we provide does not guarantee that every request will be successful."
      />
    ),
  },
  blocks: [
    {
      id: 'addPrompt',
      text: (
        <Text
          id="extension.brain.addPrompt"
          defaultMessage="add [PROMPT] prompt to Brain"
        />
      ),
      inputs: {
        PROMPT: {
          type: 'string',
          default: (
            <Text
              id="extension.brain.prompt"
              defaultMessage="your role is a cat"
            />
          ),
        },
      },
      vm(block) {
        let code = '';
        if (this.STATEMENT_PREFIX) {
          code += this.injectId(this.STATEMENT_PREFIX, block);
        }
        const addPrompt = provideAddPromptFunctionJs.call(this);
        const prompt = this.valueToCode(block, 'PROMPT', this.ORDER_NONE) || 0;
        code += `${addPrompt}(target.id, String(${prompt}));\n`;
        return code;
      },
    },
    {
      id: 'clearPrompt',
      text: (
        <Text
          id="extension.brain.clearPrompt"
          defaultMessage="delete all prompts"
        />
      ),
      vm(block) {
        let code = '';
        if (this.STATEMENT_PREFIX) {
          code += this.injectId(this.STATEMENT_PREFIX, block);
        }
        const clearPrompt = provideClearPromptFunctionJs.call(this);
        code += `${clearPrompt}(target.id);\n`;
        return code;
      },
    },
    {
      id: 'askQuestion',
      text: (
        <Text
          id="extension.brain.askQuestion"
          defaultMessage="ask Brain [QUESTION] and wait"
        />
      ),
      inputs: {
        QUESTION: {
          type: 'string',
          default: (
            <Text
              id="extension.brain.question"
              defaultMessage="Who are you?"
            />
          ),
        },
      },
      vm(block) {
        let code = '';
        if (this.STATEMENT_PREFIX) {
          code += this.injectId(this.STATEMENT_PREFIX, block);
        }
        const askQuestion = provideAskQuestionFunctionJs.call(this);
        const question = this.valueToCode(block, 'QUESTION', this.ORDER_NONE) || 0;
        code += `await ${askQuestion}(target.id, String(${question}));\n`;
        return code;
      },
    },
    {
      id: 'answer',
      text: (
        <Text
          id="extension.brain.answer"
          defaultMessage="answer"
        />
      ),
      output: 'string',
      vm() {
        this.definitions_['brain_brains'] = `runtime.data['brain_brains'] = {};`;
        const code = `(runtime.data['brain_brains'][target.id]?.message ?? '')`;
        return [code, this.ORDER_ATOMIC];
      },
    },
  ],
  translations,
};

const getWebSocketUrl = () => {
  const date = new Date().toGMTString();
  const apisecret = localStorage.getItem(`brain.connection.apisecret`) || SPARKAI_API_SECRET;
  const apikey = localStorage.getItem(`brain.connection.apikey`) || SPARKAI_API_KEY;

  const signatureRaw = `host: ${SPARKAI_HOST}\ndate: ${date}\nGET ${SPARKAI_PATHNAME} HTTP/1.1`;
  const signature = Base64.stringify(hmacSHA256(signatureRaw, apisecret));

  const authorizationRaw = `api_key="${apikey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = btoa(authorizationRaw);

  return `wss://${SPARKAI_HOST}${SPARKAI_PATHNAME}?authorization=${authorization}&date=${date}&host=${SPARKAI_HOST}`;
};

function provideAddPromptFunctionJs() {
  this.definitions_['brain_brains'] = `runtime.data['brain_brains'] = {};`;
  return this.provideFunction_('brain_add_prompt', [
    `const ${this.FUNCTION_NAME_PLACEHOLDER_} = (id, prompt) => {`,
    '  if (!prompt) return;',
    `  if (!runtime.data['brain_brains'][id]) {`,
    `    runtime.data['brain_brains'][id] = {};`,
    `  }`,
    `  if (!runtime.data['brain_brains'][id].prompts) {`,
    `    runtime.data['brain_brains'][id].prompts = [];`,
    `  }`,
    `  runtime.data['brain_brains'][id].prompts.push(prompt.replaceAll('。', '；').replace(/；$/, ''));`,
    '};',
  ]);
}

function provideClearPromptFunctionJs() {
  this.definitions_['brain_brains'] = `runtime.data['brain_brains'] = {};`;
  return this.provideFunction_('brain_clear_prompt', [
    `const ${this.FUNCTION_NAME_PLACEHOLDER_} = (id) => {`,
    `  if (!runtime.data['brain_brains'][id]) {`,
    `    runtime.data['brain_brains'][id] = {};`,
    `  }`,
    `  runtime.data['brain_brains'][id].prompt = [];`,
    '};',
  ]);
}

function provideGetLanguageFunctionJs() {
  return this.provideFunction_('brain_language', [
    `const ${this.FUNCTION_NAME_PLACEHOLDER_} = () => {`,
    '  switch(runtime.language) {',
    `    case 'en': return '英语';`,
    `    case 'jp': return '日语';`,
    `    case 'zh-Hans': return '简体中文';`,
    `    default: return '英语';`,
    '  }',
    '};',
  ]);
}

function provideAskQuestionFunctionJs() {
  this.definitions_['brain_brains'] = `runtime.data['brain_brains'] = {};`;
  const getLanguage = provideGetLanguageFunctionJs.call(this);
  const appid = localStorage.getItem(`brain.connection.appid`) || SPARKAI_APP_ID;
  return this.provideFunction_('brain_ask_question', [
    `const ${this.FUNCTION_NAME_PLACEHOLDER_} = (id, content) => new Promise((resolve) => {`,
    '  if (!content) return resolve();',
    `  if (!runtime.data['brain_brains'][id]) {`,
    `    runtime.data['brain_brains'][id] = {};`,
    `  }`,
    `  const language = ${getLanguage}();`,
    `  const prompts = runtime.data['brain_brains'][id].prompts || [];`,
    `  const dialogs = runtime.data['brain_brains'][id].dialogs || [];`,
    `  runtime.data['brain_brains'][id].dialogs = dialogs`,
    `  if (dialogs.length > ${DIALOGS_LENGTH}) dialogs.shift();`,
    `  dialogs.push({ role: 'user', content: content });`,
    `  runtime.data['brain_brains'][id].message = '';`,
    `  const ws = new WebSocket(\`${getWebSocketUrl()}\`); `,
    '  ws.onopen = () => {',
    '    ws.send(JSON.stringify({',
    '      header: {',
    `          app_id: '${appid}', `,
    `          uid: '${appid}', `,
    '        },',
    '        parameter: {',
    '          chat: {',
    `            domain: '${SPARKAI_DOMAIN}', `,
    `            temperature: ${SPARKAI_TEMPERATURE},`,
    `            max_tokens: ${SPARKAI_MAX_TOKENS},`,
    `            top_k: ${SPARKAI_TOP_K},`,
    '          },',
    '        },',
    '        payload: {',
    '          message: {',
    '            text: [',
    "              { role: 'system', content: `${prompts.join('；')}。请用${language}回答，每次只回答一句话。` },",
    `              ...dialogs,`,
    '            ],',
    '          },',
    '        },',
    '    }));',
    '  };',
    `  ws.onerror = (e) => resolve(); `,
    `  let message = '';`,
    '  ws.onmessage = async (e) => {',
    '    if (!runtime.running) return;',
    '    const data = JSON.parse(e.data);',
    '    if (data.header.code !== 0) return resolve(); ',
    `    message += data.payload.choices.text.map((text) => text.content).join(''); `,
    '    if (data.header.status === 2) {',
    '      ws.close();',
    `      runtime.data['brain_brains'][id].message = message.trim();`,
    `      if (dialogs.length > ${DIALOGS_LENGTH}) dialogs.shift();`,
    `      dialogs.push({ role: 'assistant', content: message });`,
    '      resolve();',
    '    }',
    '  };',
    '});',
  ]);
}
