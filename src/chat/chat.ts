// openai-advanced/src/chat/chat.ts

import { JsonSchemaService } from 'json-schema-service';
import OpenAI from 'openai';
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionTool,
  ChatCompletionUserMessageParam,
  ResponseFormatJSONSchema,
} from 'openai/resources';

export class Chat {
  openai = new OpenAI();
  jsonSchemaService = new JsonSchemaService();
  constructor(
    private model = 'gpt-4o-2024-08-06',
    private messages: ChatCompletionMessageParam[] = [],
    private tools: ChatCompletionTool[] = [],
  ) {}

  setModel(model: string) {
    this.model = model;
    return this;
  }
  setTools(tools: ChatCompletionTool[]) {
    this.tools = tools;
  }
  async getFunctionCall(functionName?: string) {
    const name = functionName || this.getLastFunction()!.name;

    const chatCompletion = await this.prompt(name);
    const args =
      chatCompletion.choices[0].message.tool_calls![0].function.arguments;
    return JSON.parse(args);
  }

  async getFormattedResponse(name: string, type: any, description?: string) {
    const response_format: ResponseFormatJSONSchema = {
        type: 'json_schema',
        json_schema: {
            name, description,
            schema: this.jsonSchemaService.createJsonSchema(type)
        }
    }
    const result = await this.prompt(undefined, response_format);
    const parsedContent = JSON.parse(result.choices[0].message.content!)
    const { valid, errors } = this.jsonSchemaService.validate(
        response_format.json_schema.schema!,
        parsedContent,
      );
      if (!valid) {
        throw new Error(
          `Validation failed response fromat with arguments ${JSON.stringify(parsedContent)}. Errors: ${JSON.stringify(errors)}`,
        );
      }
    return parsedContent;
  }

  async prompt(functionName?: string, response_format?: ResponseFormatJSONSchema) {
    const params: ChatCompletionCreateParamsNonStreaming = {
      messages: this.messages,
      model: this.model,
    };
    if (this.tools.length > 0) {
      params.tools = this.tools;
    }
    if (functionName) {
      params.tool_choice = {
        type: 'function',
        function: { name: functionName },
      };
    } 
    if(response_format) {
        params.response_format = response_format;
    }
    const result = await this.openai.chat.completions.create(params);

    const message = result.choices[0].message;
    if (message.tool_calls) {
      const funcionCallName = message.tool_calls[0].function.name;
      const functionCallArgs = message.tool_calls[0].function.arguments;
      const functionSchema = this.tools.find(
        (t) => t.function.name === funcionCallName,
      )?.function.parameters;
      const parsedArgs = JSON.parse(functionCallArgs);

      if (!functionSchema) {
        throw new Error(`No schema found for function ${functionName}`);
      }
      const { valid, errors } = this.jsonSchemaService.validate(
        functionSchema,
        parsedArgs,
      );
      if (!valid) {
        throw new Error(
          `Validation failed for function ${functionName} with arguments ${JSON.stringify(functionCallArgs)}. Errors: ${JSON.stringify(errors)}`,
        );
      }
    }

    this.addMessage(message);
    return result;
  }

  addSystemMessage(content: string) {
    const systemMessage: ChatCompletionSystemMessageParam = {
      content,
      role: 'system',
    };
    this.messages.push(systemMessage);
    return this;
  }
  appendSystemMessage(content: string) {
    const lastMessage = getLastElementOrNull(this.messages);
    if (lastMessage?.role === 'system') {
      lastMessage.content = `${lastMessage.content ?? ''} ${content}`;
    } else {
      return this.addSystemMessage(content);
    }
    return this;
  }
  addUserMessage(content: string) {
    const userMessage: ChatCompletionUserMessageParam = {
      content,
      role: 'user',
    };
    this.messages.push(userMessage);
    return this;
  }
  addMessage(message: ChatCompletionMessageParam) {
    this.messages.push(message);
    return this;
  }
  addMessages(messages: ChatCompletionMessageParam[]) {
    messages.forEach((m) => this.messages.push(m));
    return this;
  }
  defineFunction(name: string, description?: string) {
    this.tools.push({ type: 'function', function: { name, description } });
    return this;
  }
  addFunctionParameter(propertyName: string, type: any, options?: any) {
    const currentFunction = this.getLastFunction()!;
    if (!currentFunction.parameters) {
      currentFunction.parameters = { type: 'object' };
    }
    this.jsonSchemaService.addPropertyToJsonSchema(
      currentFunction.parameters,
      propertyName,
      type,
      options,
    );
    return this;
  }
  setFunctionParameters(type: any) {
    const currentFunction = this.getLastFunction()!;
    if (!currentFunction.parameters) {
      currentFunction.parameters =
        this.jsonSchemaService.createJsonSchema(type);
    }
    return this;
  }

  private getLastFunction() {
    return this.tools[this.tools.length - 1].function;
  }
}

function getLastElementOrNull<T>(array: T[]): T | null {
  if (array.length === 0) {
    return null;
  }
  return array[array.length - 1];
}
