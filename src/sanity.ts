import { JsonSchemaObject, JsonSchemaProperty } from "json-schema-service";
import { chat } from "./chat/chat";

// src/sanity.ts
console.log(' ########################### Sanity check start ###########################'+'\n');
async function sanity() {
    console.log('simple chat:')
    let r: any = await chat().addSystemMessage('this is a sanity test, please reponse with ok').prompt();
    console.log(r.choices[0].message.content)
    @JsonSchemaObject()
    class Test{
        @JsonSchemaProperty({required: false})
        value?: number = 0;
        @JsonSchemaProperty({required: true})
        ok: boolean = false;
    }
    console.log('simple chat function:');
    r =
    await chat()
    .defineFunction('test')
    .setFunctionParameters(Test)
    .addSystemMessage('please call the test function with value 42')
    .getFunctionCall()

    console.log(r);
    console.log('simple chat reponse format:');
    r =
    await chat()
    .addSystemMessage('please response with value 42 and ok')
    .getFormattedResponse('test', Test);

    console.log(r);

}

sanity()
.then(
    () => console.log('\n'+' ########################### Sanity check end ############################')
)

