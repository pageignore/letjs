import { parseScript } from 'esprima';
import { generate } from 'escodegen';
import { transform, GLOBALSTATE } from '../code.js';

function test(str) {
    let ast = parseScript(str);
    let newAst = transform(ast);
    return generate(newAst);
}

describe('代码中变量定义关键字替换', () => {
    it('普通变量定义', () => {
        let jscodeStr = `let a = 1;`;
        let letJsCode = test(jscodeStr);
        expect(letJsCode).toEqual(`${GLOBALSTATE}.a = 1;`);
    });

    it('多个变量定义', () => {
        let jscodeStr = `let a = 1;
        let b = a;
        let c = 3;
        `;
        let letJsCode = test(jscodeStr);
        expect(letJsCode).toEqual(`${GLOBALSTATE}.a = 1;
${GLOBALSTATE}.b = ${GLOBALSTATE}.a;
${GLOBALSTATE}.c = 3;`);
    });

    it('表达式', () => {
        let jscodeStr = `a = 1;b = c`;
        let letJsCode = test(jscodeStr);
        expect(letJsCode).toEqual(`${GLOBALSTATE}.a = 1;
${GLOBALSTATE}.b = ${GLOBALSTATE}.c;`);
    });
  });