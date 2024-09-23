import { Text } from '@blockcode/ui';
import { provideAskSparkFunctionJs } from '@blockcode/aisdks';
import translations from './l10n.yaml';
import iconURI from './icon.svg';
import brainPyURI from './brain.py';

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
      <>
        <Text
          id="extension.brain.openplatform.description1"
          defaultMessage="Please register your own "
        />
        <a
          href="https://xinghuo.xfyun.cn/sparkapi"
          target="_blank"
        >
          <Text
            id="extension.brain.openplatform.description2"
            defaultMessage="iFLYTEK Open Platform (Chinese)"
          />
        </a>
        <Text
          id="extension.brain.openplatform.description3"
          defaultMessage=" account, the test account we provide does not guarantee that every request will be successful."
        />
      </>
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
        const prompt = this.valueToCode(block, 'PROMPT', this.ORDER_NONE) || '';
        code += `${addPrompt}(target.id, String(${prompt}));\n`;
        return code;
      },
      python(block) {
        this.definitions_['import_extension_brain'] = 'from extensions.brain import brain';
        let code = '';
        if (this.STATEMENT_PREFIX) {
          code += this.injectId(this.STATEMENT_PREFIX, block);
        }
        const prompt = this.valueToCode(block, 'PROMPT', this.ORDER_NONE) || '';
        code += `brain.set_prompt(target.id, str(${prompt}))\n`;
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
      python(block) {
        this.definitions_['import_extension_brain'] = 'from extensions.brain import brain';
        let code = '';
        if (this.STATEMENT_PREFIX) {
          code += this.injectId(this.STATEMENT_PREFIX, block);
        }
        code += `brain.clear_prompt(target.id)\n`;
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
        this.definitions_['brain_brains'] = `runtime.data['brain_brains'] = {};`;
        let code = '';
        if (this.STATEMENT_PREFIX) {
          code += this.injectId(this.STATEMENT_PREFIX, block);
        }
        const askQuestion = provideAskQuestionFunctionJs.call(this, 3);
        const question = this.valueToCode(block, 'QUESTION', this.ORDER_NONE) || 0;
        code += `await ${askQuestion}(target.id, String(${question}))\n`;
        return code;
      },
      python(block) {
        this.definitions_['import_extension_brain'] = 'from extensions.brain import brain';
        const apikey = localStorage.getItem(`brain.connection.apikey`);
        const apisecret = localStorage.getItem(`brain.connection.apisecret`);
        const useapi = apikey && apisecret ? `, key="${apikey}", secret="${apisecret}"` : '';
        let code = '';
        if (this.STATEMENT_PREFIX) {
          code += this.injectId(this.STATEMENT_PREFIX, block);
        }
        const question = this.valueToCode(block, 'QUESTION', this.ORDER_NONE) || '""';
        code += `await brain.ask(target.id, str(${question}) ${useapi})\n`;
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
      python() {
        this.definitions_['import_extension_brain'] = 'from extensions.brain import brain';
        const code = `brain.answer(target.id)`;
        return [code, this.ORDER_FUNCTION_CALL];
      },
    },
  ],
  translations,
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
  const ask = provideAskSparkFunctionJs.call(this);
  return this.provideFunction_('brain_ask_question', [
    `const ${this.FUNCTION_NAME_PLACEHOLDER_} = async (id, content) => {`,
    `  if (!content) return;`,
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
    `  const message = await ${ask}([`,
    "    { role: 'system', content: `${prompts.join('；')}。请用${language}回答，每次只回答一句话。` },",
    `    ...dialogs,`,
    `  ]);`,
    '  if (!message) return;',
    `  runtime.data['brain_brains'][id].message = message;`,
    `  if (dialogs.length > ${DIALOGS_LENGTH}) dialogs.shift();`,
    `  dialogs.push({ role: 'assistant', content: message });`,
    `};`,
  ]);
}
