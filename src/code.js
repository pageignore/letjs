
// 用于传递到js执行代码的全局响应式变量名
const GLOBALSTATE = 'LETJS_STATE';

/**
 * 代码中定义的变量集合
 */
export const variableSets = new Set();

/**
 * 变量定义语句替换
 * @param {*} name 
 * @param {*} value 
 * @returns 
 */
function variableChange(name, value) {
    // 值为变量类型替换， 值为字面定义则不需要处理
    if(value.type === 'Identifier' && variableSets.has(value.name)) {
        value = valChange(value.name);
    }
    let node = {
        type: 'ExpressionStatement',
        expression:{
            type: 'AssignmentExpression',
            operator: '=',
            left: valChange(name),
            right: value
        }
    }
    return node;
}

function expressionChange(node) {
    let type = node.expression.operator;
}

function argumentsChange(node) {
    node = arguments.map(item => {
        if(item.type === 'Identifier' && variableSets.has(item.name)) {
            // 变量类型
            item = valChange(item.name);
        }
        return item;
    })
    return node;
}

/**
 * 
 * @param {Array} astBody js抽象语法树body
 * @param {Set} variableSets 变量名Set容器
 * @returns net ast 替换后的抽象语法树
 */
export function transform(astBody , sets = variableSets) {
    if(!astBody) return;
    astBody = astBody.map(item => {
        // 变量类型
        if(item.type === 'VariableDeclaration') {
            // 变量名 a; let a = '11'
            let name = item.declarations[0].id.name;
            // 同名 变量名后面加_
            if(sets.has(name)) {
                name += '_'; 
            }
            sets.add(name);
            // 变量的值
            let value = item.declarations[0].init;
            item = variableChange(name, value);
        }
        // 表达式
        if(item.type === 'ExpressionStatement') {
            // 函数调用
            if(item.expression.type === 'CallExpression') {

            }
        }
        // 函数体继续寻找变量
        if(item.type === 'FunctionDeclaration') {
            item.body.body = transform(item.body.body, sets);
        }
        return item;
    })
    return astBody;
}

/**
 * 
 * @param {*} ast 抽象语法树
 * @returns 返回添加了全局state变量的抽象语法树
 */
export function unshiftStateCode(ast) {
    if(!ast) return;
    // 头部添加全局变量用于绑定响应式数据
    // const LETJS_STATE = this;
    let codeNode = {
        type: 'VariableDeclaration',
        declarations: [
            {
                type: 'VariableDeclarator',
                id: {
                    type: 'Identifier',
                    name: GLOBALSTATE
                },
                init: {
                    type: 'ThisExpression'
                }
            }
        ],
        kind: "const"
    }
    ast.unshift(codeNode);
    return ast;
}

/**
 * 替换变量节点
 * @param {*} name 变量名称
 * @returns 
 */
function valChange(name) {
    return {
        type: 'MemberExpression',
        computed:false,
        object:{
            type: 'Identifier',
            name: GLOBALSTATE
        },
        property:{
            type: 'Identifier',
            name
        }
    }
}